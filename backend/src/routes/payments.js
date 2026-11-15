import { Router } from 'express';
import { env } from '../config/env.js';
import { supabase } from '../lib/supabase.js';
import { getOrCreateReceipt, markReceiptPaid } from '../lib/receipts.js';
import { validate } from '../middleware/validate.js';
import { receiptPayloadSchema } from '../lib/schemas.js';

const router = Router();

function paystackUrl(path) {
  return `https://api.paystack.co${path}`;
}

function uniqueRef() {
  return `rcp_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

router.post(
  '/initialize',
  validate(receiptPayloadSchema, 'body'),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const payload = req.body;
      const { receipt, fingerprint } = await getOrCreateReceipt(userId, payload);

      const amountKobo = env.RECEIPT_PRICE_KOBO;
      const reference = uniqueRef();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // create payment row
      const { error: perr } = await supabase.from('payments').insert({
        user_id: userId,
        receipt_id: receipt.id,
        reference,
        amount_kobo: amountKobo,
        currency: env.PAYSTACK_CURRENCY,
        status: 'pending',
        expires_at: expiresAt,
        raw: null,
        verified_at: null,
      });
      if (perr) throw perr;

      const body = JSON.stringify({
        email: req.user.email || `${userId}@receiptpro.local`,
        amount: amountKobo,
        currency: env.PAYSTACK_CURRENCY,
        reference,
        callback_url: env.PAYSTACK_CALLBACK_URL,
        metadata: { receipt_id: receipt.id, user_id: userId },
      });

      const resp = await fetch(paystackUrl('/transaction/initialize'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body,
      });
      const data = await resp.json();

      if (!data.status) {
        throw new Error(data.message || 'Paystack initialization failed');
      }

      res.status(200).json({
        authorization_url: data.data.authorization_url,
        access_code: data.data.access_code,
        reference,
        expires_at: expiresAt,
        receipt: { id: receipt.id, slug: receipt.slug },
      });
    } catch (err) {
      res.status(500).json({ error: { code: 'PAYMENT_ERROR', message: err.message || 'Could not initialize payment.' } });
    }
  },
);

router.get('/verify', async (req, res) => {
  try {
    const userId = req.user.id;
    const { reference } = req.query;
    if (!reference || typeof reference !== 'string') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'reference is required.' } });
    }

    const { data: payment, error: perr } = await supabase
      .from('payments')
      .select('*')
      .eq('reference', reference)
      .maybeSingle();
    if (perr) throw perr;
    if (!payment || payment.user_id !== userId) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payment not found.' } });
    }
    if (payment.status === 'success') {
      return res.status(200).json({ paid: true, receipt_id: payment.receipt_id, idempotent: true });
    }

    const verifyResp = await fetch(paystackUrl(`/transaction/verify/${encodeURIComponent(reference)}`), {
      headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
    });
    const verifyData = await verifyResp.json();

    if (!verifyData.status || verifyData.data.status !== 'success') {
      await supabase.from('payments').update({ status: 'failed', raw: verifyData }).eq('id', payment.id);
      return res.status(200).json({ paid: false });
    }

    const tx = verifyData.data;
    if (tx.amount < env.RECEIPT_PRICE_KOBO || tx.currency !== env.PAYSTACK_CURRENCY) {
      await supabase.from('payments').update({ status: 'failed', raw: tx }).eq('id', payment.id);
      return res.status(200).json({ paid: false });
    }

    const now = new Date().toISOString();
    await supabase.from('payments').update({ status: 'success', verified_at: now, raw: tx }).eq('id', payment.id);
    await markReceiptPaid(payment.receipt_id);

    return res.status(200).json({ paid: true, receipt_id: payment.receipt_id });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Verification failed.' } });
  }
});

export default router;