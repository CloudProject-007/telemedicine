import { describe, expect, it } from 'vitest';
import {
  baseContentType,
  buildFileKey,
  patientKeyPrefix,
  sanitizeFileName,
} from '../../src/modules/documents/documents.utils';
import { PATIENT_ID } from '../helpers/fixtures';

describe('sanitizeFileName', () => {
  it('replaces unsafe characters', () => {
    expect(sanitizeFileName('My Report (final).pdf')).toBe('My_Report_final_.pdf');
  });

  it('neutralises path traversal', () => {
    const result = sanitizeFileName('../../etc/passwd');
    expect(result).toBe('etc_passwd');
    expect(result).not.toContain('/');
  });

  it('falls back to a default name', () => {
    expect(sanitizeFileName('???')).toBe('file');
  });

  it('caps the length while keeping the extension', () => {
    const result = sanitizeFileName(`${'a'.repeat(300)}.pdf`);
    expect(result.length).toBeLessThanOrEqual(100);
    expect(result.endsWith('.pdf')).toBe(true);
  });
});

describe('buildFileKey', () => {
  it('namespaces the key under the patient and makes it unique', () => {
    const a = buildFileKey(PATIENT_ID, 'scan.png');
    const b = buildFileKey(PATIENT_ID, 'scan.png');
    expect(a.startsWith(patientKeyPrefix(PATIENT_ID))).toBe(true);
    expect(a.endsWith('/scan.png')).toBe(true);
    expect(a).not.toBe(b);
  });
});

describe('baseContentType', () => {
  it('strips parameters and lowercases', () => {
    expect(baseContentType('Application/PDF; charset=binary')).toBe('application/pdf');
    expect(baseContentType(undefined)).toBeUndefined();
  });
});
