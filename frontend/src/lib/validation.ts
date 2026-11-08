import { z } from 'zod';

/** A whole number typed into a text field, kept as text so form values match the schema output. */
export const wholeNumber = (label: string, max: number, min = 0) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, `${label} must be a whole number`)
    .refine((value) => Number(value) >= min, `${label} must be at least ${min}`)
    .refine((value) => Number(value) <= max, `${label} cannot be more than ${max}`);
