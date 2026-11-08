import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env';
import { logger } from './infrastructure/logger';
import { healthRouter } from './modules/health/health.routes';
import { apiRouter } from './routes';
import { errorHandler } from './shared/middleware/error-handler';
import { notFoundHandler } from './shared/middleware/not-found';

export const API_PREFIX = '/api/v1';

/** Builds the Express app. Kept free of listen()/connections so tests can import it. */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  // Behind CloudFront/ALB: trust the proxy hop so req.ip and rate limiting use the real client IP.
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id = typeof incoming === 'string' && incoming.length <= 100 ? incoming : randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url === '/health' },
      customLogLevel: (_req, res, error) =>
        error || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
    }),
  );

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  // Health checks stay outside the rate limiter so load balancers are never throttled.
  app.use('/health', healthRouter);

  app.use(
    API_PREFIX,
    rateLimit({
      windowMs: 60 * 1000,
      limit: env.NODE_ENV === 'test' ? 10_000 : 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, slow down' } },
    }),
    apiRouter,
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
