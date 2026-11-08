import { describe, expect, it } from 'vitest';
import {
  planReminders,
  reminderPayloadSchema,
  reminderScheduleName,
} from '../../src/modules/reminders/reminders.rules';
import { APPOINTMENT_ID } from '../helpers/fixtures';

const HOUR = 3_600_000;
const now = new Date('2026-11-04T08:00:00.000Z');
const startIn = (hours: number) => new Date(now.getTime() + hours * HOUR);

describe('planReminders', () => {
  it('plans both reminders for an appointment more than a day away', () => {
    const plan = planReminders(startIn(48), now);
    expect(plan.map((item) => item.kind)).toEqual(['24h', '1h']);
    expect(plan[0]?.runAt).toEqual(startIn(24));
    expect(plan[1]?.runAt).toEqual(startIn(47));
  });

  it('leaves out the 24 hour reminder when the visit is sooner than that', () => {
    expect(planReminders(startIn(5), now).map((item) => item.kind)).toEqual(['1h']);
  });

  it('plans nothing when the visit is less than an hour away', () => {
    expect(planReminders(startIn(0.5), now)).toEqual([]);
  });

  it('skips a reminder that would be due within the next minute', () => {
    const start = new Date(now.getTime() + HOUR + 30_000);
    expect(planReminders(start, now)).toEqual([]);
  });
});

describe('reminderScheduleName', () => {
  it('is stable, so the schedule can be found again to cancel it', () => {
    expect(reminderScheduleName(APPOINTMENT_ID, '1h')).toBe(`appt-${APPOINTMENT_ID}-1h`);
  });

  it('fits the 64 character limit and the allowed characters', () => {
    const name = reminderScheduleName(APPOINTMENT_ID, '24h');
    expect(name.length).toBeLessThanOrEqual(64);
    expect(name).toMatch(/^[0-9a-zA-Z._-]+$/);
  });
});

describe('reminderPayloadSchema', () => {
  it('accepts what the scheduler sends', () => {
    expect(
      reminderPayloadSchema.safeParse({ appointmentId: APPOINTMENT_ID, kind: '24h' }).success,
    ).toBe(true);
  });

  it.each([
    { appointmentId: 'nope', kind: '1h' },
    { appointmentId: APPOINTMENT_ID, kind: '2h' },
    { kind: '1h' },
  ])('rejects %j', (payload) => {
    expect(reminderPayloadSchema.safeParse(payload).success).toBe(false);
  });
});
