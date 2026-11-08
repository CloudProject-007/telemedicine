import { Role, type MedicalDocument } from '@prisma/client';
import { env } from '../../config/env';
import { createDownloadLink, getStorage } from '../../infrastructure/storage';
import { isPrismaError, prisma } from '../../infrastructure/prisma';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
} from '../../shared/errors/app-error';
import { buildPaginationMeta, toSkipTake, type Paginated } from '../../shared/http/pagination';
import type { AuthUser } from '../../shared/types/auth';
import { RELATIONSHIP_STATUSES } from '../appointments/appointments.rules';
import {
  ALLOWED_CONTENT_TYPES,
  type ListDocumentsQuery,
  type RegisterDocumentInput,
  type RequestUploadUrlInput,
} from './documents.schemas';
import { baseContentType, buildFileKey, patientKeyPrefix } from './documents.utils';

export interface DocumentDto {
  id: string;
  patientId: string;
  appointmentId: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: Date;
}

export interface UploadTicket {
  uploadUrl: string;
  fileKey: string;
  /** Headers the client must send with the PUT request. */
  headers: { 'Content-Type': string };
  expiresIn: number;
}

function toDocumentDto(document: MedicalDocument): DocumentDto {
  return {
    id: document.id,
    patientId: document.patientId,
    appointmentId: document.appointmentId,
    fileName: document.fileName,
    contentType: document.contentType,
    sizeBytes: document.sizeBytes,
    createdAt: document.createdAt,
  };
}

/** A doctor may see a patient's files only while they share a confirmed/completed appointment. */
async function doctorHasRelationship(doctorId: string, patientId: string): Promise<boolean> {
  const count = await prisma.appointment.count({
    where: { doctorId, patientId, status: { in: [...RELATIONSHIP_STATUSES] } },
  });
  return count > 0;
}

async function assertCanAccessPatientDocuments(user: AuthUser, patientId: string): Promise<void> {
  if (user.role === Role.PATIENT && user.id === patientId) {
    return;
  }
  if (user.role === Role.DOCTOR && (await doctorHasRelationship(user.id, patientId))) {
    return;
  }
  throw new ForbiddenError('You do not have access to these documents');
}

/** Step 1 of 2: the client uploads straight to S3 with this short-lived URL. */
export async function createUploadTicket(
  patient: AuthUser,
  input: RequestUploadUrlInput,
): Promise<UploadTicket> {
  const fileKey = buildFileKey(patient.id, input.fileName);
  const uploadUrl = await getStorage().createUploadUrl({
    key: fileKey,
    contentType: input.contentType,
    expiresInSeconds: env.UPLOAD_URL_TTL_SECONDS,
  });
  return {
    uploadUrl,
    fileKey,
    headers: { 'Content-Type': input.contentType },
    expiresIn: env.UPLOAD_URL_TTL_SECONDS,
  };
}

/** Step 2 of 2: after uploading, the client registers the file so it shows up in their records. */
export async function registerDocument(
  patient: AuthUser,
  input: RegisterDocumentInput,
): Promise<DocumentDto> {
  if (!input.fileKey.startsWith(patientKeyPrefix(patient.id))) {
    throw new ForbiddenError('This file does not belong to you');
  }

  if (input.appointmentId) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: input.appointmentId, patientId: patient.id },
      select: { id: true },
    });
    if (!appointment) {
      throw new NotFoundError('Appointment');
    }
  }

  const storage = getStorage();
  const info = await storage.getObjectInfo(input.fileKey);
  if (!info) {
    throw new UnprocessableError('File not found in storage. Upload it before registering it.');
  }

  const contentType = baseContentType(info.contentType);
  const typeAllowed = ALLOWED_CONTENT_TYPES.some((allowed) => allowed === contentType);
  if (info.sizeBytes > env.UPLOAD_MAX_BYTES || !typeAllowed || !contentType) {
    // The signed URL cannot enforce size, so reject and clean up here.
    await storage.deleteObject(input.fileKey);
    throw new UnprocessableError(
      `File must be one of ${ALLOWED_CONTENT_TYPES.join(', ')} and at most ${env.UPLOAD_MAX_BYTES} bytes`,
    );
  }

  try {
    const document = await prisma.medicalDocument.create({
      data: {
        patientId: patient.id,
        appointmentId: input.appointmentId ?? null,
        fileKey: input.fileKey,
        fileName: input.fileName,
        contentType,
        sizeBytes: info.sizeBytes,
      },
    });
    return toDocumentDto(document);
  } catch (error) {
    if (isPrismaError(error, 'P2002')) {
      throw new ConflictError('This file has already been registered');
    }
    throw error;
  }
}

export async function listDocuments(
  user: AuthUser,
  query: ListDocumentsQuery,
): Promise<Paginated<DocumentDto>> {
  const patientId = user.role === Role.PATIENT ? user.id : query.patientId;
  if (!patientId) {
    throw new UnprocessableError('patientId is required');
  }
  await assertCanAccessPatientDocuments(user, patientId);

  const where = { patientId };
  const [total, rows] = await prisma.$transaction([
    prisma.medicalDocument.count({ where }),
    prisma.medicalDocument.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      ...toSkipTake(query),
    }),
  ]);
  return { items: rows.map(toDocumentDto), meta: buildPaginationMeta(query, total) };
}

export async function createDownloadUrl(
  user: AuthUser,
  documentId: string,
): Promise<{ url: string; expiresIn: number }> {
  const document = await prisma.medicalDocument.findUnique({ where: { id: documentId } });
  if (!document) {
    throw new NotFoundError('Document');
  }
  try {
    await assertCanAccessPatientDocuments(user, document.patientId);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      throw new NotFoundError('Document'); // do not reveal that the document exists
    }
    throw error;
  }

  const url = await createDownloadLink({
    key: document.fileKey,
    fileName: document.fileName,
    expiresInSeconds: env.DOWNLOAD_URL_TTL_SECONDS,
  });
  return { url, expiresIn: env.DOWNLOAD_URL_TTL_SECONDS };
}

export async function deleteDocument(patient: AuthUser, documentId: string): Promise<void> {
  const document = await prisma.medicalDocument.findFirst({
    where: { id: documentId, patientId: patient.id },
  });
  if (!document) {
    throw new NotFoundError('Document');
  }
  await prisma.medicalDocument.delete({ where: { id: document.id } });
  // Best effort: an orphaned object is harmless, a dangling DB row is not.
  await getStorage().deleteObject(document.fileKey);
}
