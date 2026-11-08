import { z } from 'zod';
import type { NotificationPreferences, NotificationPreferencesInput } from '@/types/notifications';

/** Same rule as the server: international format, for example +919876543210. */
export const E164_PHONE = /^\+[1-9]\d{6,14}$/;

export const notificationSchema = z
  .object({
    email: z.boolean(),
    sms: z.boolean(),
    phone: z.string().trim(),
  })
  .superRefine((values, context) => {
    if (values.phone && !E164_PHONE.test(values.phone)) {
      context.addIssue({
        code: 'custom',
        path: ['phone'],
        message: 'Use international format, for example +919876543210',
      });
    } else if (values.sms && !values.phone) {
      context.addIssue({
        code: 'custom',
        path: ['phone'],
        message: 'Enter a mobile number to get text messages',
      });
    }
  });

export type NotificationValues = z.infer<typeof notificationSchema>;

export function toNotificationValues(preferences: NotificationPreferences): NotificationValues {
  return {
    email: preferences.email.enabled,
    sms: preferences.sms.enabled,
    phone: preferences.phone ?? '',
  };
}

export function toNotificationInput(values: NotificationValues): NotificationPreferencesInput {
  return { email: values.email, sms: values.sms, phone: values.phone };
}
