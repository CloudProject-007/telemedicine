import { AppointmentStatus, Role, type Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma';
import { ConflictError, NotFoundError, UnprocessableError } from '../../shared/errors/app-error';
import { buildPaginationMeta, toSkipTake, type Paginated } from '../../shared/http/pagination';
import type { AuthUser } from '../../shared/types/auth';
import { loadAppointmentForParticipant } from './appointment-access';
import { onAppointmentCancelled, onAppointmentConfirmed } from './appointment-events';
import { assertTransitionAllowed } from './appointments.rules';
import type {
  CreateAppointmentInput,
  ListAppointmentsQuery,
  UpdateAppointmentStatusInput,
} from './appointments.schemas';

const appointmentInclude = {
  patient: { select: { id: true, name: true } },
  doctor: {
    select: { id: true, name: true, doctorProfile: { select: { specialty: true } } },
  },
} satisfies Prisma.AppointmentInclude;

type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: typeof appointmentInclude;
}>;

export interface AppointmentDto {
  id: string;
  status: AppointmentStatus;
  scheduledStart: Date;
  scheduledEnd: Date;
  reason: string | null;
  cancelledReason: string | null;
  createdAt: Date;
  patient: { id: string; name: string };
  doctor: { id: string; name: string; specialty: string | null };
}

function toAppointmentDto(appointment: AppointmentWithRelations): AppointmentDto {
  return {
    id: appointment.id,
    status: appointment.status,
    scheduledStart: appointment.scheduledStart,
    scheduledEnd: appointment.scheduledEnd,
    reason: appointment.reason,
    cancelledReason: appointment.cancelledReason,
    createdAt: appointment.createdAt,
    patient: appointment.patient,
    doctor: {
      id: appointment.doctor.id,
      name: appointment.doctor.name,
      specialty: appointment.doctor.doctorProfile?.specialty ?? null,
    },
  };
}

const ACTIVE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
];

/**
 * Books a slot. The slot is claimed with a conditional UPDATE (`isBooked = false`)
 * inside the same transaction that creates the appointment, so two patients racing
 * for one slot can never both succeed - no matter how many API instances run.
 */
export async function createAppointment(
  patient: AuthUser,
  input: CreateAppointmentInput,
): Promise<AppointmentDto> {
  const slot = await prisma.availabilitySlot.findUnique({ where: { id: input.slotId } });
  if (!slot) {
    throw new NotFoundError('Slot');
  }
  if (slot.startTime <= new Date()) {
    throw new UnprocessableError('This slot has already started');
  }

  const created = await prisma.$transaction(async (tx) => {
    const overlapping = await tx.appointment.count({
      where: {
        patientId: patient.id,
        status: { in: ACTIVE_STATUSES },
        scheduledStart: { lt: slot.endTime },
        scheduledEnd: { gt: slot.startTime },
      },
    });
    if (overlapping > 0) {
      throw new ConflictError('You already have an appointment at this time');
    }

    const claimed = await tx.availabilitySlot.updateMany({
      where: { id: slot.id, isBooked: false },
      data: { isBooked: true },
    });
    if (claimed.count !== 1) {
      throw new ConflictError('This slot has just been booked by someone else');
    }

    return tx.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: slot.doctorId,
        slotId: slot.id,
        scheduledStart: slot.startTime,
        scheduledEnd: slot.endTime,
        reason: input.reason ?? null,
      },
      include: appointmentInclude,
    });
  });

  return toAppointmentDto(created);
}

export async function listAppointments(
  user: AuthUser,
  query: ListAppointmentsQuery,
): Promise<Paginated<AppointmentDto>> {
  const scope: Prisma.AppointmentWhereInput =
    user.role === Role.ADMIN
      ? {}
      : user.role === Role.DOCTOR
        ? { doctorId: user.id }
        : { patientId: user.id };

  const where: Prisma.AppointmentWhereInput = {
    ...scope,
    ...(query.status ? { status: query.status } : {}),
    ...(query.from || query.to
      ? {
          scheduledStart: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: [{ scheduledStart: query.order }, { id: 'asc' }],
      ...toSkipTake(query),
    }),
  ]);

  return { items: rows.map(toAppointmentDto), meta: buildPaginationMeta(query, total) };
}

export async function getAppointment(user: AuthUser, id: string): Promise<AppointmentDto> {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: appointmentInclude,
  });
  const isParticipant =
    appointment !== null && (appointment.patientId === user.id || appointment.doctorId === user.id);
  if (!appointment || (!isParticipant && user.role !== Role.ADMIN)) {
    throw new NotFoundError('Appointment');
  }
  return toAppointmentDto(appointment);
}

export async function updateAppointmentStatus(
  user: AuthUser,
  id: string,
  input: UpdateAppointmentStatusInput,
): Promise<AppointmentDto> {
  const appointment = await loadAppointmentForParticipant(user, id);
  assertTransitionAllowed(appointment.status, input.status, user.role);

  const cancelling = input.status === AppointmentStatus.CANCELLED;

  await prisma.$transaction(async (tx) => {
    // Optimistic concurrency: only apply if nobody changed the status meanwhile.
    const updated = await tx.appointment.updateMany({
      where: { id, status: appointment.status },
      data: cancelling
        ? {
            status: input.status,
            cancelledReason: input.reason ?? null,
            cancelledById: user.id,
            slotId: null, // detach so the slot can be booked again
          }
        : { status: input.status },
    });
    if (updated.count !== 1) {
      throw new ConflictError('The appointment was modified by someone else. Please reload.');
    }

    if (cancelling && appointment.slotId) {
      await tx.availabilitySlot.update({
        where: { id: appointment.slotId },
        data: { isBooked: false },
      });
    }
  });

  // Side effects that must never fail the status change: reminders and messages.
  if (input.status === AppointmentStatus.CONFIRMED) {
    void onAppointmentConfirmed(appointment);
  } else if (cancelling) {
    void onAppointmentCancelled(appointment, user.id);
  }

  return getAppointment(user, id);
}
