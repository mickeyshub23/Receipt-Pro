import { supabase } from './supabase.js';
import { computeFingerprint } from './fingerprint.js';
import { makeSlug } from './slug.js';
import { logger } from './logger.js';

export function totalOf(items, style) {
  return (items || []).reduce((sum, i) => {
    const q = Number(i.q) || 0;
    const p = Number(i.p) || 0;
    const x = style === 1 ? Number(i.x) || 0 : 0;
    return sum + q * p * (1 - x / 100);
  }, 0);
}

export async function findReceipt(deviceId, fingerprint) {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('device_id', deviceId)
    .eq('fingerprint', fingerprint)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createReceipt(deviceId, payload, fingerprint) {
  const slug = makeSlug(24);
  const imageUrl = payload.image_url || null;
  const { data, error } = await supabase
    .from('receipts')
    .insert({
      device_id: deviceId,
      user_id: deviceId,
      style: payload.style === 2 ? 'invoice' : 'business',
      theme: payload.theme,
      fingerprint,
      slug,
      store_name: String(payload.bn || '').trim() || 'Untitled store',
      total: totalOf(payload.items, payload.style),
      currency: payload.cur || '₦',
      payload,
      status: 'pending',
      image_url: imageUrl,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getOrCreateReceipt(deviceId, payload) {
  const fingerprint = computeFingerprint(payload);
  let receipt = await findReceipt(deviceId, fingerprint);
  const total = totalOf(payload.items, payload.style);
  if (!receipt) {
    receipt = await createReceipt(deviceId, payload, fingerprint);
    return { receipt, fingerprint };
  }
  // Refresh total + currency on every check so old rows never show ₦0.00.
  const patch = { total, currency: payload.cur || '₦', payload };
  const { error: uerr } = await supabase
    .from('receipts')
    .update(patch)
    .eq('id', receipt.id);
  if (uerr) throw uerr;
  receipt.total = total;
  receipt.currency = payload.cur || '₦';
  receipt.payload = payload;
  return { receipt, fingerprint };
}

export async function markReceiptPaid(receiptId, deviceId) {
  const { data, error } = await supabase
    .from('receipts')
    .select('device_id')
    .eq('id', receiptId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.device_id !== deviceId) {
    throw new Error('Receipt does not belong to this device.');
  }
  const { data: updated, error: uerr } = await supabase
    .from('receipts')
    .update({ status: 'paid' })
    .eq('id', receiptId)
    .select('*')
    .single();
  if (uerr) throw uerr;
  return updated;
}

export async function setImageUrl(receiptId, imageUrl) {
  const { data, error } = await supabase
    .from('receipts')
    .update({ image_url: imageUrl })
    .eq('id', receiptId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function publicImageUrl(path) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET || 'receipts')
    .getPublicUrl(path);
  if (error) {
    logger.error({ error, path }, 'Supabase storage publicUrl failed');
    return null;
  }
  return data.publicUrl;
}

export async function signedImageUrl(path, expiresIn = 600) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET || 'receipts')
    .createSignedUrl(path, expiresIn);
  if (error) {
    logger.error(
      { error, path, expiresIn },
      'Supabase storage signedUrl creation failed',
    );
    return null;
  }
  return data.signedUrl;
}