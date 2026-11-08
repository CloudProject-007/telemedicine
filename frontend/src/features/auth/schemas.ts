import { z } from 'zod';

/** Mirrors the backend rules (backend/src/modules/auth/auth.schemas.ts) so errors show before sending. */
export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email address').email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(100, 'Name is too long'),
  email: z.string().trim().min(1, 'Enter your email address').email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9]{7,15})?$/, 'Use 7 to 15 digits, with an optional + at the start'),
  password: z
    .string()
    .min(8, 'Use at least 8 characters')
    .max(72, 'Use at most 72 characters')
    .regex(/[A-Za-z]/, 'Include at least one letter')
    .regex(/\d/, 'Include at least one number'),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
