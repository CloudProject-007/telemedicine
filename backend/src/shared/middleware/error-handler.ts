import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { isProduction } from '../../config/env';
import { logger } from '../../infrastructure/logger';
import { isPrismaError } from '../../infrastructure/prisma';
import { AppError, type ErrorCode } from '../errors/app-error';

interface HttpLikeError {
  status?: number;
  statusCode?: number;
  type?: string;
  expose?: boolean;
}

interface NormalizedError {
  status: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof ZodError) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  if (isPrismaError(error, 'P2002')) {
    return { status: 409, code: 'CONFLICT', message: 'Resource already exists' };
  }
  if (isPrismaError(error, 'P2025')) {
    return { status: 404, code: 'NOT_FOUND', message: 'Resource not found' };
  }

  // Errors raised by body-parser / http-errors (malformed JSON, payload too large, ...)
  const httpError = error as HttpLikeError | null;
  const status = httpError?.status ?? httpError?.statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    if (httpError?.type === 'entity.parse.failed') {
      return { status: 400, code: 'BAD_REQUEST', message: 'Malformed JSON body' };
    }
    if (status === 413) {
      return { status, code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' };
    }
    return { status, code: 'BAD_REQUEST', message: 'Bad request' };
  }

  return { status: 500, code: 'INTERNAL_ERROR', message: 'Internal server error' };
}

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const normalized = normalizeError(error);

  if (normalized.status >= 500) {
    (req.log ?? logger).error({ err: error }, 'Unhandled error');
  }

  res.status(normalized.status).json({
    error: {
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details !== undefined ? { details: normalized.details } : {}),
      ...(!isProduction && normalized.status >= 500 && error instanceof Error
        ? { debug: error.message }
        : {}),
    },
  });
};
