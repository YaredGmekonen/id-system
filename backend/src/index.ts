import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { db, pool } from './db/index.js';
import { generationWorker } from './workers/generationWorker.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  logger.info('================================================================');
  logger.info('  SiliconLabs Enterprise ID Card Platform — Backend Server      ');
  logger.info(`  Environment: ${env.NODE_ENV} | Port: ${env.PORT}             `);
  logger.info('================================================================');

  // Verify database connectivity
  const dbConnected = await db.ping();
  if (dbConnected) {
    logger.info('PostgreSQL Database connected successfully');
  } else {
    logger.warn('PostgreSQL Database offline or unreachable. Backend running in resilient mode.');
  }

  // Start background worker for generation jobs
  generationWorker.start();

  const app = createApp();
  const server = http.createServer(app);

  server.listen(env.PORT, env.HOST, () => {
    logger.info(`REST API Server listening on http://${env.HOST}:${env.PORT}`);
    logger.info(`Health check available at http://${env.HOST}:${env.PORT}/api/v1/health`);
  });

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    generationWorker.stop();

    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await pool.end();
        logger.info('PostgreSQL pool drained.');
      } catch (err) {
        logger.error('Error closing database pool', { error: err });
      }
      process.exit(0);
    });

    // Force exit after 10s timeout
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch(err => {
  logger.error('Fatal error during backend server startup', { error: err.message, stack: err.stack });
  process.exit(1);
});
