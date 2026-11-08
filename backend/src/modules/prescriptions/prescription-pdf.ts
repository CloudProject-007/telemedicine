import PDFDocument from 'pdfkit';
import { formatDate, formatDateTime } from '../../shared/format/date-time';
import type { Medication } from './prescriptions.schemas';

export interface PrescriptionPdfData {
  doctorName: string;
  doctorSpecialty: string | null;
  doctorQualification: string | null;
  patientName: string;
  appointmentStart: Date;
  issuedAt: Date;
  diagnosis: string | null;
  notes: string;
  medications: Medication[];
  followUpDate: Date | null;
  timeZone: string;
}

/**
 * The built-in PDF fonts cover Latin-1 only. Anything outside it (Devanagari, emoji) would print
 * as garbage, so it becomes "?" instead. Embedding a Unicode font is the fix if names need it.
 */
export function toPdfText(text: string): string {
  return [...text.normalize('NFC')]
    .map((char) => ((char.codePointAt(0) ?? 0) > 0xff ? '?' : char))
    .join('');
}

const MARGIN = 50;
const INK = '#17212b';
const MUTED = '#5b6672';
const ACCENT = '#0f6e6e';

/** Draws the prescription and returns the finished file. The document is small, so it stays in memory. */
export function renderPrescriptionPdf(data: PrescriptionPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGIN,
      info: {
        Title: `Prescription for ${toPdfText(data.patientName)}`,
        Author: toPdfText(data.doctorName),
        Producer: 'TeleCare',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const heading = (text: string): void => {
      doc.moveDown(1).font('Helvetica-Bold').fontSize(11).fillColor(ACCENT).text(text);
      doc.moveDown(0.3).font('Helvetica').fontSize(11).fillColor(INK);
    };

    // Letterhead
    doc.font('Helvetica-Bold').fontSize(20).fillColor(ACCENT).text('TeleCare');
    doc.font('Helvetica').fontSize(10).fillColor(MUTED).text('Prescription');
    doc
      .moveTo(MARGIN, doc.y + 8)
      .lineTo(doc.page.width - MARGIN, doc.y + 8)
      .strokeColor(ACCENT)
      .lineWidth(1)
      .stroke();
    doc.moveDown(1.5);

    // Doctor and patient
    doc.font('Helvetica-Bold').fontSize(13).fillColor(INK).text(toPdfText(data.doctorName));
    const credentials = [data.doctorSpecialty, data.doctorQualification].filter(Boolean).join(', ');
    if (credentials)
      doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(toPdfText(credentials));

    doc.moveDown(0.8).font('Helvetica').fontSize(11).fillColor(INK);
    doc.text(`Patient: ${toPdfText(data.patientName)}`);
    doc.text(`Visit: ${formatDateTime(data.appointmentStart, data.timeZone)}`);
    doc.text(`Issued: ${formatDateTime(data.issuedAt, data.timeZone)}`);

    if (data.diagnosis) {
      heading('Diagnosis');
      doc.text(toPdfText(data.diagnosis));
    }

    heading('Medicines');
    data.medications.forEach((medication, index) => {
      const days = medication.durationDays === 1 ? 'day' : 'days';
      doc.font('Helvetica-Bold').text(`${index + 1}. ${toPdfText(medication.name)}`);
      doc
        .font('Helvetica')
        .fillColor(MUTED)
        .text(
          `${toPdfText(medication.dosage)}, ${toPdfText(medication.frequency)}, for ${medication.durationDays} ${days}`,
          { indent: 16 },
        );
      if (medication.instructions) {
        doc.text(toPdfText(medication.instructions), { indent: 16 });
      }
      doc.fillColor(INK).moveDown(0.4);
    });

    heading('Notes');
    doc.text(toPdfText(data.notes));

    if (data.followUpDate) {
      heading('Follow-up');
      doc.text(formatDate(data.followUpDate, data.timeZone));
    }

    doc
      .moveDown(2)
      .font('Helvetica-Oblique')
      .fontSize(8)
      .fillColor(MUTED)
      .text(
        'Generated electronically by TeleCare. This prescription is valid only for the patient named above.',
        { align: 'center' },
      );

    doc.end();
  });
}
