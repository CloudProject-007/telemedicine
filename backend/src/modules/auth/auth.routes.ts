import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';
import { authenticate } from '../../shared/middleware/authenticate';
import * as controller from './auth.controller';

/** Stricter limit on credential endpoints to slow down brute force attempts. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 1000 : 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts, try again later' } },
});

export const authRouter = Router();

authRouter.post('/register', authLimiter, controller.register);
authRouter.post('/login', authLimiter, controller.login);
authRouter.post('/refresh', authLimiter, controller.refresh);
authRouter.post('/logout', controller.logout);
authRouter.get('/me', authenticate, controller.me);
