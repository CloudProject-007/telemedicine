import type { Appointment } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma';
import { NotFoundError } from '../../shared/errors/app-error';
import type { AuthUser } from '../../shared/types/auth';

/**
 * Loads an appointment only if the user is its patient or its doctor.
 * Non-participants (including admins) get a 404 so appointment ids cannot be probed
 * and clinical data (chat, prescriptions, calls) stays between the two parties.
 */
export async function loadAppointmentForParticipant(
  user: AuthUser,
  appointmentId: string,
): Promise<Appointment> {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment || (appointment.patientId !== user.id && appointment.doctorId !== user.id)) {
    throw new NotFoundError('Appointment');
  }
  return appointment;
}
