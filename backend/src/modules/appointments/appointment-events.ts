import { env } from '../../config/env';
import { logger } from '../../infrastructure/logger';
import { prisma } from '../../infrastructure/prisma';
import {
  buildCancelledMessage,
  buildConfirmedMessage,
} from '../notifications/notification-messages';
import { notifyUser } from '../notifications/notifications.service';
import {
  cancelAppointmentReminders,
  scheduleAppointmentReminders,
} from '../reminders/reminders.service';

interface AppointmentRef {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledStart: Date;
}

const context = () => ({ appUrl: env.APP_URL, timeZone: env.NOTIFICATION_TIMEZONE });

async function loadNames(appointment: AppointmentRef): Promise<Map<string, string>> {
  const users = await prisma.user.findMany({
    where: { id: { in: [appointment.patientId, appointment.doctorId] } },
    select: { id: true, name: true },
  });
  return new Map(users.map((user) => [user.id, user.name]));
}

/**
 * What happens after a doctor confirms: the reminders are scheduled and the patient is told.
 * Never throws, so a notification problem cannot fail the confirmation itself.
 */
export async function onAppointmentConfirmed(appointment: AppointmentRef): Promise<void> {
  try {
    const names = await loadNames(appointment);
    await Promise.all([
      scheduleAppointmentReminders(appointment),
      notifyUser(
        appointment.patientId,
        buildConfirmedMessage({
          ...context(),
          appointmentId: appointment.id,
          otherName: names.get(appointment.doctorId) ?? 'Your doctor',
          start: appointment.scheduledStart,
        }),
      ),
    ]);
  } catch (error) {
    logger.error({ err: error, appointmentId: appointment.id }, 'Confirmation follow-up failed');
  }
}

/** After a cancellation: the reminders are removed and the other person is told. Never throws. */
export async function onAppointmentCancelled(
  appointment: AppointmentRef,
  cancelledById: string,
): Promise<void> {
  try {
    const names = await loadNames(appointment);
    const cancelledByPatient = cancelledById === appointment.patientId;
    const recipientId = cancelledByPatient ? appointment.doctorId : appointment.patientId;
    const otherId = cancelledByPatient ? appointment.patientId : appointment.doctorId;

    await Promise.all([
      cancelAppointmentReminders(appointment.id),
      notifyUser(
        recipientId,
        buildCancelledMessage({
          ...context(),
          appointmentId: appointment.id,
          otherName: names.get(otherId) ?? 'the other person',
          start: appointment.scheduledStart,
        }),
      ),
    ]);
  } catch (error) {
    logger.error({ err: error, appointmentId: appointment.id }, 'Cancellation follow-up failed');
  }
}
