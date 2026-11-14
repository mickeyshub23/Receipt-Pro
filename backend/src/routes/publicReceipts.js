import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { signedImageUrl } from '../lib/receipts.js';

const router = Router();

router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { data: receipt, error } = await supabase
      .from('receipts')
      .select('store_name, style, created_at, status, image_path, slug')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    if (!receipt || receipt.status !== 'paid' || !receipt.image_path) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Receipt not found.' } });
    }
    const imageUrl = await signedImageUrl(receipt.image_path, 600);
    if (!imageUrl) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Receipt image not available.' } });
    }
    res.status(200).json({
      store_name: receipt.store_name,
      style: receipt.style,
      created_at: receipt.created_at,
      image_url: imageUrl,
    });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Could not load receipt.' } });
  }
});

export default router;