import { AppointmentStatus, Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAppointment,
  updateAppointmentStatus,
} from '../../src/modules/appointments/appointments.service';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
} from '../../src/shared/errors/app-error';
import {
  APPOINTMENT_ID,
  DOCTOR_ID,
  PATIENT_ID,
  SLOT_ID,
  minutesFromNow,
} from '../helpers/fixtures';

const mocks = vi.hoisted(() => {
  const tx = {
    appointment: { count: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    availabilitySlot: { updateMany: vi.fn(), update: vi.fn() },
  };
  const prisma = {
    availabilitySlot: { findUnique: vi.fn() },
    appointment: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  };
  return {
    tx,
    prisma,
    loadParticipant: vi.fn(),
    onConfirmed: vi.fn(),
    onCancelled: vi.fn(),
  };
});

vi.mock('../../src/infrastructure/prisma', () => ({
  prisma: mocks.prisma,
  isPrismaError: () => false,
}));
vi.mock('../../src/modules/appointments/appointment-events', () => ({
  onAppointmentConfirmed: mocks.onConfirmed,
  onAppointmentCancelled: mocks.onCancelled,
}));
vi.mock('../../src/modules/appointments/appointment-access', () => ({
  loadAppointmentForParticipant: mocks.loadParticipant,
}));

const patient = { id: PATIENT_ID, role: Role.PATIENT };
const doctor = { id: DOCTOR_ID, role: Role.DOCTOR };

function slotRow(overrides: Record<string, unknown> = {}) {
  return {
    id: SLOT_ID,
    doctorId: DOCTOR_ID,
    startTime: minutesFromNow(60),
    endTime: minutesFromNow(90),
    isBooked: false,
    ...overrides,
  };
}

function appointmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: APPOINTMENT_ID,
    patientId: PATIENT_ID,
    doctorId: DOCTOR_ID,
    slotId: SLOT_ID,
    status: AppointmentStatus.PENDING,
    scheduledStart: minutesFromNow(60),
    scheduledEnd: minutesFromNow(90),
    reason: null,
    cancelledReason: null,
    createdAt: new Date(),
    patient: { id: PATIENT_ID, name: 'Pat Patient' },
    doctor: { id: DOCTOR_ID, name: 'Dr Who', doctorProfile: { specialty: 'Cardiology' } },
    ...overrides,
  };
}

beforeEach(() => {
  mocks.prisma.$transaction.mockImplementation(async (fn: (tx: typeof mocks.tx) => unknown) =>
    fn(mocks.tx),
  );
  mocks.tx.appointment.count.mockResolvedValue(0);
  mocks.tx.availabilitySlot.updateMany.mockResolvedValue({ count: 1 });
  mocks.tx.appointment.create.mockResolvedValue(appointmentRow());
  mocks.onConfirmed.mockClear();
  mocks.onCancelled.mockClear();
});

describe('createAppointment', () => {
  it('books a free slot and snapshots its times', async () => {
    const slot = slotRow();
    mocks.prisma.availabilitySlot.findUnique.mockResolvedValue(slot);

    const result = await createAppointment(patient, { slotId: SLOT_ID, reason: 'Chest pain' });

    expect(mocks.tx.availabilitySlot.updateMany).toHaveBeenCalledWith({
      where: { id: SLOT_ID, isBooked: false },
      data: { isBooked: true },
    });
    expect(mocks.tx.appointment.create.mock.calls[0]?.[0].data).toMatchObject({
      patientId: PATIENT_ID,
      doctorId: DOCTOR_ID,
      slotId: SLOT_ID,
      scheduledStart: slot.startTime,
      scheduledEnd: slot.endTime,
      reason: 'Chest pain',
    });
    expect(result).toMatchObject({
      id: APPOINTMENT_ID,
      status: AppointmentStatus.PENDING,
      doctor: { id: DOCTOR_ID, specialty: 'Cardiology' },
    });
  });

  it('returns 404 for an unknown slot', async () => {
    mocks.prisma.availabilitySlot.findUnique.mockResolvedValue(null);
    await expect(createAppointment(patient, { slotId: SLOT_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('rejects a slot that already started', async () => {
    mocks.prisma.availabilitySlot.findUnique.mockResolvedValue(
      slotRow({ startTime: minutesFromNow(-5), endTime: minutesFromNow(25) }),
    );
    await expect(createAppointment(patient, { slotId: SLOT_ID })).rejects.toBeInstanceOf(
      UnprocessableError,
    );
  });

  it('never double-books: losing the race yields a conflict and creates nothing', async () => {
    mocks.prisma.availabilitySlot.findUnique.mockResolvedValue(slotRow());
    mocks.tx.availabilitySlot.updateMany.mockResolvedValue({ count: 0 });

    await expect(createAppointment(patient, { slotId: SLOT_ID })).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(mocks.tx.appointment.create).not.toHaveBeenCalled();
  });

  it('rejects a patient who already has an appointment at that time', async () => {
    mocks.prisma.availabilitySlot.findUnique.mockResolvedValue(slotRow());
    mocks.tx.appointment.count.mockResolvedValue(1);

    await expect(createAppointment(patient, { slotId: SLOT_ID })).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(mocks.tx.availabilitySlot.updateMany).not.toHaveBeenCalled();
  });
});

describe('updateAppointmentStatus', () => {
  beforeEach(() => {
    mocks.tx.appointment.updateMany.mockResolvedValue({ count: 1 });
  });

  it('frees the slot and detaches it when an appointment is cancelled', async () => {
    mocks.loadParticipant.mockResolvedValue(
      appointmentRow({ status: AppointmentStatus.CONFIRMED }),
    );
    mocks.prisma.appointment.findUnique.mockResolvedValue(
      appointmentRow({ status: AppointmentStatus.CANCELLED, slotId: null }),
    );

    const result = await updateAppointmentStatus(patient, APPOINTMENT_ID, {
      status: AppointmentStatus.CANCELLED,
      reason: 'Feeling better',
    });

    expect(mocks.tx.appointment.updateMany).toHaveBeenCalledWith({
      where: { id: APPOINTMENT_ID, status: AppointmentStatus.CONFIRMED },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancelledReason: 'Feeling better',
        cancelledById: PATIENT_ID,
        slotId: null,
      },
    });
    expect(mocks.tx.availabilitySlot.update).toHaveBeenCalledWith({
      where: { id: SLOT_ID },
      data: { isBooked: false },
    });
    expect(result.status).toBe(AppointmentStatus.CANCELLED);
  });

  it('keeps the slot booked when the doctor confirms', async () => {
    mocks.loadParticipant.mockResolvedValue(appointmentRow());
    mocks.prisma.appointment.findUnique.mockResolvedValue(
      appointmentRow({ status: AppointmentStatus.CONFIRMED }),
    );

    await updateAppointmentStatus(doctor, APPOINTMENT_ID, { status: AppointmentStatus.CONFIRMED });

    expect(mocks.tx.availabilitySlot.update).not.toHaveBeenCalled();
  });

  it('forbids a patient from confirming', async () => {
    mocks.loadParticipant.mockResolvedValue(appointmentRow());
    await expect(
      updateAppointmentStatus(patient, APPOINTMENT_ID, { status: AppointmentStatus.CONFIRMED }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('reports a conflict when the status changed concurrently', async () => {
    mocks.loadParticipant.mockResolvedValue(appointmentRow());
    mocks.tx.appointment.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      updateAppointmentStatus(doctor, APPOINTMENT_ID, { status: AppointmentStatus.CONFIRMED }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('schedules reminders and tells the patient once the doctor confirms', async () => {
    mocks.loadParticipant.mockResolvedValue(appointmentRow());
    mocks.prisma.appointment.findUnique.mockResolvedValue(
      appointmentRow({ status: AppointmentStatus.CONFIRMED }),
    );

    await updateAppointmentStatus(doctor, APPOINTMENT_ID, { status: AppointmentStatus.CONFIRMED });

    expect(mocks.onConfirmed).toHaveBeenCalledWith(expect.objectContaining({ id: APPOINTMENT_ID }));
    expect(mocks.onCancelled).not.toHaveBeenCalled();
  });

  it('removes reminders and tells the other person after a cancellation', async () => {
    mocks.loadParticipant.mockResolvedValue(
      appointmentRow({ status: AppointmentStatus.CONFIRMED }),
    );
    mocks.prisma.appointment.findUnique.mockResolvedValue(
      appointmentRow({ status: AppointmentStatus.CANCELLED, slotId: null }),
    );

    await updateAppointmentStatus(patient, APPOINTMENT_ID, {
      status: AppointmentStatus.CANCELLED,
    });

    expect(mocks.onCancelled).toHaveBeenCalledWith(
      expect.objectContaining({ id: APPOINTMENT_ID }),
      PATIENT_ID,
    );
    expect(mocks.onConfirmed).not.toHaveBeenCalled();
  });

  it('does nothing extra when the status change did not happen', async () => {
    mocks.loadParticipant.mockResolvedValue(appointmentRow());
    mocks.tx.appointment.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      updateAppointmentStatus(doctor, APPOINTMENT_ID, { status: AppointmentStatus.CONFIRMED }),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(mocks.onConfirmed).not.toHaveBeenCalled();
  });
});
