import type { NotificationPreferences, NotificationPreferencesInput } from '@/types/notifications';
import { apiRequest } from './client';

export const notificationsApi = {
  get: (signal?: AbortSignal) =>
    apiRequest<NotificationPreferences>('/notifications/preferences', { signal }),

  update: (input: NotificationPreferencesInput) =>
    apiRequest<NotificationPreferences>('/notifications/preferences', {
      method: 'PUT',
      body: input,
    }),
};
