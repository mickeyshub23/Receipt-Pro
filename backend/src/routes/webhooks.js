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
  const signature = req.headers['x-paystack-signature'];
  if (!signature) {
    return res.status(401).json({ error: { code: 'INVALID_SIGNATURE', message: 'Missing signature.' } });
  }
  const rawBody = req.rawBody;
  if (!rawBody) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'No body.' } });
  }

  if (!paystackVerifySignature(env.PAYSTACK_SECRET_KEY, rawBody, signature)) {
    return res.status(401).json({ error: { code: 'INVALID_SIGNATURE', message: 'Signature mismatch.' } });
  }

  const event = JSON.parse(rawBody.toString('utf8'));
  if (event.event !== 'charge.success') {
    return res.status(200).json({ ok: true });
  }

  const reference = event.data?.reference;
  if (!reference) {
    return res.status(200).json({ ok: true });
  }

  try {
    await markPaid(reference, event.data);
  } catch (err) {
    // Always answer 200 for valid events so Paystack does not retry forever.
    // Log the full stack for debugging — webhook data is never echoed to the caller.
    logger.error(
      { err, req: { method: req.method, path: req.path }, reference },
      'Webhook markPaid failed',
    );
  }

  return res.status(200).json({ ok: true });
});

export default router;