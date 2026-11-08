import { z } from 'zod';
import { isoDateSchema } from '../../shared/http/validation';

export const medicationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  dosage: z.string().trim().min(1).max(60),
  frequency: z.string().trim().min(1).max(60),
  durationDays: z.number().int().min(1).max(365),
  instructions: z.string().trim().max(300).optional(),
});

export const upsertPrescriptionBodySchema = z.object({
  diagnosis: z.string().trim().max(500).optional(),
  notes: z.string().trim().min(1).max(2000),
  medications: z.array(medicationSchema).min(1).max(20),
  followUpDate: isoDateSchema.optional(),
});

export type Medication = z.infer<typeof medicationSchema>;
export type UpsertPrescriptionInput = z.infer<typeof upsertPrescriptionBodySchema>;
