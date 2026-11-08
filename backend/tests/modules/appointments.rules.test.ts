import { AppointmentStatus, Role } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  assertTransitionAllowed,
  isWithinCallWindow,
} from '../../src/modules/appointments/appointments.rules';
import { ForbiddenError, UnprocessableError } from '../../src/shared/errors/app-error';

describe('assertTransitionAllowed', () => {
  it('lets a doctor confirm and complete', () => {
    expect(() =>
      assertTransitionAllowed(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, Role.DOCTOR),
    ).not.toThrow();
    expect(() =>
      assertTransitionAllowed(
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.COMPLETED,
        Role.DOCTOR,
      ),
    ).not.toThrow();
  });

  it('lets both parties cancel before completion', () => {
    for (const from of [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]) {
      for (const role of [Role.PATIENT, Role.DOCTOR]) {
        expect(() =>
          assertTransitionAllowed(from, AppointmentStatus.CANCELLED, role),
        ).not.toThrow();
      }
    }
  });

  it('forbids a patient from confirming or completing', () => {
    expect(() =>
      assertTransitionAllowed(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, Role.PATIENT),
    ).toThrow(ForbiddenError);
    expect(() =>
      assertTransitionAllowed(
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.COMPLETED,
        Role.PATIENT,
      ),
    ).toThrow(ForbiddenError);
  });

  it('rejects impossible and terminal transitions', () => {
    expect(() =>
      assertTransitionAllowed(AppointmentStatus.PENDING, AppointmentStatus.COMPLETED, Role.DOCTOR),
    ).toThrow(UnprocessableError);
    expect(() =>
      assertTransitionAllowed(
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
        Role.DOCTOR,
      ),
    ).toThrow(UnprocessableError);
    expect(() =>
      assertTransitionAllowed(
        AppointmentStatus.CANCELLED,
        AppointmentStatus.CONFIRMED,
        Role.DOCTOR,
      ),
    ).toThrow(UnprocessableError);
  });
});

describe('isWithinCallWindow', () => {
  const appointment = {
    scheduledStart: new Date('2026-11-01T10:00:00Z'),
    scheduledEnd: new Date('2026-11-01T10:30:00Z'),
  };
  const at = (time: string): Date => new Date(`2026-11-01T${time}Z`);

  it('opens 15 minutes before the start', () => {
    expect(isWithinCallWindow(appointment, at('09:44:59'), 15, 30)).toBe(false);
    expect(isWithinCallWindow(appointment, at('09:45:00'), 15, 30)).toBe(true);
  });

  it('stays open 30 minutes after the end', () => {
    expect(isWithinCallWindow(appointment, at('11:00:00'), 15, 30)).toBe(true);
    expect(isWithinCallWindow(appointment, at('11:00:01'), 15, 30)).toBe(false);
  });
});
