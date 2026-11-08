import { createHash, randomBytes } from 'node:crypto';
import { env } from '../../config/env';

export interface GeneratedRefreshToken {
  /** Returned to the client once. Never stored. */
  token: string;
  /** Stored in the database. */
  tokenHash: string;
  expiresAt: Date;
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateRefreshToken(now: Date = new Date()): GeneratedRefreshToken {
  const token = randomBytes(48).toString('base64url');
  return {
    token,
    tokenHash: hashRefreshToken(token),
    expiresAt: new Date(now.getTime() + env.REFRESH_TOKEN_TTL_SECONDS * 1000),
  };
}
