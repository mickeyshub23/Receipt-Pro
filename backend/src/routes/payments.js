import { Router } from 'express';
import { env } from '../config/env.js';
import { supabase } from '../lib/supabase.js';
import { getOrCreateReceipt, markReceiptPaid } from '../lib/receipts.js';
import { validate } from '../middleware/validate.js';
import { receiptPayloadSchema } from '../lib/schemas.js';
import { logger } from '../lib/logger.js';

function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function requireDeviceId(req, res, next) {
  const deviceId = req.headers['x-device-id'];
  if (!deviceId) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'x-device-id header required.' } });
  }
  req.deviceId = deviceId;
  next();
}

function paystackUrl(path) {
  return `https://api.paystack.co${path}`;
}

function uniqueRef(receiptId) {
  const shortId = receiptId ? String(receiptId).slice(0, 8) : 'new';
  return `rcp_${shortId}_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

router.post(
  '/initialize',
  requireDeviceId,
  validate(receiptPayloadSchema, 'body'),
  async (req, res) => {
    try {
      const deviceId = req.deviceId;
      const payload = req.body;
      // Optional email from the frontend; default if missing/invalid.
      let email = (payload.email || '').trim();
      if (!email || !isValidEmail(email)) email = `${deviceId}@receiptpro.local`;
      const receipt = await getOrCreateReceipt(deviceId, payload, deviceId);

      const amountKobo = env.RECEIPT_PRICE_KOBO;
      const reference = uniqueRef(receipt.id);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // create payment row with email
      const { error: perr } = await supabase.from('payments').insert({
        user_id: deviceId,
        receipt_id: receipt.id,
        reference,
        amount_kobo: amountKobo,
        currency: env.PAYSTACK_CURRENCY,
        status: 'pending',
        expires_at: expiresAt,
        raw: null,
        verified_at: null,
        email,  // <-- store the email
      });
      if (perr) throw perr;

      const body = JSON.stringify({
        email,
        amount: amountKobo,
        currency: env.PAYSTACK_CURRENCY,
        reference,
        callback_url: env.PAYSTACK_CALLBACK_URL,
        metadata: { receipt_id: receipt.id, user_id: deviceId },
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
      logger.error({ err, req: { method: req.method, path: req.path, deviceId: req.deviceId } }, 'Payment initialization failed');
      res.status(500).json({ error: { code: 'PAYMENT_ERROR', message: err.message || 'Could not initialize payment.' } });
    }
  },
);

router.get('/verify', async (req, res) => {
  try {
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
    if (!payment) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payment not found.' } });
    }

    // Only allow verification if the payment belongs to a receipt owned by this device.
    const { data: receipt, error: rer } = await supabase
      .from('receipts')
      .select('status, device_id')
      .eq('id', payment.receipt_id)
      .maybeSingle();
    if (rer) throw rer;
    if (!receipt) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Receipt not found.' } });
    }
    if (receipt.device_id !== req.deviceId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your receipt.' } });
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
    await markReceiptPaid(payment.receipt_id, payment.user_id);

    return res.status(200).json({ paid: true, receipt_id: payment.receipt_id });
  } catch (err) {
    logger.error({ err, req: { method: req.method, path: req.path, deviceId: req.deviceId }, reference: req.query.reference }, 'Payment verification failed');
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Verification failed.' } });
  }
});

export default router;