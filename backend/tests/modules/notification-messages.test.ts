import { describe, expect, it } from 'vitest';
import {
  buildCancelledMessage,
  buildConfirmedMessage,
  buildPrescriptionMessage,
  buildReminderMessage,
} from '../../src/modules/notifications/notification-messages';
import { APPOINTMENT_ID } from '../helpers/fixtures';

const context = { appUrl: 'https://app.example.com/', timeZone: 'Asia/Kolkata' };
// 05:00 UTC is 10:30 in India.
const start = new Date('2026-11-07T05:00:00.000Z');

describe('notification messages', () => {
  it('writes the time in the configured time zone', () => {
    const message = buildReminderMessage({
      ...context,
      kind: '1h',
      appointmentId: APPOINTMENT_ID,
      otherName: 'Dr Sharma',
      start,
    });
    expect(message.body).toMatch(/7 Nov 2026/);
    expect(message.body).toMatch(/10:30/);
  });

  it('says how far away the visit is', () => {
    const base = { ...context, appointmentId: APPOINTMENT_ID, otherName: 'Dr Sharma', start };
    expect(buildReminderMessage({ ...base, kind: '24h' }).subject).toMatch(/24 hours/);
    expect(buildReminderMessage({ ...base, kind: '1h' }).subject).toMatch(/1 hour/);
  });

  it('links to the visit without doubling the slash', () => {
    const message = buildConfirmedMessage({
      ...context,
      appointmentId: APPOINTMENT_ID,
      otherName: 'Dr Sharma',
      start,
    });
    expect(message.body).toContain(`https://app.example.com/consultations/${APPOINTMENT_ID}`);
    expect(message.sms).toContain(`/consultations/${APPOINTMENT_ID}`);
  });

  it('tells the patient whether a prescription is new or changed', () => {
    const base = { ...context, appointmentId: APPOINTMENT_ID, doctorName: 'Dr Sharma' };
    expect(buildPrescriptionMessage({ ...base, updated: false }).subject).toBe(
      'Your prescription is ready',
    );
    expect(buildPrescriptionMessage({ ...base, updated: true }).subject).toBe(
      'Your prescription was updated',
    );
  });

  it('never puts medical details in a message', () => {
    const message = buildPrescriptionMessage({
      ...context,
      appointmentId: APPOINTMENT_ID,
      doctorName: 'Dr Sharma',
      updated: false,
    });
    expect(`${message.subject} ${message.body} ${message.sms}`).not.toMatch(/diagnos|mg\b/i);
  });

  it('keeps subjects to one short line, as SNS requires', () => {
    const messages = [
      buildCancelledMessage({ ...context, appointmentId: APPOINTMENT_ID, otherName: 'X', start }),
      buildConfirmedMessage({ ...context, appointmentId: APPOINTMENT_ID, otherName: 'X', start }),
    ];
    for (const message of messages) {
      expect(message.subject).not.toMatch(/\n/);
      expect(message.subject.length).toBeLessThanOrEqual(100);
    }
  });
});
