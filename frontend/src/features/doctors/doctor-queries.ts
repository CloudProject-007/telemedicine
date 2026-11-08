import { useQuery } from '@tanstack/react-query';
import { addDays } from 'date-fns';
import { SLOT_LOOKAHEAD_DAYS } from '@/config/constants';
import { doctorsApi, type DoctorSearch } from '@/lib/api/doctors.api';

export const doctorKeys = {
  all: ['doctors'] as const,
  list: (search: DoctorSearch) => [...doctorKeys.all, 'list', search] as const,
  specialties: () => [...doctorKeys.all, 'specialties'] as const,
  detail: (id: string) => [...doctorKeys.all, 'detail', id] as const,
  slots: (id: string) => [...doctorKeys.all, 'slots', id] as const,
};

export const DOCTORS_PAGE_SIZE = 9;

export function useDoctors(search: DoctorSearch) {
  return useQuery({
    queryKey: doctorKeys.list(search),
    queryFn: ({ signal }) => doctorsApi.list({ ...search, limit: DOCTORS_PAGE_SIZE }, signal),
    placeholderData: (previous) => previous, // keep the old list visible while the next page loads
  });
}

export function useSpecialties() {
  return useQuery({
    queryKey: doctorKeys.specialties(),
    queryFn: ({ signal }) => doctorsApi.specialties(signal),
    staleTime: 5 * 60_000,
  });
}

export function useDoctor(id: string) {
  return useQuery({
    queryKey: doctorKeys.detail(id),
    queryFn: ({ signal }) => doctorsApi.get(id, signal),
  });
}

export function useDoctorSlots(id: string) {
  return useQuery({
    queryKey: doctorKeys.slots(id),
    queryFn: ({ signal }) => {
      const from = new Date();
      return doctorsApi.slots(id, { from, to: addDays(from, SLOT_LOOKAHEAD_DAYS) }, signal);
    },
    staleTime: 10_000, // slots go quickly, so keep this fresh
  });
}
