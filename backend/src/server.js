import app from './app.js';

const PORT = Number(process.env.PORT || 10000);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Receipt Pro backend listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

function gracefulShutdown(signal) {
  console.log(`Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    console.log('Forced shutdown.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));