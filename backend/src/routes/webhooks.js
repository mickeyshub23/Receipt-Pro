import { Router } from 'express';
import { env } from '../config/env.js';
import { supabase } from '../lib/supabase.js';
import { paystackVerifySignature } from '../lib/paystack.js';
import { markReceiptPaid } from '../lib/receipts.js';
import { logger } from '../lib/logger.js';

const router = Router();

async function markPaid(reference, raw) {
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('reference', reference)
    .maybeSingle();
  if (!payment || payment.status === 'success') return { already: true };

  const tx = raw?.data || raw;
  if (!tx || tx.status !== 'success') return { already: false };

  if (tx.amount < env.RECEIPT_PRICE_KOBO || tx.currency !== env.PAYSTACK_CURRENCY) {
    await supabase.from('payments').update({ status: 'failed', raw }).eq('id', payment.id);
    return { already: false };
  }

  const now = new Date().toISOString();
  await supabase.from('payments').update({ status: 'success', verified_at: now, raw }).eq('id', payment.id);
  await markReceiptPaid(payment.receipt_id);
  return { already: false };
}

router.post('/paystack', async (req, res) => {
  console.log('[WEBHOOK] received paystack webhook', { headers: Object.keys(req.headers) });
  const signature = req.headers['x-paystack-signature'];
  if (!signature) {
    console.log('[WEBHOOK] missing x-paystack-signature header');
    return res.status(401).json({ error: { code: 'INVALID_SIGNATURE', message: 'Missing signature.' } });
  }
  const rawBody = req.rawBody;
  if (!rawBody) {
    console.log('[WEBHOOK] no raw body');
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'No body.' } });
  }

  if (!paystackVerifySignature(env.PAYSTACK_SECRET_KEY, rawBody, signature)) {
    console.log('[WEBHOOK] signature mismatch');
    return res.status(401).json({ error: { code: 'INVALID_SIGNATURE', message: 'Signature mismatch.' } });
  }
  console.log('[WEBHOOK] signature verified');

  const event = JSON.parse(rawBody.toString('utf8'));
  console.log('[WEBHOOK] event type:', event.event);
  if (event.event !== 'charge.success') {
    console.log('[WEBHOOK] ignoring non-charge.success event:', event.event);
    return res.status(200).json({ ok: true });
  }

  const reference = event.data?.reference;
  console.log('[WEBHOOK] charge.success reference:', reference);
  if (!reference) {
    console.log('[WEBHOOK] no reference in event data');
    return res.status(200).json({ ok: true });
  }

  try {
    const result = await markPaid(reference, event.data);
    console.log('[WEBHOOK] markPaid result:', JSON.stringify(result));
  } catch (err) {
    console.log('[WEBHOOK] markPaid error:', err.message);
    logger.error(
      { err, req: { method: req.method, path: req.path }, reference },
      'Webhook markPaid failed',
    );
  }

  return res.status(200).json({ ok: true });
});

export default router;