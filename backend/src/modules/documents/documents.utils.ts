import { randomUUID } from 'node:crypto';

const MAX_FILE_NAME_LENGTH = 100;

/** Keeps letters, digits, dot, dash and underscore so the name is safe inside an object key. */
export function sanitizeFileName(fileName: string): string {
  const cleaned = fileName
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[._]+/, '')
    .slice(-MAX_FILE_NAME_LENGTH);
  return cleaned.length > 0 ? cleaned : 'file';
}

/** Every patient's files live under their own prefix, which is what ownership checks rely on. */
export function patientKeyPrefix(patientId: string): string {
  return `patients/${patientId}/`;
}

export function buildFileKey(patientId: string, fileName: string): string {
  return `${patientKeyPrefix(patientId)}${randomUUID()}/${sanitizeFileName(fileName)}`;
}

/** "application/pdf; charset=binary" -> "application/pdf" */
export function baseContentType(contentType: string | undefined): string | undefined {
  return contentType?.split(';')[0]?.trim().toLowerCase();
}
