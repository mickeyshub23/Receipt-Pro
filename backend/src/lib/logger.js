import pino from 'pino';
import { env } from '../config/env.js';

/**
 * Central pino logger.
 *
 * - JSON structured logs, one line per record.
 * - Redacts Authorization, apikey, cookie and known secret-bearing fields.
 * - Never logs keys or tokens. error.stack is NOT redacted because error
 *   logging for failed receipt/payment/storage calls is a requirement.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.apikey',
      'req.headers.cookie',
      'req.headers.set-cookie',
      'req.headers.x-paystack-signature',
      'req.headers.x-api-key',
      'req.body.password',
      'req.body.token',
      'req.body.apikey',
      'req.body.secret',
      'req.body.access_code',
      'req.body.authorization_url',
    ],
    censor: '[REDACTED]',
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
  base: undefined,
});

export function childLogger(name) {
  return logger.child({ logger: name });
}