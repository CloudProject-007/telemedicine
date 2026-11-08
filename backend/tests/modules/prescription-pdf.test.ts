import { describe, expect, it } from 'vitest';
import {
  renderPrescriptionPdf,
  toPdfText,
  type PrescriptionPdfData,
} from '../../src/modules/prescriptions/prescription-pdf';

const data: PrescriptionPdfData = {
  doctorName: 'Dr Anita Sharma',
  doctorSpecialty: 'Cardiology',
  doctorQualification: 'MBBS, MD',
  patientName: 'Asha Rao',
  appointmentStart: new Date('2026-11-07T05:00:00.000Z'),
  issuedAt: new Date('2026-11-07T05:40:00.000Z'),
  diagnosis: 'Seasonal flu',
  notes: 'Rest and drink plenty of water.',
  medications: [
    { name: 'Paracetamol', dosage: '500 mg', frequency: 'Twice a day', durationDays: 5 },
    {
      name: 'Cetirizine',
      dosage: '10 mg',
      frequency: 'Once at night',
      durationDays: 1,
      instructions: 'After food',
    },
  ],
  followUpDate: new Date('2026-11-14T00:00:00.000Z'),
  timeZone: 'Asia/Kolkata',
};

describe('renderPrescriptionPdf', () => {
  it('produces a PDF file', async () => {
    const pdf = await renderPrescriptionPdf(data);
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it('still renders when the optional parts are missing', async () => {
    const pdf = await renderPrescriptionPdf({
      ...data,
      diagnosis: null,
      followUpDate: null,
      doctorSpecialty: null,
      doctorQualification: null,
    });
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('copes with a long list of medicines across pages', async () => {
    const many = Array.from({ length: 20 }, (_, index) => ({
      name: `Medicine ${index + 1}`,
      dosage: '1 tablet',
      frequency: 'Daily',
      durationDays: 7,
      instructions: 'x'.repeat(200),
    }));
    const pdf = await renderPrescriptionPdf({ ...data, medications: many });
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });
});

describe('toPdfText', () => {
  it('keeps Latin text, including accents', () => {
    expect(toPdfText('José Müller')).toBe('José Müller');
  });

  it('replaces characters the built-in font cannot draw', () => {
    expect(toPdfText('Anita अनीता')).toBe('Anita ?????');
  });
});
