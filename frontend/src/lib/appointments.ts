import type { Appointment, AppointmentStatus } from '@/types/api';

export interface AppointmentGroups {
  upcoming: Appointment[];
  past: Appointment[];
}

const ACTIVE: ReadonlySet<AppointmentStatus> = new Set(['PENDING', 'CONFIRMED']);

/** Upcoming = still active and not yet over, soonest first. Everything else is past, newest first. */
export function groupAppointments(items: Appointment[], now: Date = new Date()): AppointmentGroups {
  const upcoming: Appointment[] = [];
  const past: Appointment[] = [];

  for (const item of items) {
    const isUpcoming = ACTIVE.has(item.status) && new Date(item.scheduledEnd) > now;
    (isUpcoming ? upcoming : past).push(item);
  }

  const start = (a: Appointment) => new Date(a.scheduledStart).getTime();
  upcoming.sort((a, b) => start(a) - start(b));
  past.sort((a, b) => start(b) - start(a));
  return { upcoming, past };
}

export function canCancel(item: Appointment, now: Date = new Date()): boolean {
  return ACTIVE.has(item.status) && new Date(item.scheduledStart) > now;
}
