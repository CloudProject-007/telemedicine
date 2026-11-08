/** Mirrors what the server accepts, so a bad file is turned away before any upload starts. */
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const DOCUMENT_ACCEPT = ALLOWED_DOCUMENT_TYPES.join(',');

export type AllowedDocumentType = (typeof ALLOWED_DOCUMENT_TYPES)[number];

export function isAllowedDocumentType(type: string): type is AllowedDocumentType {
  return (ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(type);
}

/** Returns a message the person can act on, or null when the file is fine. */
export function validateDocumentFile(file: { type: string; size: number }): string | null {
  if (!isAllowedDocumentType(file.type)) {
    return 'Choose a PDF, JPG, PNG or WebP file.';
  }
  if (file.size === 0) {
    return 'This file is empty.';
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return `This file is too large. The limit is ${formatFileSize(MAX_DOCUMENT_BYTES)}.`;
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
