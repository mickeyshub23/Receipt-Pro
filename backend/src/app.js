import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';

import health from './routes/health.js';
import config from './routes/config.js';
import receipts from './routes/receipts.js';
import payments from './routes/payments.js';
import webhooks from './routes/webhooks.js';
import publicReceipts from './routes/publicReceipts.js';
import { globalLimiter, paymentLimiter, publicLimiter } from './middleware/rateLimit.js';
import errorHandler from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

const app = express();

app.set('trust proxy', 1);

const vercelOriginRe = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;
const localCorsOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
]);

function corsOrigin(origin, cb) {
  const configured = env.FRONTEND_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
  const isAllowed =
    !origin ||
    vercelOriginRe.test(origin) ||
    localCorsOrigins.has(origin) ||
    configured.includes(origin);
  cb(null, isAllowed);
}

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }),
);
app.use(helmet());

app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(globalLimiter);

app.use(requestLogger);

app.use('/health', health);
app.use('/api/config', config);
app.use('/api/webhooks', webhooks);
app.use('/api/payments', paymentLimiter, payments);
app.use('/api/receipts', receipts);
app.use('/api/public', publicLimiter, publicReceipts);

app.use(errorHandler);

export default app;