import { z } from 'zod';
import { env } from '../../config/env';
import { paginationQuerySchema } from '../../shared/http/pagination';
import { uuidSchema } from '../../shared/http/validation';

export const ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const requestUploadUrlBodySchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  sizeBytes: z.number().int().positive().max(env.UPLOAD_MAX_BYTES),
});

export const registerDocumentBodySchema = z.object({
  fileKey: z.string().min(1).max(512),
  fileName: z.string().trim().min(1).max(200),
  appointmentId: uuidSchema.optional(),
});

export const listDocumentsQuerySchema = paginationQuerySchema.extend({
  /** Required for doctors (whose documents to view); ignored for patients. */
  patientId: uuidSchema.optional(),
});

export type RequestUploadUrlInput = z.infer<typeof requestUploadUrlBodySchema>;
export type RegisterDocumentInput = z.infer<typeof registerDocumentBodySchema>;
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;
