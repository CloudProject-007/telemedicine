import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays } from 'date-fns';
import { doctorKeys } from '@/features/doctors/doctor-queries';
import { doctorsApi, type DoctorProfileInput } from '@/lib/api/doctors.api';
import { slotsApi, type NewSlot } from '@/lib/api/slots.api';

/** The API allows a window of up to 31 days. */
const MY_SLOT_WINDOW_DAYS = 30;

export function useMySlots(doctorId: string) {
  return useQuery({
    queryKey: [...doctorKeys.slots(doctorId), 'mine'] as const,
    queryFn: ({ signal }) => {
      const from = new Date();
      return doctorsApi.slots(
        doctorId,
        { from, to: addDays(from, MY_SLOT_WINDOW_DAYS), includeBooked: true },
        signal,
      );
    },
  });
}

export function useCreateSlots(doctorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slots: NewSlot[]) => slotsApi.create(slots),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: doctorKeys.slots(doctorId) }),
  });
}

export function useDeleteSlot(doctorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slotId: string) => slotsApi.remove(slotId),
    // A "booked in the meantime" failure also means the list is stale.
    onSettled: () => queryClient.invalidateQueries({ queryKey: doctorKeys.slots(doctorId) }),
  });
}

export function useUpdateProfile(doctorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<DoctorProfileInput>) => doctorsApi.updateMe(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: doctorKeys.detail(doctorId) }),
  });
}
