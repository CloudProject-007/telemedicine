import { describe, expect, it } from 'vitest';
import { describeMediaError } from './media';

describe('describeMediaError', () => {
  it('explains a blocked camera and microphone', () => {
    expect(describeMediaError(new DOMException('denied', 'NotAllowedError'))).toMatch(/blocked/);
  });

  it('explains a camera used by another app', () => {
    expect(describeMediaError(new DOMException('busy', 'NotReadableError'))).toMatch(/another app/);
  });

  it('falls back to a general message', () => {
    expect(describeMediaError(new Error('boom'))).toMatch(/Could not start/);
  });
});
