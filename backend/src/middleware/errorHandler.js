import { logger } from '../lib/logger.js';

export default function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const isDev = process.env.NODE_ENV === 'development';

  if (status >= 500) {
    logger.error(
      {
        err,
        req: { method: req.method, path: req.path },
      },
      `Unhandled error on ${req.method} ${req.path}: ${err.message || 'An unexpected error occurred.'}`,
    );
  } else {
    logger.warn(`Request error on ${req.method} ${req.path}: ${err.message || 'Bad request.'}`);
  }

  const body = {
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'An unexpected error occurred.',
    },
  };
  if (isDev && err.stack) body.error.stack = err.stack;
  res.status(status).json(body);
}