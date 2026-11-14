import { Router } from 'express';
import { env } from '../config/env.js';

const router = Router();

router.get('/', (_req, res) => {
  res.status(200).json({
    priceKobo: env.RECEIPT_PRICE_KOBO,
    currency: env.PAYSTACK_CURRENCY,
  });
});

export default router;