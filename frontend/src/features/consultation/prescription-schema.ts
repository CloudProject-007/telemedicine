import { format } from 'date-fns';
import { z } from 'zod';
import { wholeNumber } from '@/lib/validation';
import type { Prescription, PrescriptionInput } from '@/types/consultation';

/**
 * Limits mirror backend/src/modules/prescriptions. Numbers and the follow-up date are kept as
 * text while editing and converted on submit, so form values and schema output are one type.
 */
const medicationSchema = z.object({
  name: z.string().trim().min(1, 'Enter the medicine name').max(120, 'Use 120 characters or fewer'),
  dosage: z.string().trim().min(1, 'Enter the dosage').max(60, 'Use 60 characters or fewer'),
  frequency: z.string().trim().min(1, 'Enter how often').max(60, 'Use 60 characters or fewer'),
  durationDays: wholeNumber('Days', 365, 1),
  instructions: z.string().trim().max(300, 'Use 300 characters or fewer'),
});

export const prescriptionSchema = z.object({
  diagnosis: z.string().trim().max(500, 'Use 500 characters or fewer'),
  notes: z
    .string()
    .trim()
    .min(1, 'Add notes for the patient')
    .max(2000, 'Use 2000 characters or fewer'),
  medications: z
    .array(medicationSchema)
    .min(1, 'Add at least one medicine')
    .max(20, 'Add at most 20 medicines'),
  followUpDate: z
    .string()
    .refine((value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Enter a valid date'),
});

export type PrescriptionValues = z.infer<typeof prescriptionSchema>;
export type MedicationValues = PrescriptionValues['medications'][number];

export const EMPTY_MEDICATION: MedicationValues = {
  name: '',
  dosage: '',
  frequency: '',
  durationDays: '',
  instructions: '',
};

export const EMPTY_PRESCRIPTION: PrescriptionValues = {
  diagnosis: '',
  notes: '',
  medications: [EMPTY_MEDICATION],
  followUpDate: '',
};

/** "2026-11-10" is a calendar day, so anchor it to local midnight rather than UTC midnight. */
function localDayToIso(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, date ?? 1).toISOString();
}

export function toPrescriptionInput(values: PrescriptionValues): PrescriptionInput {
  return {
    diagnosis: values.diagnosis || undefined,
    notes: values.notes,
    medications: values.medications.map((medication) => ({
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      durationDays: Number(medication.durationDays),
      instructions: medication.instructions || undefined,
    })),
    followUpDate: values.followUpDate ? localDayToIso(values.followUpDate) : undefined,
  };
}

export function toPrescriptionValues(prescription: Prescription): PrescriptionValues {
  return {
    diagnosis: prescription.diagnosis ?? '',
    notes: prescription.notes,
    medications: prescription.medications.map((medication) => ({
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      durationDays: String(medication.durationDays),
      instructions: medication.instructions ?? '',
    })),
    followUpDate: prescription.followUpDate
      ? format(new Date(prescription.followUpDate), 'yyyy-MM-dd')
      : '',
  };
}
