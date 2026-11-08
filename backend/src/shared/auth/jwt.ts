import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { env } from '../../config/env';
import { UnauthorizedError } from '../errors/app-error';
import type { AuthUser } from '../types/auth';

const accessTokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  role: z.nativeEnum(Role),
});

export function signAccessToken(user: AuthUser): string {
  return jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithm: 'HS256',
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  });
}

/** Verifies signature, expiry, issuer, audience and payload shape. Throws UnauthorizedError. */
export function verifyAccessToken(token: string): AuthUser {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });
    const payload = accessTokenPayloadSchema.parse(decoded);
    return { id: payload.sub, role: payload.role };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Access token expired');
    }
    throw new UnauthorizedError('Invalid access token');
  }
}
