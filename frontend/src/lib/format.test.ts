import { describe, expect, it } from 'vitest';
import { getInitials } from './format';

describe('getInitials', () => {
  it('skips the Dr. prefix', () => {
    expect(getInitials('Dr. Anita Sharma')).toBe('AS');
  });
  it('handles a single name', () => {
    expect(getInitials('Anita')).toBe('A');
  });
});
