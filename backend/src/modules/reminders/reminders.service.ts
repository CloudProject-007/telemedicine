import { AppointmentStatus } from '@prisma/client';
import { env } from '../../config/env';
import { logger } from '../../infrastructure/logger';
import { isPrismaError, prisma } from '../../infrastructure/prisma';
import { getScheduler } from '../../infrastructure/scheduler';
import { buildReminderMessage } from '../notifications/notification-messages';
import { notifyUser } from '../notifications/notifications.service';
import {
  REMINDER_KINDS,
  planReminders,
  reminderScheduleName,
  type ReminderPayload,
} from './reminders.rules';

export type DispatchResult = 'sent' | 'skipped';

/**
 * Creates the one-time schedules for a confirmed appointment. Never throws: if AWS is
 * unreachable the appointment is still confirmed, and the problem is logged.
 */
export async function scheduleAppointmentReminders(
  appointment: { id: string; scheduledStart: Date },
  now: Date = new Date(),
): Promise<void> {
  const scheduler = getScheduler();

  const results = await Promise.allSettled(
    planReminders(appointment.scheduledStart, now).map(({ kind, runAt }) => {
      const payload: ReminderPayload = { appointmentId: appointment.id, kind };
      return scheduler.schedule({
        name: reminderScheduleName(appointment.id, kind),
        runAt,
        payload,
      });
    }),
  );

  for (const result of results) {
    if (result.status === 'rejected') {
      logger.error(
        { err: result.reason, appointmentId: appointment.id },
        'Could not schedule a reminder',
      );
    }
  }
}

/** Removes the schedules that have not run yet. Never throws. */
export async function cancelAppointmentReminders(appointmentId: string): Promise<void> {
  const scheduler = getScheduler();

  const results = await Promise.allSettled(
    REMINDER_KINDS.map((kind) => scheduler.cancel(reminderScheduleName(appointmentId, kind))),
  );

  for (const result of results) {
    if (result.status === 'rejected') {
      logger.error({ err: result.reason, appointmentId }, 'Could not cancel a reminder');
    }
  }
}

/**
 * Runs when a schedule fires. It checks the appointment again instead of trusting the schedule,
 * because the appointment may have been cancelled in a way that missed the cancellation, and the
 * queue can deliver the same message twice.
 */
export async function dispatchReminder(
  payload: ReminderPayload,
  now: Date = new Date(),
): Promise<DispatchResult> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: payload.appointmentId },
    include: {
      patient: { select: { id: true, name: true } },
      doctor: { select: { id: true, name: true } },
    },
  });

  if (
    !appointment ||
    appointment.status !== AppointmentStatus.CONFIRMED ||
    appointment.scheduledStart.getTime() <= now.getTime()
  ) {
    return 'skipped';
  }

  const alreadySent = await prisma.reminderLog.findUnique({
    where: {
      appointmentId_kind: { appointmentId: appointment.id, kind: payload.kind },
    },
  });
  if (alreadySent) return 'skipped';

  const common = {
    kind: payload.kind,
    appointmentId: appointment.id,
    start: appointment.scheduledStart,
    appUrl: env.APP_URL,
    timeZone: env.NOTIFICATION_TIMEZONE,
  };
  await Promise.all([
    notifyUser(
      appointment.patient.id,
      buildReminderMessage({ ...common, otherName: appointment.doctor.name }),
    ),
    notifyUser(
      appointment.doctor.id,
      buildReminderMessage({ ...common, otherName: appointment.patient.name }),
    ),
  ]);

  try {
    await prisma.reminderLog.create({
      data: { appointmentId: appointment.id, kind: payload.kind },
    });
  } catch (error) {
    if (!isPrismaError(error, 'P2002')) throw error; // a concurrent duplicate already recorded it
  }
  return 'sent';
}
