import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { normalizeError } from '../../src/shared/middleware/error-handler';
import { ConflictError, NotFoundError } from '../../src/shared/errors/app-error';

describe('normalizeError', () => {
  it('maps AppError subclasses', () => {
    expect(normalizeError(new NotFoundError('Doctor'))).toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Doctor not found',
    });
    expect(normalizeError(new ConflictError('taken'))).toMatchObject({
      status: 409,
      code: 'CONFLICT',
    });
  });

  it('maps zod errors to 400 with field details', () => {
    const result = z.object({ email: z.string().email() }).safeParse({ email: 'nope' });
    if (result.success) {
      throw new Error('expected a validation failure');
    }
    const normalized = normalizeError(result.error);
    expect(normalized.status).toBe(400);
    expect(normalized.code).toBe('VALIDATION_ERROR');
    expect(normalized.details).toEqual([{ path: 'email', message: expect.any(String) }]);
  });

  it('maps Prisma unique and not-found errors', () => {
    const unique = new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: 'test',
    });
    const missing = new Prisma.PrismaClientKnownRequestError('gone', {
      code: 'P2025',
      clientVersion: 'test',
    });
    expect(normalizeError(unique)).toMatchObject({ status: 409, code: 'CONFLICT' });
    expect(normalizeError(missing)).toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('maps body-parser errors', () => {
    expect(normalizeError({ status: 400, type: 'entity.parse.failed' })).toMatchObject({
      status: 400,
      message: 'Malformed JSON body',
    });
    expect(normalizeError({ status: 413 })).toMatchObject({
      status: 413,
      code: 'PAYLOAD_TOO_LARGE',
    });
  });

  it('hides details of unexpected errors', () => {
    const normalized = normalizeError(new Error('db password is hunter2'));
    expect(normalized).toEqual({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  });
});
