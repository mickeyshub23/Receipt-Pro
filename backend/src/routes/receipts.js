import { Router } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import { supabase } from '../lib/supabase.js';
import { validate } from '../middleware/validate.js';
import { receiptPayloadSchema } from '../lib/schemas.js';
import { getOrCreateReceipt, publicImageUrl } from '../lib/receipts.js';
import { logger } from '../lib/logger.js';

const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 } });

const router = Router();

router.post('/check', validate(receiptPayloadSchema, 'body'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { receipt } = await getOrCreateReceipt(userId, req.body);
    const imgUrl = await publicImageUrl(receipt.image_path);
    res.status(200).json({ paid: receipt.status === 'paid', receipt: { id: receipt.id, slug: receipt.slug, image_url: imgUrl, total: receipt.total, currency: receipt.currency, store_name: receipt.store_name } });
  } catch (err) {
    logger.error({ err, req: { method: req.method, path: req.path, userId: req.user.id } }, 'Receipt check failed');
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Could not check receipt status.' } });
  }
});

router.post('/:id/image', upload.single('image'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Image file is required.' } });
    }
    const { data: receipt, error: rerr } = await supabase
      .from('receipts')
      .select('id, user_id, status, image_path')
      .eq('id', id)
      .maybeSingle();
    if (rerr) throw rerr;
    if (!receipt) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Receipt not found.' } });
    if (receipt.user_id !== userId) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your receipt.' } });
    if (receipt.status !== 'paid') return res.status(403).json({ error: { code: 'NOT_PAID', message: 'Receipt is not paid.' } });

    const ext = (req.file.originalname.split('.').pop() || 'jpg').toLowerCase();
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: uerr } = await supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .upload(path, req.file.buffer, { contentType, upsert: false });
    if (uerr) throw uerr;

    const { error: uperr } = await supabase
      .from('receipts')
      .update({ image_path: path, image_url: await publicImageUrl(path) })
      .eq('id', id);
    if (uperr) throw uperr;

    res.status(200).json({ ok: true, path });
  } catch (err) {
    logger.error({ err, req: { method: req.method, path: req.path, userId: req.user.id, receiptId: req.params.id } }, 'Image upload to Supabase Storage failed');
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Image upload failed.' } });
  }
});

router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { style, limit = 20, cursor } = req.query;
    const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100);
    let query = supabase
      .from('receipts')
      .select('id, style, store_name, total, currency, image_url, created_at')
      .eq('user_id', userId)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .range(0, limitNum - 1);
    if (style === 'business' || style === 'invoice') query = query.eq('style', style);
    if (cursor) query = query.lt('created_at', cursor);

    const { data, error } = await query;
    if (error) throw error;

    const nextCursor = data.length === limitNum ? data[data.length - 1].created_at : null;
    // image_url is already stored in the DB (public bucket), so no storage calls needed.
    res.status(200).json({ receipts: data, nextCursor });
  } catch (err) {
    logger.error({ err, req: { method: req.method, path: req.path, userId: req.user.id } }, 'Receipt history load failed');
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Could not load history.' } });
  }
});

export default router;