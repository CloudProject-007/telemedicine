import { z } from 'zod';
import type { DoctorProfileInput } from '@/lib/api/doctors.api';
import { wholeNumber } from '@/lib/validation';

export function parseLanguages(text: string): string[] {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Form fields are kept as text and converted on submit (see `toProfileInput`), so the form's
 * values and the schema's output are the same type. Limits mirror backend/src/modules/doctors.
 */
export const profileSchema = z.object({
  specialty: z.string().trim().min(2, 'Enter a specialty').max(100, 'Specialty is too long'),
  experienceYears: wholeNumber('Experience', 70),
  consultationFee: wholeNumber('Fee', 100_000),
  qualification: z.string().trim().max(200, 'Use 200 characters or fewer'),
  bio: z.string().trim().max(2000, 'Use 2000 characters or fewer'),
  languages: z.string().refine((value) => {
    const items = parseLanguages(value);
    return items.length <= 10 && items.every((item) => item.length >= 2 && item.length <= 50);
  }, 'Use up to 10 languages, separated by commas'),
});

export type ProfileValues = z.infer<typeof profileSchema>;

export function toProfileInput(values: ProfileValues): DoctorProfileInput {
  return {
    specialty: values.specialty,
    experienceYears: Number(values.experienceYears),
    consultationFee: Number(values.consultationFee),
    qualification: values.qualification,
    bio: values.bio,
    languages: parseLanguages(values.languages),
  };
}

export function toProfileValues(doctor: {
  specialty: string;
  experienceYears: number;
  consultationFee: number;
  qualification: string | null;
  bio: string | null;
  languages: string[];
}): ProfileValues {
  return {
    specialty: doctor.specialty,
    experienceYears: String(doctor.experienceYears),
    consultationFee: String(doctor.consultationFee),
    qualification: doctor.qualification ?? '',
    bio: doctor.bio ?? '',
    languages: doctor.languages.join(', '),
  };
}

export const EMPTY_PROFILE: ProfileValues = {
  specialty: '',
  experienceYears: '',
  consultationFee: '',
  qualification: '',
  bio: '',
  languages: '',
};
