import { z } from 'zod';

const emailSchema = z.string().trim().toLowerCase().email().max(254);

/** At least 8 chars with a letter and a digit; 72 is bcrypt's byte limit. */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a digit');

export const registerBodySchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  password: passwordSchema,
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{7,15}$/, 'Phone must be 7-15 digits, optionally starting with +')
    .optional(),
});

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(20).max(200),
});

export type RegisterInput = z.infer<typeof registerBodySchema>;
export type LoginInput = z.infer<typeof loginBodySchema>;
export type RefreshInput = z.infer<typeof refreshBodySchema>;
