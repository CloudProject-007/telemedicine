import { z } from 'zod';
import { uuidSchema } from '../../shared/http/validation';

export const chatTextSchema = z.string().trim().min(1).max(2000);

export const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  /** Id of the oldest message already loaded; returns messages sent before it. */
  cursor: uuidSchema.optional(),
});

export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
