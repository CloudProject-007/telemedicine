import type { Response } from 'express';
import type { Paginated } from './pagination';

/** Success envelope: `{ data, meta? }`. Errors use `{ error }` (see error-handler). */
export function sendData<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ data });
}

export function sendPaginated<T>(res: Response, result: Paginated<T>): void {
  res.status(200).json({ data: result.items, meta: result.meta });
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}
