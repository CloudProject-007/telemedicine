export interface MedicalDocument {
  id: string;
  patientId: string;
  appointmentId: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface UploadTicket {
  uploadUrl: string;
  fileKey: string;
  /** Headers that must be sent with the PUT, or S3 rejects the signature. */
  headers: Record<string, string>;
  expiresIn: number;
}

export interface DownloadLink {
  url: string;
  expiresIn: number;
}
