import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { ForbiddenError } from '../errors/app-error';
import { requireUser } from './authenticate';

/** Role guard. Must run after `authenticate`. */
export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    const user = requireUser(req);
    if (!roles.includes(user.role)) {
      throw new ForbiddenError();
    }
    next();
  };
