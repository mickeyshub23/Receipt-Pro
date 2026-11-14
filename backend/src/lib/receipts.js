import { supabase } from './supabase.js';
import { computeFingerprint } from './fingerprint.js';
import { makeSlug } from './slug.js';

export function totalOf(items, style) {
  return (items || []).reduce((sum, i) => {
    const q = Number(i.q) || 0;
    const p = Number(i.p) || 0;
    const x = style === 1 ? Number(i.x) || 0 : 0;
    return sum + q * p * (1 - x / 100);
  }, 0);
}

export async function findReceipt(userId, fingerprint) {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('user_id', userId)
    .eq('fingerprint', fingerprint)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createReceipt(userId, payload, fingerprint) {
  const slug = makeSlug(24);
  const { data, error } = await supabase
    .from('receipts')
    .insert({
      user_id: userId,
      style: payload.style === 2 ? 'invoice' : 'business',
      theme: payload.theme,
      fingerprint,
      slug,
      store_name: String(payload.bn || '').trim() || 'Untitled store',
      total: totalOf(payload.items, payload.style),
      currency: payload.cur || '₦',
      payload,
      status: 'pending',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getOrCreateReceipt(userId, payload) {
  const fingerprint = computeFingerprint(payload);
  let receipt = await findReceipt(userId, fingerprint);
  if (!receipt) {
    receipt = await createReceipt(userId, payload, fingerprint);
  }
  return { receipt, fingerprint };
}

export async function markReceiptPaid(receiptId) {
  const { data, error } = await supabase
    .from('receipts')
    .update({ status: 'paid' })
    .eq('id', receiptId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function signedImageUrl(path, expiresIn = 600) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET || 'receipt-images')
    .createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}