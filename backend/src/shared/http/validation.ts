import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const idParamSchema = z.object({ id: uuidSchema });

/** ISO-8601 date-time string coerced to a Date (rejects invalid dates). */
export const isoDateSchema = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value));
