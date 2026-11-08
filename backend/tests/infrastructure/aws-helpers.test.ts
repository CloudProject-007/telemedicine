import { describe, expect, it } from 'vitest';
import { encodeObjectPath, normalizePrivateKey } from '../../src/infrastructure/cdn/cloudfront';
import { toAtExpression } from '../../src/infrastructure/scheduler/eventbridge.scheduler';
import { toSnsSubject } from '../../src/infrastructure/notifications/sns.notifier';

describe('toAtExpression', () => {
  it('formats a time the way EventBridge Scheduler expects, in UTC', () => {
    expect(toAtExpression(new Date('2026-11-07T04:30:15.789Z'))).toBe('at(2026-11-07T04:30:15)');
  });
});

describe('toSnsSubject', () => {
  it('puts the subject on one line', () => {
    expect(toSnsSubject('Your\nprescription   is ready')).toBe('Your prescription is ready');
  });

  it('cuts a subject at 100 characters', () => {
    expect(toSnsSubject('a'.repeat(150))).toHaveLength(100);
  });
});

describe('encodeObjectPath', () => {
  it('encodes each part but keeps the slashes', () => {
    expect(encodeObjectPath('patients/abc/file name+1.pdf')).toBe(
      'patients/abc/file%20name%2B1.pdf',
    );
  });
});

describe('normalizePrivateKey', () => {
  it('turns escaped line breaks into real ones', () => {
    expect(normalizePrivateKey('-----BEGIN-----\\nabc\\n-----END-----')).toBe(
      '-----BEGIN-----\nabc\n-----END-----',
    );
  });
});
