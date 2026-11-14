export default function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const isDev = process.env.NODE_ENV === 'development';
  const body = {
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'An unexpected error occurred.',
    },
  };
  if (isDev && err.stack) body.error.stack = err.stack;
  res.status(status).json(body);
}