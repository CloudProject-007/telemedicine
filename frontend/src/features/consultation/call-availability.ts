import { addMinutes, isBefore } from 'date-fns';
import type { Appointment } from '@/types/api';

/** Same defaults as the backend (CALL_JOIN_EARLY_MINUTES, CALL_JOIN_LATE_MINUTES). */
export const CALL_OPENS_MINUTES_BEFORE = 15;
export const CALL_CLOSES_MINUTES_AFTER = 30;

export type CallAvailability =
  | { state: 'open' }
  | { state: 'early'; opensAt: Date }
  | { state: 'ended' }
  | { state: 'unavailable' };

/**
 * Whether the video call can be joined right now. This only decides what the screen shows: the
 * server checks the same rules again when someone joins, and its answer wins.
 */
export function getCallAvailability(
  appointment: Pick<Appointment, 'status' | 'scheduledStart' | 'scheduledEnd'>,
  now: Date,
): CallAvailability {
  if (appointment.status !== 'CONFIRMED') return { state: 'unavailable' };

  const opensAt = addMinutes(new Date(appointment.scheduledStart), -CALL_OPENS_MINUTES_BEFORE);
  const closesAt = addMinutes(new Date(appointment.scheduledEnd), CALL_CLOSES_MINUTES_AFTER);

  if (isBefore(now, opensAt)) return { state: 'early', opensAt };
  if (isBefore(closesAt, now)) return { state: 'ended' };
  return { state: 'open' };
}

/** Chat and prescriptions work once an appointment is confirmed, and stay readable afterwards. */
export function canUseRoom(status: Appointment['status']): boolean {
  return status === 'CONFIRMED' || status === 'COMPLETED';
}
