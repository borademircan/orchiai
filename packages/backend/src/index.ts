import { createApp } from './app';
import env from './config/env';
import logger from './config/logger';
import { prisma, disconnectDatabase } from '@orchiai/database';
import scheduledTriggerManager from './services/ScheduledTriggerManager';

async function startServer() {
  try {
    // Test database connection
    logger.info('Connecting to database...');
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Create Express app
    const app = createApp();

    // Start scheduled trigger manager
    logger.info('Starting scheduled trigger manager...');
    await scheduledTriggerManager.start();
    logger.info('Scheduled trigger manager started');

    // Start server
    const PORT = parseInt(env.PORT, 10);
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📝 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 API: http://localhost:${PORT}/api/v1`);
      logger.info(`💚 Health: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, closing server gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Stop scheduled trigger manager
          scheduledTriggerManager.stop();
          logger.info('Scheduled trigger manager stopped');

          await disconnectDatabase();
          logger.info('Database connection closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error({
        err: error,
        message: error.message,
        stack: error.stack,
        name: error.name,
      }, 'Uncaught exception');
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error({
        reason,
        promise: promise.toString(),
        error: reason instanceof Error ? {
          message: reason.message,
          stack: reason.stack,
          name: reason.name,
        } : reason,
      }, 'Unhandled rejection');
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
