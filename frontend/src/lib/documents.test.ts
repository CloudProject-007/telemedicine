import { describe, expect, it } from 'vitest';
import { formatFileSize, validateDocumentFile } from './documents';

describe('validateDocumentFile', () => {
  it('accepts a PDF and common image types', () => {
    for (const type of ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']) {
      expect(validateDocumentFile({ type, size: 1000 })).toBeNull();
    }
  });

  it('turns away other file types', () => {
    expect(validateDocumentFile({ type: 'application/zip', size: 1000 })).toMatch(/PDF/);
    expect(validateDocumentFile({ type: '', size: 1000 })).toMatch(/PDF/);
  });

  it('turns away empty and oversized files', () => {
    expect(validateDocumentFile({ type: 'application/pdf', size: 0 })).toMatch(/empty/);
    expect(validateDocumentFile({ type: 'application/pdf', size: 11 * 1024 * 1024 })).toMatch(
      /10\.0 MB/,
    );
  });

  it('accepts a file exactly at the limit', () => {
    expect(validateDocumentFile({ type: 'image/png', size: 10 * 1024 * 1024 })).toBeNull();
  });
});

describe('formatFileSize', () => {
  it('uses the unit that reads best', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2 KB');
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });
});
