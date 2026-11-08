import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api/notifications.api';

export const notificationKeys = { preferences: ['notifications', 'preferences'] as const };

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences,
    queryFn: ({ signal }) => notificationsApi.get(signal),
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.update,
    onSuccess: (saved) => queryClient.setQueryData(notificationKeys.preferences, saved),
  });
}
