import app from './app.js';
import { logger } from './lib/logger.js';

const PORT = Number(process.env.PORT || 10000);

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Receipt Pro backend listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

function gracefulShutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));