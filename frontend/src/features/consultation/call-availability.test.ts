import { describe, expect, it } from 'vitest';
import { canUseRoom, getCallAvailability } from './call-availability';

const appointment = {
  status: 'CONFIRMED' as const,
  scheduledStart: new Date(2026, 10, 4, 10, 0).toISOString(),
  scheduledEnd: new Date(2026, 10, 4, 10, 30).toISOString(),
};
const at = (hour: number, minute: number) => new Date(2026, 10, 4, hour, minute);

describe('getCallAvailability', () => {
  it('is early until 15 minutes before the start', () => {
    const result = getCallAvailability(appointment, at(9, 44));
    expect(result).toEqual({ state: 'early', opensAt: at(9, 45) });
  });

  it('opens 15 minutes before the start', () => {
    expect(getCallAvailability(appointment, at(9, 45)).state).toBe('open');
  });

  it('stays open for 30 minutes after the end', () => {
    expect(getCallAvailability(appointment, at(11, 0)).state).toBe('open');
    expect(getCallAvailability(appointment, at(11, 1)).state).toBe('ended');
  });

  it.each(['PENDING', 'COMPLETED', 'CANCELLED'] as const)('is unavailable when %s', (status) => {
    expect(getCallAvailability({ ...appointment, status }, at(10, 5)).state).toBe('unavailable');
  });
});

describe('canUseRoom', () => {
  it('allows confirmed and completed visits only', () => {
    expect(canUseRoom('CONFIRMED')).toBe(true);
    expect(canUseRoom('COMPLETED')).toBe(true);
    expect(canUseRoom('PENDING')).toBe(false);
    expect(canUseRoom('CANCELLED')).toBe(false);
  });
});
