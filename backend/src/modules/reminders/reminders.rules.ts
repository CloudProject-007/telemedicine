import { z } from 'zod';
import { uuidSchema } from '../../shared/http/validation';
import type { ReminderKind } from '../notifications/notification-messages';

export const REMINDER_KINDS = ['24h', '1h'] as const satisfies readonly ReminderKind[];

const MINUTE_MS = 60_000;

/** How long before the start each reminder is sent. */
export const REMINDER_LEAD_MINUTES: Record<ReminderKind, number> = {
  '24h': 24 * 60,
  '1h': 60,
};

/** A reminder less than this far ahead is skipped: the schedule would be too close to create. */
const MIN_LEAD_TIME_MS = MINUTE_MS;

/** What EventBridge Scheduler puts on the queue. */
export const reminderPayloadSchema = z.object({
  appointmentId: uuidSchema,
  kind: z.enum(REMINDER_KINDS),
});
export type ReminderPayload = z.infer<typeof reminderPayloadSchema>;

export interface PlannedReminder {
  kind: ReminderKind;
  runAt: Date;
}

/** The reminders that still make sense for an appointment starting at `start`. */
export function planReminders(start: Date, now: Date): PlannedReminder[] {
  return REMINDER_KINDS.map((kind) => ({
    kind,
    runAt: new Date(start.getTime() - REMINDER_LEAD_MINUTES[kind] * MINUTE_MS),
  })).filter(({ runAt }) => runAt.getTime() - now.getTime() >= MIN_LEAD_TIME_MS);
}

/**
 * A schedule's name is made from the appointment and the kind, so it can be found again to cancel.
 * EventBridge allows letters, digits, "-", "_" and "." up to 64 characters (this is 45).
 */
export function reminderScheduleName(appointmentId: string, kind: ReminderKind): string {
  return `appt-${appointmentId}-${kind}`;
}
