import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentKeys } from '@/features/appointments/appointment-queries';
import { doctorKeys } from '@/features/doctors/doctor-queries';
import { appointmentsApi } from '@/lib/api/appointments.api';
import { doctorsApi, type CreateDoctorInput } from '@/lib/api/doctors.api';
import type { AppointmentStatus } from '@/types/api';

const STATUSES: readonly AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

export interface PlatformStats {
  doctors: number;
  byStatus: Record<AppointmentStatus, number>;
}

/** Counts come from the `total` of one-row pages, so no list has to be downloaded. */
export function usePlatformStats() {
  return useQuery({
    queryKey: [...appointmentKeys.all, 'stats'] as const,
    queryFn: async ({ signal }): Promise<PlatformStats> => {
      const [doctors, ...counts] = await Promise.all([
        doctorsApi.list({ limit: 1 }, signal),
        ...STATUSES.map((status) => appointmentsApi.search({ status, limit: 1 }, signal)),
      ]);
      return {
        doctors: doctors.meta.total,
        byStatus: {
          PENDING: counts[0]?.meta.total ?? 0,
          CONFIRMED: counts[1]?.meta.total ?? 0,
          COMPLETED: counts[2]?.meta.total ?? 0,
          CANCELLED: counts[3]?.meta.total ?? 0,
        },
      };
    },
  });
}

export function useCreateDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDoctorInput) => doctorsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: doctorKeys.all }),
  });
}
