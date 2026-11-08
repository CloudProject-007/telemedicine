import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  appointmentsApi,
  type AppointmentSearch,
  type DoctorAction,
} from '@/lib/api/appointments.api';
import { doctorKeys } from '@/features/doctors/doctor-queries';

export const appointmentKeys = {
  all: ['appointments'] as const,
  list: () => [...appointmentKeys.all, 'list'] as const,
  search: (search: AppointmentSearch) => [...appointmentKeys.all, 'search', search] as const,
};

export function useAppointments() {
  return useQuery({
    queryKey: appointmentKeys.list(),
    queryFn: ({ signal }) => appointmentsApi.list(signal),
  });
}

export function useBookAppointment(doctorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: appointmentsApi.create,
    // Success or failure, the slot list is stale now (someone else may have taken the slot).
    onSettled: () => queryClient.invalidateQueries({ queryKey: doctorKeys.slots(doctorId) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: appointmentKeys.all }),
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      appointmentsApi.cancel(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: appointmentKeys.all }),
  });
}

export function useAppointmentSearch(search: AppointmentSearch) {
  return useQuery({
    queryKey: appointmentKeys.search(search),
    queryFn: ({ signal }) => appointmentsApi.search(search, signal),
    placeholderData: (previous) => previous,
  });
}

export function useSetAppointmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: DoctorAction }) =>
      appointmentsApi.setStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: appointmentKeys.all }),
  });
}
