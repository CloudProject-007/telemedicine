import { describe, expect, it } from 'vitest';
import type { Prescription } from '@/types/consultation';
import {
  EMPTY_MEDICATION,
  prescriptionSchema,
  toPrescriptionInput,
  toPrescriptionValues,
} from './prescription-schema';

const medicine = {
  name: 'Paracetamol',
  dosage: '500 mg',
  frequency: 'Twice a day',
  durationDays: '5',
  instructions: '',
};
const valid = {
  diagnosis: '',
  notes: 'Rest and drink water.',
  medications: [medicine],
  followUpDate: '',
};

describe('prescriptionSchema', () => {
  it('accepts a prescription with one medicine', () => {
    expect(prescriptionSchema.safeParse(valid).success).toBe(true);
  });

  it('needs notes and at least one medicine', () => {
    expect(prescriptionSchema.safeParse({ ...valid, notes: ' ' }).success).toBe(false);
    expect(prescriptionSchema.safeParse({ ...valid, medications: [] }).success).toBe(false);
  });

  it.each(['0', '366', 'two', '1.5'])('rejects %s days', (durationDays) => {
    const result = prescriptionSchema.safeParse({
      ...valid,
      medications: [{ ...medicine, durationDays }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an incomplete medicine', () => {
    expect(
      prescriptionSchema.safeParse({ ...valid, medications: [EMPTY_MEDICATION] }).success,
    ).toBe(false);
  });

  it('rejects a follow-up date that is not a calendar day', () => {
    expect(prescriptionSchema.safeParse({ ...valid, followUpDate: '10/11/2026' }).success).toBe(
      false,
    );
  });
});

describe('toPrescriptionInput', () => {
  it('converts text fields and leaves out what was left empty', () => {
    const input = toPrescriptionInput(prescriptionSchema.parse(valid));
    expect(input.diagnosis).toBeUndefined();
    expect(input.followUpDate).toBeUndefined();
    expect(input.medications[0]).toMatchObject({ durationDays: 5, instructions: undefined });
  });

  it('anchors the follow-up day to local midnight', () => {
    const input = toPrescriptionInput(
      prescriptionSchema.parse({ ...valid, followUpDate: '2026-11-10' }),
    );
    expect(input.followUpDate).toBe(new Date(2026, 10, 10).toISOString());
  });
});

describe('toPrescriptionValues', () => {
  it('round-trips a saved prescription into form values', () => {
    const saved: Prescription = {
      id: 'p',
      appointmentId: 'a',
      diagnosis: null,
      notes: 'Rest',
      medications: [{ name: 'X', dosage: '1', frequency: 'daily', durationDays: 3 }],
      followUpDate: new Date(2026, 10, 10).toISOString(),
      hasPdf: true,
      createdAt: '2026-11-04T10:00:00Z',
      updatedAt: '2026-11-04T10:00:00Z',
    };
    expect(toPrescriptionValues(saved)).toMatchObject({
      diagnosis: '',
      followUpDate: '2026-11-10',
      medications: [{ durationDays: '3', instructions: '' }],
    });
  });
});
