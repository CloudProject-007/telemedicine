import { Prisma, PrismaClient } from '@prisma/client';
import { env } from '../config/env';

export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

/** Type guard for Prisma "known request" errors, optionally narrowed to a code (e.g. P2002). */
export function isPrismaError(
  error: unknown,
  code?: string,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (code === undefined || error.code === code)
  );
}

export type TransactionClient = Prisma.TransactionClient;
