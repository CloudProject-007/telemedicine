import { describe, expect, it } from 'vitest';
import type { Appointment } from '@/types/api';
import { canCancel, groupAppointments } from './appointments';

const now = new Date('2026-11-04T12:00:00');
const make = (
  id: string,
  status: Appointment['status'],
  start: string,
  end: string,
): Appointment => ({
  id,
  status,
  scheduledStart: start,
  scheduledEnd: end,
  reason: null,
  cancelledReason: null,
  createdAt: start,
  patient: { id: 'p', name: 'P' },
  doctor: { id: 'd', name: 'Dr. D', specialty: null },
});

describe('groupAppointments', () => {
  it('splits upcoming from past and orders each', () => {
    const { upcoming, past } = groupAppointments(
      [
        make('late', 'CONFIRMED', '2026-11-06T10:00:00', '2026-11-06T10:30:00'),
        make('soon', 'PENDING', '2026-11-05T10:00:00', '2026-11-05T10:30:00'),
        make('old', 'COMPLETED', '2026-11-01T10:00:00', '2026-11-01T10:30:00'),
        make('cancelled', 'CANCELLED', '2026-11-07T10:00:00', '2026-11-07T10:30:00'),
        make('older', 'COMPLETED', '2026-10-01T10:00:00', '2026-10-01T10:30:00'),
      ],
      now,
    );
    expect(upcoming.map((a) => a.id)).toEqual(['soon', 'late']);
    expect(past.map((a) => a.id)).toEqual(['cancelled', 'old', 'older']);
  });
});

describe('canCancel', () => {
  it('allows only active appointments that have not started', () => {
    expect(
      canCancel(make('a', 'CONFIRMED', '2026-11-05T10:00:00', '2026-11-05T10:30:00'), now),
    ).toBe(true);
    expect(
      canCancel(make('b', 'CONFIRMED', '2026-11-04T11:00:00', '2026-11-04T13:00:00'), now),
    ).toBe(false);
    expect(
      canCancel(make('c', 'CANCELLED', '2026-11-05T10:00:00', '2026-11-05T10:30:00'), now),
    ).toBe(false);
  });
});
