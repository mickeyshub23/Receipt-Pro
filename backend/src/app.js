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
import auth from './middleware/auth.js';
import errorHandler from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

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
app.use('/api/payments', paymentLimiter, auth, payments);
app.use('/api/receipts', auth, receipts);
app.use('/api/public', publicLimiter, publicReceipts);

app.use(errorHandler);

export default app;