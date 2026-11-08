import { Router } from 'express';
import { prisma } from '../../infrastructure/prisma';
import { ServiceUnavailableError } from '../../shared/errors/app-error';

export const healthRouter = Router();

/** Liveness: the process is up. Used by the container / ALB health check. */
healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
});

/** Readiness: dependencies are reachable. */
healthRouter.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    throw new ServiceUnavailableError('Database is not reachable');
  }
  res.json({ status: 'ready', database: 'up' });
});
