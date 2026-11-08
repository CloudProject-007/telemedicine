import type { Prisma, Prescription } from '@prisma/client';
import { env } from '../../config/env';
import { logger } from '../../infrastructure/logger';
import { prisma } from '../../infrastructure/prisma';
import { createDownloadLink, getStorage } from '../../infrastructure/storage';
import { ForbiddenError, NotFoundError, UnprocessableError } from '../../shared/errors/app-error';
import type { AuthUser } from '../../shared/types/auth';
import { loadAppointmentForParticipant } from '../appointments/appointment-access';
import { PRESCRIPTION_STATUSES } from '../appointments/appointments.rules';
import { buildPrescriptionMessage } from '../notifications/notification-messages';
import { notifyUser } from '../notifications/notifications.service';
import { renderPrescriptionPdf } from './prescription-pdf';
import {
  medicationSchema,
  type Medication,
  type UpsertPrescriptionInput,
} from './prescriptions.schemas';

export interface PrescriptionDto {
  id: string;
  appointmentId: string;
  diagnosis: string | null;
  notes: string;
  medications: Medication[];
  followUpDate: Date | null;
  /** True once the PDF is stored and can be downloaded. */
  hasPdf: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toPrescriptionDto(prescription: Prescription): PrescriptionDto {
  return {
    id: prescription.id,
    appointmentId: prescription.appointmentId,
    diagnosis: prescription.diagnosis,
    notes: prescription.notes,
    medications: medicationSchema.array().parse(prescription.medications),
    followUpDate: prescription.followUpDate,
    hasPdf: prescription.pdfKey !== null,
    createdAt: prescription.createdAt,
    updatedAt: prescription.updatedAt,
  };
}

/** Creates or replaces the prescription for an appointment. Only that appointment's doctor. */
export async function upsertPrescription(
  doctor: AuthUser,
  appointmentId: string,
  input: UpsertPrescriptionInput,
): Promise<PrescriptionDto> {
  const appointment = await loadAppointmentForParticipant(doctor, appointmentId);
  if (appointment.doctorId !== doctor.id) {
    throw new ForbiddenError('Only the treating doctor can write a prescription');
  }
  if (!PRESCRIPTION_STATUSES.includes(appointment.status)) {
    throw new UnprocessableError(
      'A prescription can only be written for a confirmed or completed appointment',
    );
  }

  const existing = await prisma.prescription.findUnique({
    where: { appointmentId },
    select: { id: true },
  });

  const medications = input.medications as Prisma.InputJsonValue;
  const saved = await prisma.prescription.upsert({
    where: { appointmentId },
    create: {
      appointmentId,
      diagnosis: input.diagnosis ?? null,
      notes: input.notes,
      medications,
      followUpDate: input.followUpDate ?? null,
    },
    update: {
      diagnosis: input.diagnosis ?? null,
      notes: input.notes,
      medications,
      followUpDate: input.followUpDate ?? null,
    },
  });

  // The prescription is saved at this point. The PDF and the message are extras: if either fails,
  // the doctor's work is not lost, and the PDF is created on first download instead.
  const parties = await loadParties(appointmentId);

  let current = saved;
  try {
    if (!parties) throw new NotFoundError('Appointment');
    current = await publishPrescriptionPdf(saved, parties);
  } catch (error) {
    logger.error({ err: error, appointmentId }, 'Could not create the prescription PDF');
  }

  void notifyUser(
    appointment.patientId,
    buildPrescriptionMessage({
      appointmentId,
      doctorName: parties?.doctorName ?? 'Your doctor',
      updated: existing !== null,
      appUrl: env.APP_URL,
      timeZone: env.NOTIFICATION_TIMEZONE,
    }),
  );

  return toPrescriptionDto(current);
}

interface Parties {
  doctorName: string;
  doctorSpecialty: string | null;
  doctorQualification: string | null;
  patientName: string;
  scheduledStart: Date;
}

async function loadParties(appointmentId: string): Promise<Parties | null> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { select: { name: true } },
      doctor: {
        select: { name: true, doctorProfile: { select: { specialty: true, qualification: true } } },
      },
    },
  });
  if (!appointment) return null;
  return {
    doctorName: appointment.doctor.name,
    doctorSpecialty: appointment.doctor.doctorProfile?.specialty ?? null,
    doctorQualification: appointment.doctor.doctorProfile?.qualification ?? null,
    patientName: appointment.patient.name,
    scheduledStart: appointment.scheduledStart,
  };
}

/**
 * Draws the prescription as a PDF, stores it in S3 and records where. The file name includes the
 * time of the last edit: a new name for every version means CloudFront can never serve an old copy
 * from its cache, and the previous version can simply be removed.
 */
async function publishPrescriptionPdf(
  prescription: Prescription,
  parties: Parties,
): Promise<Prescription> {
  const pdf = await renderPrescriptionPdf({
    ...parties,
    appointmentStart: parties.scheduledStart,
    issuedAt: prescription.updatedAt,
    diagnosis: prescription.diagnosis,
    notes: prescription.notes,
    medications: medicationSchema.array().parse(prescription.medications),
    followUpDate: prescription.followUpDate,
    timeZone: env.NOTIFICATION_TIMEZONE,
  });

  const storage = getStorage();
  const key = `prescriptions/${prescription.appointmentId}/${prescription.id}/${prescription.updatedAt.getTime()}.pdf`;
  await storage.putObject({ key, body: pdf, contentType: 'application/pdf' });

  const updated = await prisma.prescription.update({
    where: { id: prescription.id },
    data: { pdfKey: key, pdfGeneratedAt: new Date() },
  });

  if (prescription.pdfKey && prescription.pdfKey !== key) {
    // Best effort: an orphaned old version is harmless.
    storage.deleteObject(prescription.pdfKey).catch((error: unknown) => {
      logger.warn({ err: error, key: prescription.pdfKey }, 'Could not remove the old PDF');
    });
  }
  return updated;
}

/** A short-lived link to the PDF. Creates it first if the prescription does not have one yet. */
export async function getPrescriptionPdfLink(
  user: AuthUser,
  appointmentId: string,
): Promise<{ url: string; expiresIn: number }> {
  await loadAppointmentForParticipant(user, appointmentId);

  let prescription = await prisma.prescription.findUnique({ where: { appointmentId } });
  if (!prescription) {
    throw new NotFoundError('Prescription');
  }
  if (!prescription.pdfKey) {
    const parties = await loadParties(appointmentId);
    if (!parties) {
      throw new NotFoundError('Appointment');
    }
    prescription = await publishPrescriptionPdf(prescription, parties);
  }
  if (!prescription.pdfKey) {
    throw new UnprocessableError('The PDF could not be created');
  }

  const url = await createDownloadLink({
    key: prescription.pdfKey,
    fileName: 'prescription.pdf',
    expiresInSeconds: env.DOWNLOAD_URL_TTL_SECONDS,
  });
  return { url, expiresIn: env.DOWNLOAD_URL_TTL_SECONDS };
}

export async function getPrescription(
  user: AuthUser,
  appointmentId: string,
): Promise<PrescriptionDto> {
  await loadAppointmentForParticipant(user, appointmentId);
  const prescription = await prisma.prescription.findUnique({ where: { appointmentId } });
  if (!prescription) {
    throw new NotFoundError('Prescription');
  }
  return toPrescriptionDto(prescription);
}
