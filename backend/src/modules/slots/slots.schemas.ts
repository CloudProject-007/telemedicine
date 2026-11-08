import { z } from 'zod';
import { isoDateSchema } from '../../shared/http/validation';

export const MIN_SLOT_MINUTES = 10;
export const MAX_SLOT_MINUTES = 120;
export const MAX_SLOTS_PER_REQUEST = 50;
export const MAX_QUERY_RANGE_DAYS = 31;

export const listSlotsQuerySchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    onlyAvailable: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
  })
  .refine((value) => !value.from || !value.to || value.to > value.from, {
    message: '"to" must be after "from"',
    path: ['to'],
  })
  .refine(
    (value) =>
      !value.from ||
      !value.to ||
      value.to.getTime() - value.from.getTime() <= MAX_QUERY_RANGE_DAYS * 24 * 3600 * 1000,
    { message: `Range cannot exceed ${MAX_QUERY_RANGE_DAYS} days`, path: ['to'] },
  );

export const createSlotsBodySchema = z.object({
  slots: z
    .array(z.object({ startTime: isoDateSchema, endTime: isoDateSchema }))
    .min(1)
    .max(MAX_SLOTS_PER_REQUEST),
});

export type ListSlotsQuery = z.infer<typeof listSlotsQuerySchema>;
export type CreateSlotsInput = z.infer<typeof createSlotsBodySchema>;
export type SlotInput = CreateSlotsInput['slots'][number];
