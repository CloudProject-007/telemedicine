import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/http/pagination';
import { passwordSchema } from '../auth/auth.schemas';

export const listDoctorsQuerySchema = paginationQuerySchema.extend({
  specialty: z.string().trim().min(1).max(100).optional(),
  q: z.string().trim().min(1).max(100).optional(),
});

const profileFields = {
  specialty: z.string().trim().min(2).max(100),
  experienceYears: z.number().int().min(0).max(70),
  consultationFee: z.number().int().min(0).max(100_000),
  qualification: z.string().trim().max(200).optional(),
  bio: z.string().trim().max(2000).optional(),
  languages: z.array(z.string().trim().min(2).max(50)).max(10).default([]),
};

export const createDoctorBodySchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  password: passwordSchema,
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{7,15}$/)
    .optional(),
  ...profileFields,
});

export const updateDoctorProfileBodySchema = z
  .object(profileFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type ListDoctorsQuery = z.infer<typeof listDoctorsQuerySchema>;
export type CreateDoctorInput = z.infer<typeof createDoctorBodySchema>;
export type UpdateDoctorProfileInput = z.infer<typeof updateDoctorProfileBodySchema>;
