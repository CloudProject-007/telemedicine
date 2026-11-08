import { createServer } from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './infrastructure/logger';
import { prisma } from './infrastructure/prisma';
import { startReminderWorker } from './modules/reminders/reminders.worker';
import { createRealtimeServer } from './sockets';

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function main(): Promise<void> {
  await prisma.$connect();

  const httpServer = createServer(createApp());
  // Keep-alive must outlive the AWS ALB idle timeout (60s default) to avoid sporadic 502s.
  httpServer.keepAliveTimeout = 65_000;
  httpServer.headersTimeout = 66_000;

  const realtime = await createRealtimeServer(httpServer);
  const reminderWorker = startReminderWorker();

  httpServer.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Telemedicine API listening');
  });

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down gracefully');

    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    void (async () => {
      try {
        await reminderWorker?.stop();
        await realtime.close();
        await prisma.$disconnect();
        process.exit(0);
      } catch (error) {
        logger.error({ err: error }, 'Error during shutdown');
        process.exit(1);
      }
    })();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled promise rejection');
    shutdown('unhandledRejection');
  });
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    shutdown('uncaughtException');
  });
}

main().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Failed to start server');
  process.exit(1);
});
