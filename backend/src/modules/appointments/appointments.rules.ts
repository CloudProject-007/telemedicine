import { AppointmentStatus, Role } from '@prisma/client';
import { ForbiddenError, UnprocessableError } from '../../shared/errors/app-error';

/**
 * Appointment lifecycle (who may perform each transition):
 *
 *   PENDING   -> CONFIRMED  (doctor)
 *   PENDING   -> CANCELLED  (patient, doctor)
 *   CONFIRMED -> COMPLETED  (doctor)
 *   CONFIRMED -> CANCELLED  (patient, doctor)
 *   COMPLETED, CANCELLED are terminal.
 */
const TRANSITIONS: Record<
  AppointmentStatus,
  Partial<Record<AppointmentStatus, readonly Role[]>>
> = {
  [AppointmentStatus.PENDING]: {
    [AppointmentStatus.CONFIRMED]: [Role.DOCTOR],
    [AppointmentStatus.CANCELLED]: [Role.PATIENT, Role.DOCTOR],
  },
  [AppointmentStatus.CONFIRMED]: {
    [AppointmentStatus.COMPLETED]: [Role.DOCTOR],
    [AppointmentStatus.CANCELLED]: [Role.PATIENT, Role.DOCTOR],
  },
  [AppointmentStatus.COMPLETED]: {},
  [AppointmentStatus.CANCELLED]: {},
};

export function assertTransitionAllowed(
  from: AppointmentStatus,
  to: AppointmentStatus,
  actorRole: Role,
): void {
  const allowedRoles = TRANSITIONS[from][to];
  if (!allowedRoles) {
    throw new UnprocessableError(`Cannot change appointment status from ${from} to ${to}`);
  }
  if (!allowedRoles.includes(actorRole)) {
    throw new ForbiddenError(`Your role cannot change an appointment from ${from} to ${to}`);
  }
}

/** Statuses in which doctor and patient may exchange chat messages. */
export const CHAT_STATUSES: readonly AppointmentStatus[] = [
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.COMPLETED,
];

/** Statuses in which a prescription may be written. */
export const PRESCRIPTION_STATUSES: readonly AppointmentStatus[] = [
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.COMPLETED,
];

/** Statuses that count as an ongoing doctor-patient relationship (document access). */
export const RELATIONSHIP_STATUSES: readonly AppointmentStatus[] = [
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.COMPLETED,
];

export interface CallWindowInput {
  scheduledStart: Date;
  scheduledEnd: Date;
}

/** A call may be joined from `earlyMinutes` before the start until `lateMinutes` after the end. */
export function isWithinCallWindow(
  { scheduledStart, scheduledEnd }: CallWindowInput,
  now: Date,
  earlyMinutes: number,
  lateMinutes: number,
): boolean {
  const opensAt = scheduledStart.getTime() - earlyMinutes * 60_000;
  const closesAt = scheduledEnd.getTime() + lateMinutes * 60_000;
  return now.getTime() >= opensAt && now.getTime() <= closesAt;
}
