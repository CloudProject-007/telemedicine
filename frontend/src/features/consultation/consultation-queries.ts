import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi } from '@/lib/api/appointments.api';
import { ApiError } from '@/lib/api/client';
import { consultationApi } from '@/lib/api/consultation.api';
import { openLink } from '@/lib/open-link';
import type { PrescriptionInput } from '@/types/consultation';

export const consultationKeys = {
  appointment: (id: string) => ['consultation', id, 'appointment'] as const,
  messages: (id: string) => ['consultation', id, 'messages'] as const,
  prescription: (id: string) => ['consultation', id, 'prescription'] as const,
};

export function useAppointment(id: string) {
  return useQuery({
    queryKey: consultationKeys.appointment(id),
    queryFn: ({ signal }) => appointmentsApi.get(id, signal),
  });
}

export function useChatHistory(appointmentId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: consultationKeys.messages(appointmentId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => consultationApi.messages(appointmentId, pageParam, signal),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
    // Live messages arrive over the socket, so a stale history is only refreshed on reconnect.
    staleTime: Infinity,
  });
}

/** `null` means the doctor has not written one yet. That is normal, not an error. */
export function usePrescription(appointmentId: string, { poll }: { poll: boolean }) {
  return useQuery({
    queryKey: consultationKeys.prescription(appointmentId),
    queryFn: async ({ signal }) => {
      try {
        return await consultationApi.prescription(appointmentId, signal);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    // The patient's page learns about a new prescription by checking now and then.
    refetchInterval: poll ? 15_000 : false,
  });
}

export function useSavePrescription(appointmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PrescriptionInput) =>
      consultationApi.savePrescription(appointmentId, input),
    onSuccess: (saved) =>
      queryClient.setQueryData(consultationKeys.prescription(appointmentId), saved),
  });
}

/** The PDF link is short-lived, so it is requested when the person asks for it. */
export function useOpenPrescriptionPdf(appointmentId: string) {
  return useMutation({
    mutationFn: async () => {
      const link = await consultationApi.prescriptionPdfLink(appointmentId);
      openLink(link.url);
    },
  });
}
