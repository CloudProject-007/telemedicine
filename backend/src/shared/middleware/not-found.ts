import type { RequestHandler } from 'express';
import { NotFoundError } from '../errors/app-error';

export const notFoundHandler: RequestHandler = (req) => {
  throw new NotFoundError(`Route ${req.method} ${req.path}`);
};
