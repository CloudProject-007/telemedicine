import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { env } from '../../src/config/env';
import { signAccessToken, verifyAccessToken } from '../../src/shared/auth/jwt';
import { generateRefreshToken, hashRefreshToken } from '../../src/shared/auth/refresh-token';
import { UnauthorizedError } from '../../src/shared/errors/app-error';
import { PATIENT_ID } from '../helpers/fixtures';

describe('access tokens', () => {
  it('round-trips id and role', () => {
    const token = signAccessToken({ id: PATIENT_ID, role: Role.PATIENT });
    expect(verifyAccessToken(token)).toEqual({ id: PATIENT_ID, role: Role.PATIENT });
  });

  it('rejects tokens signed with another secret', () => {
    const forged = jwt.sign({ role: Role.ADMIN }, 'a-completely-different-secret-value-123', {
      subject: PATIENT_ID,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });
    expect(() => verifyAccessToken(forged)).toThrow(UnauthorizedError);
  });

  it('rejects tokens with the wrong audience or an unsigned "none" algorithm', () => {
    const wrongAudience = jwt.sign({ role: Role.PATIENT }, env.JWT_ACCESS_SECRET, {
      subject: PATIENT_ID,
      issuer: env.JWT_ISSUER,
      audience: 'someone-else',
    });
    expect(() => verifyAccessToken(wrongAudience)).toThrow(UnauthorizedError);

    const unsigned = jwt.sign({ role: Role.ADMIN, sub: PATIENT_ID }, '', { algorithm: 'none' });
    expect(() => verifyAccessToken(unsigned)).toThrow(UnauthorizedError);
  });

  it('rejects expired tokens', () => {
    const expired = jwt.sign({ role: Role.PATIENT }, env.JWT_ACCESS_SECRET, {
      subject: PATIENT_ID,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      expiresIn: -10,
    });
    expect(() => verifyAccessToken(expired)).toThrow(/expired/i);
  });

  it('rejects a payload that does not match the expected shape', () => {
    const badSubject = jwt.sign({ role: Role.PATIENT }, env.JWT_ACCESS_SECRET, {
      subject: 'not-a-uuid',
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });
    expect(() => verifyAccessToken(badSubject)).toThrow(UnauthorizedError);
    expect(() => verifyAccessToken('garbage')).toThrow(UnauthorizedError);
  });
});

describe('refresh tokens', () => {
  it('stores only a hash and expires in the future', () => {
    const now = new Date('2026-11-01T00:00:00Z');
    const generated = generateRefreshToken(now);
    expect(generated.tokenHash).toBe(hashRefreshToken(generated.token));
    expect(generated.tokenHash).not.toContain(generated.token);
    expect(generated.expiresAt.getTime()).toBe(
      now.getTime() + env.REFRESH_TOKEN_TTL_SECONDS * 1000,
    );
    expect(generateRefreshToken().token).not.toBe(generated.token);
  });
});
