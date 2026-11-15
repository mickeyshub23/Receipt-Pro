import pinoHttp from 'pino-http';
import { logger } from '../lib/logger.js';

/**
 * One structured log line per request: method, path, status, response time.
 * pino-http adds `responseTime` (ms) automatically on response finish.
 * Headers/bodies are intentionally not serialized so tokens never leak.
 */
export const requestLogger = pinoHttp({
  logger,
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req: (req) => ({ method: req.method, path: req.url }),
    res: (res) => ({ status: res.statusCode }),
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} -> ${res.statusCode}`,
  customErrorMessage: (req, res) => `${req.method} ${req.url} -> ${res.statusCode}`,
  customAttributeKeys: { responseTime: 'timeMs' },
});
