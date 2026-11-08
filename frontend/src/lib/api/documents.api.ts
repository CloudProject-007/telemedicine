import type { Paginated } from '@/types/api';
import type { DownloadLink, MedicalDocument, UploadTicket } from '@/types/documents';
import { ApiError, apiList, apiRequest } from './client';

const PAGE_SIZE = 10;

export interface DocumentSearch {
  page: number;
  /** Doctors must say whose records they are opening. Patients leave it out. */
  patientId?: string | undefined;
}

export const documentsApi = {
  list: (
    { page, patientId }: DocumentSearch,
    signal?: AbortSignal,
  ): Promise<Paginated<MedicalDocument>> =>
    apiList<MedicalDocument>('/documents', {
      query: { page, limit: PAGE_SIZE, patientId },
      signal,
    }),

  uploadTicket: (file: { name: string; type: string; size: number }) =>
    apiRequest<UploadTicket>('/documents/upload-url', {
      method: 'POST',
      body: { fileName: file.name, contentType: file.type, sizeBytes: file.size },
    }),

  register: (input: { fileKey: string; fileName: string; appointmentId?: string | undefined }) =>
    apiRequest<MedicalDocument>('/documents', { method: 'POST', body: input }),

  downloadLink: (id: string) => apiRequest<DownloadLink>(`/documents/${id}/download-url`),

  remove: (id: string) => apiRequest<void>(`/documents/${id}`, { method: 'DELETE' }),
};

/**
 * Sends the file straight to S3 with the pre-signed URL, so it never passes through our server.
 * This is a plain fetch (no auth header): the signature in the URL is the credential.
 */
export async function uploadToS3(ticket: UploadTicket, file: File): Promise<void> {
  let response: Response;
  try {
    response = await fetch(ticket.uploadUrl, {
      method: 'PUT',
      headers: ticket.headers,
      body: file,
    });
  } catch {
    // The browser hides the reason, but a blocked cross-origin PUT is the usual cause.
    throw new ApiError(
      0,
      'UPLOAD_FAILED',
      'The upload could not reach storage. Check your connection and try again.',
    );
  }
  if (!response.ok) {
    throw new ApiError(
      response.status,
      'UPLOAD_FAILED',
      response.status === 403
        ? 'The upload link expired. Try again.'
        : 'The upload failed. Try again.',
    );
  }
}
