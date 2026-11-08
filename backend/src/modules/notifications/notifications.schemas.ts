import { z } from 'zod';

/** SNS can only text numbers in international format. */
export const E164_PHONE = /^\+[1-9]\d{6,14}$/;

export const updatePreferencesBodySchema = z
  .object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    /** An empty string removes the number. */
    phone: z
      .union([
        z.literal(''),
        z.string().trim().regex(E164_PHONE, 'Use international format, for example +919876543210'),
      ])
      .optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Send at least one setting to change',
  });

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesBodySchema>;
