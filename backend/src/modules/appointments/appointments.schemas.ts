import { z } from 'zod';
import { AppointmentStatus } from '@prisma/client';
import { paginationQuerySchema } from '../../shared/http/pagination';
import { isoDateSchema, uuidSchema } from '../../shared/http/validation';

export const createAppointmentBodySchema = z.object({
  slotId: uuidSchema,
  reason: z.string().trim().min(1).max(500).optional(),
});

export const listAppointmentsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(AppointmentStatus).optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const updateAppointmentStatusBodySchema = z.object({
  status: z.enum([
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
  ]),
  reason: z.string().trim().min(1).max(500).optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentBodySchema>;
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusBodySchema>;
