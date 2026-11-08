import type { Request, RequestHandler } from 'express';
import { verifyAccessToken } from '../auth/jwt';
import { UnauthorizedError } from '../errors/app-error';
import type { AuthUser } from '../types/auth';

const BEARER_PREFIX = 'Bearer ';

/** Requires a valid `Authorization: Bearer <accessToken>` header and sets `req.user`. */
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith(BEARER_PREFIX)) {
    throw new UnauthorizedError();
  }
  req.user = verifyAccessToken(header.slice(BEARER_PREFIX.length).trim());
  next();
};

/** Returns the authenticated user or throws. Use in handlers behind `authenticate`. */
export function requireUser(req: Request): AuthUser {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  return req.user;
}
