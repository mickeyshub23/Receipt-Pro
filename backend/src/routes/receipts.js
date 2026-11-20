import { Router } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import { supabase } from '../lib/supabase.js';
import { validate } from '../middleware/validate.js';
import { receiptPayloadSchema } from '../lib/schemas.js';
import { getOrCreateReceipt, publicImageUrl } from '../lib/receipts.js';
import { logger } from '../lib/logger.js';

const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 } });

function requireDeviceId(req, res, next) {
  const deviceId = req.headers['x-device-id'];
  if (!deviceId) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'x-device-id header required.' } });
  }
  req.deviceId = deviceId;
  next();
}

const router = Router();

// create / refresh a receipt (device-scoped)
router.post('/check', requireDeviceId, validate(receiptPayloadSchema, 'body'), async (req, res) => {
    try {
    const deviceId = req.deviceId;
    const { receipt } = await getOrCreateReceipt(deviceId, req.body, deviceId);
    if (!receipt || !receipt.id) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Receipt could not be found or created before checking payment.' } });
    }
    const imgUrl = await publicImageUrl(receipt.image_path);
    res.status(200).json({ paid: receipt.status === 'paid', receipt: { id: receipt.id, slug: receipt.slug, image_url: imgUrl, total: receipt.total, currency: receipt.currency, store_name: receipt.store_name } });
  } catch (err) {
    const supaError = err && err.message ? { message: err.message, details: err.details, hint: err.hint, code: err.code, position: err.position } : null;
    logger.error({ err, req: { method: req.method, path: req.path, deviceId: req.deviceId }, supaError }, 'Receipt check failed');
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Could not check receipt status.', ...supaError } });
  }
});

// upload image onto a paid receipt (device-scoped)
router.post('/:id/image', requireDeviceId, upload.single('image'), async (req, res) => {
  try {
    const deviceId = req.deviceId;
    const { id } = req.params;
    console.log('[IMAGE-UPLOAD] received upload for receipt:', id, 'device:', deviceId);
    if (!req.file) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Image file is required.' } });
    }
    const { data: receipt, error: rerr } = await supabase
      .from('receipts')
      .select('id, device_id, status, image_path')
      .eq('id', id)
      .maybeSingle();
    if (rerr) throw rerr;
    if (!receipt) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Receipt not found.' } });
    if (receipt.device_id !== deviceId) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your receipt.' } });
    if (receipt.status !== 'paid') return res.status(403).json({ error: { code: 'NOT_PAID', message: 'Receipt is not paid.' } });
    console.log('[IMAGE-UPLOAD] receipt OK:', receipt.id, 'status:', receipt.status);

    const bucketName = env.SUPABASE_STORAGE_BUCKET || 'receipts';

    // Ensure the bucket exists before uploading.
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.id === bucketName);
    if (!bucketExists) {
      console.log('[IMAGE-UPLOAD] creating bucket:', bucketName);
      const { error: createErr } = await supabase.storage.createBucket(bucketName, { public: true });
      if (createErr) {
        console.log('[IMAGE-UPLOAD] create bucket failed:', createErr.message);
        throw createErr;
      }
      console.log('[IMAGE-UPLOAD] bucket created');
    } else {
      console.log('[IMAGE-UPLOAD] bucket already exists:', bucketName);
    }

    const ext = (req.file.originalname.split('.').pop() || 'jpg').toLowerCase();
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
    const path = `${deviceId}/${Date.now()}.${ext}`;
    console.log('[IMAGE-UPLOAD] uploading to bucket:', bucketName, 'path:', path);

    const { error: uerr } = await supabase.storage
      .from(bucketName)
      .upload(path, req.file.buffer, { contentType, upsert: false });
    if (uerr) {
      console.log('[IMAGE-UPLOAD] storage upload failed:', uerr.message);
      throw uerr;
    }
    console.log('[IMAGE-UPLOAD] uploaded to storage');

    const publicUrl = await publicImageUrl(path);
    console.log('[IMAGE-UPLOAD] public URL:', publicUrl);

    const { error: uperr } = await supabase
      .from('receipts')
      .update({ image_path: path, image_url: publicUrl })
      .eq('id', id);
    if (uperr) {
      console.log('[IMAGE-UPLOAD] DB update failed:', uperr.message);
      throw uperr;
    }
    console.log('[IMAGE-UPLOAD] receipt updated with image_url');

    res.status(200).json({ ok: true, path });
  } catch (err) {
    console.log('[IMAGE-UPLOAD] error:', err.message);
    logger.error({ err, req: { method: req.method, path: req.path, deviceId: req.deviceId, receiptId: req.params.id } }, 'Image upload to Supabase Storage failed');
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Image upload failed.' } });
  }
});

// public device-scoped history (no login required)
router.get('/', async (req, res) => {
  try {
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) {
      return res.status(200).json({ receipts: [], nextCursor: null });
    }
    const { style, limit = 20, cursor } = req.query;
    const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100);
    let query = supabase
      .from('receipts')
      .select('id, style, store_name, total, currency, image_url, payload, created_at, paid_at')
      .eq('device_id', deviceId)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .range(0, limitNum - 1);
    if (style === 'business' || style === 'invoice') query = query.eq('style', style);
    if (cursor) query = query.lt('created_at', cursor);

    const { data, error } = await query;
    if (error) throw error;

    // TEMPORARY DEBUG LOG: device_id received and number of rows found.
    logger.info({ deviceId, count: data.length, style }, 'Receipt history loaded');
    const nextCursor = data.length === limitNum ? data[data.length - 1].created_at : null;
    res.status(200).json({ receipts: data, nextCursor });
  } catch (err) {
    logger.error({ err, req: { method: req.method, path: req.path, deviceId: req.headers['x-device-id'] } }, 'Receipt history load failed');
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Could not load history.' } });
  }
});

// public download of a receipt image: server checks paid + device ownership
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'x-device-id header required.' } });
    }
    const { data: receipt, error } = await supabase
      .from('receipts')
      .select('id, status, device_id, image_url, store_name')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!receipt) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Receipt not found.' } });
    if (receipt.status !== 'paid') return res.status(403).json({ error: { code: 'NOT_PAID', message: 'Receipt is not paid.' } });
    if (receipt.device_id !== deviceId) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your receipt.' } });
    if (!receipt.image_url) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Receipt image not available.' } });

    res.status(200).json({ url: receipt.image_url });
  } catch (err) {
    logger.error({ err, req: { method: req.method, path: req.path, receiptId: req.params.id, deviceId: req.headers['x-device-id'] } }, 'Receipt download failed');
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Could not prepare download.' } });
  }
});

export default router;