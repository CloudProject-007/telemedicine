import { describe, expect, it } from 'vitest';
import {
  notificationSchema,
  toNotificationInput,
  toNotificationValues,
} from './notification-schema';

const parse = (values: { email: boolean; sms: boolean; phone: string }) =>
  notificationSchema.safeParse(values);

describe('notificationSchema', () => {
  it('accepts everything off with no number', () => {
    expect(parse({ email: false, sms: false, phone: '' }).success).toBe(true);
  });

  it('needs a number before text messages can be turned on', () => {
    const result = parse({ email: false, sms: true, phone: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['phone']);
  });

  it('accepts international numbers and rejects local ones', () => {
    expect(parse({ email: false, sms: true, phone: '+919876543210' }).success).toBe(true);
    expect(parse({ email: false, sms: true, phone: '9876543210' }).success).toBe(false);
    expect(parse({ email: false, sms: false, phone: '+0123' }).success).toBe(false);
  });
});

describe('conversion', () => {
  it('fills the form from saved preferences', () => {
    expect(
      toNotificationValues({
        phone: null,
        email: { enabled: true, status: 'pending' },
        sms: { enabled: false },
      }),
    ).toEqual({ email: true, sms: false, phone: '' });
  });

  it('sends an empty phone so the server removes the number', () => {
    expect(toNotificationInput({ email: false, sms: false, phone: '' })).toEqual({
      email: false,
      sms: false,
      phone: '',
    });
  });
});
