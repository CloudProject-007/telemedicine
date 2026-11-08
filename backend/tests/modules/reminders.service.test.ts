import { AppointmentStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cancelAppointmentReminders,
  dispatchReminder,
  scheduleAppointmentReminders,
} from '../../src/modules/reminders/reminders.service';
import { APPOINTMENT_ID, DOCTOR_ID, PATIENT_ID, minutesFromNow } from '../helpers/fixtures';

const mocks = vi.hoisted(() => ({
  prisma: {
    appointment: { findUnique: vi.fn() },
    reminderLog: { findUnique: vi.fn(), create: vi.fn() },
  },
  scheduler: { schedule: vi.fn(), cancel: vi.fn() },
  notifyUser: vi.fn(),
}));

vi.mock('../../src/infrastructure/prisma', () => ({
  prisma: mocks.prisma,
  isPrismaError: (error: unknown, code: string) =>
    typeof error === 'object' && error !== null && (error as { code?: string }).code === code,
}));
vi.mock('../../src/infrastructure/scheduler', () => ({ getScheduler: () => mocks.scheduler }));
vi.mock('../../src/modules/notifications/notifications.service', () => ({
  notifyUser: mocks.notifyUser,
}));

function appointmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: APPOINTMENT_ID,
    status: AppointmentStatus.CONFIRMED,
    scheduledStart: minutesFromNow(60),
    patient: { id: PATIENT_ID, name: 'Asha Rao' },
    doctor: { id: DOCTOR_ID, name: 'Dr Sharma' },
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.scheduler.schedule.mockResolvedValue(undefined);
  mocks.scheduler.cancel.mockResolvedValue(undefined);
  mocks.notifyUser.mockResolvedValue(undefined);
  mocks.prisma.reminderLog.findUnique.mockResolvedValue(null);
  mocks.prisma.reminderLog.create.mockResolvedValue({});
});

describe('scheduleAppointmentReminders', () => {
  it('creates one schedule per reminder that is still ahead', async () => {
    await scheduleAppointmentReminders({
      id: APPOINTMENT_ID,
      scheduledStart: minutesFromNow(3 * 24 * 60),
    });
    expect(mocks.scheduler.schedule).toHaveBeenCalledTimes(2);
    expect(mocks.scheduler.schedule.mock.calls.map((call) => call[0].name)).toEqual([
      `appt-${APPOINTMENT_ID}-24h`,
      `appt-${APPOINTMENT_ID}-1h`,
    ]);
    expect(mocks.scheduler.schedule.mock.calls[0]?.[0].payload).toEqual({
      appointmentId: APPOINTMENT_ID,
      kind: '24h',
    });
  });

  it('schedules nothing for a visit that is about to start', async () => {
    await scheduleAppointmentReminders({
      id: APPOINTMENT_ID,
      scheduledStart: minutesFromNow(20),
    });
    expect(mocks.scheduler.schedule).not.toHaveBeenCalled();
  });

  it('never throws when AWS fails', async () => {
    mocks.scheduler.schedule.mockRejectedValue(new Error('throttled'));
    await expect(
      scheduleAppointmentReminders({
        id: APPOINTMENT_ID,
        scheduledStart: minutesFromNow(3 * 24 * 60),
      }),
    ).resolves.toBeUndefined();
  });
});

describe('cancelAppointmentReminders', () => {
  it('removes both schedules, and never throws', async () => {
    mocks.scheduler.cancel.mockRejectedValueOnce(new Error('boom'));
    await expect(cancelAppointmentReminders(APPOINTMENT_ID)).resolves.toBeUndefined();
    expect(mocks.scheduler.cancel).toHaveBeenCalledTimes(2);
  });
});

describe('dispatchReminder', () => {
  const payload = { appointmentId: APPOINTMENT_ID, kind: '1h' as const };

  it('tells both the patient and the doctor, then records it', async () => {
    mocks.prisma.appointment.findUnique.mockResolvedValue(appointmentRow());

    expect(await dispatchReminder(payload)).toBe('sent');

    const recipients = mocks.notifyUser.mock.calls.map((call) => call[0]);
    expect(recipients).toEqual([PATIENT_ID, DOCTOR_ID]);
    expect(mocks.notifyUser.mock.calls[0]?.[1].body).toContain('Dr Sharma');
    expect(mocks.notifyUser.mock.calls[1]?.[1].body).toContain('Asha Rao');
    expect(mocks.prisma.reminderLog.create).toHaveBeenCalledWith({
      data: { appointmentId: APPOINTMENT_ID, kind: '1h' },
    });
  });

  it.each([
    ['cancelled', { status: AppointmentStatus.CANCELLED }],
    ['already over', { scheduledStart: minutesFromNow(-5) }],
  ])('skips an appointment that is %s', async (_label, overrides) => {
    mocks.prisma.appointment.findUnique.mockResolvedValue(appointmentRow(overrides));
    expect(await dispatchReminder(payload)).toBe('skipped');
    expect(mocks.notifyUser).not.toHaveBeenCalled();
  });

  it('skips an appointment that no longer exists', async () => {
    mocks.prisma.appointment.findUnique.mockResolvedValue(null);
    expect(await dispatchReminder(payload)).toBe('skipped');
  });

  it('does not send the same reminder twice when the queue delivers it twice', async () => {
    mocks.prisma.appointment.findUnique.mockResolvedValue(appointmentRow());
    mocks.prisma.reminderLog.findUnique.mockResolvedValue({ appointmentId: APPOINTMENT_ID });
    expect(await dispatchReminder(payload)).toBe('skipped');
    expect(mocks.notifyUser).not.toHaveBeenCalled();
  });

  it('accepts losing a race to record the reminder', async () => {
    mocks.prisma.appointment.findUnique.mockResolvedValue(appointmentRow());
    mocks.prisma.reminderLog.create.mockRejectedValue({ code: 'P2002' });
    expect(await dispatchReminder(payload)).toBe('sent');
  });

  it('lets other database errors through, so the message is retried', async () => {
    mocks.prisma.appointment.findUnique.mockResolvedValue(appointmentRow());
    mocks.prisma.reminderLog.create.mockRejectedValue(new Error('connection lost'));
    await expect(dispatchReminder(payload)).rejects.toThrow('connection lost');
  });
});
