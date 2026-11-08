import type { z } from 'zod';
import type { CreateDoctorInput } from '@/lib/api/doctors.api';
import { registerSchema } from '@/features/auth/schemas';
import { profileSchema, toProfileInput } from '@/features/doctors/profile-schema';

/** A doctor account is a sign-up (name, email, phone, password) plus a profile. */
export const createDoctorSchema = registerSchema.and(profileSchema);

export type CreateDoctorValues = z.infer<typeof createDoctorSchema>;

export function toCreateDoctorInput(values: CreateDoctorValues): CreateDoctorInput {
  return {
    ...toProfileInput(values),
    name: values.name,
    email: values.email,
    password: values.password,
    phone: values.phone || undefined,
  };
}
