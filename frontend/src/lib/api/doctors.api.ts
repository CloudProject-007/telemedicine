import type { Doctor, Paginated, Slot, Specialty } from '@/types/api';
import { apiList, apiRequest } from './client';

export interface DoctorSearch {
  q?: string | undefined;
  specialty?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface DoctorProfileInput {
  specialty: string;
  experienceYears: number;
  consultationFee: number;
  qualification?: string | undefined;
  bio?: string | undefined;
  languages: string[];
}

export interface CreateDoctorInput extends DoctorProfileInput {
  name: string;
  email: string;
  password: string;
  phone?: string | undefined;
}

export const doctorsApi = {
  list: (search: DoctorSearch, signal?: AbortSignal): Promise<Paginated<Doctor>> =>
    apiList<Doctor>('/doctors', { query: { ...search }, signal }),

  specialties: (signal?: AbortSignal) =>
    apiRequest<Specialty[]>('/doctors/specialties', { signal }),

  get: (id: string, signal?: AbortSignal) => apiRequest<Doctor>(`/doctors/${id}`, { signal }),

  slots: (
    id: string,
    range: { from: Date; to: Date; includeBooked?: boolean },
    signal?: AbortSignal,
  ) =>
    apiRequest<Slot[]>(`/doctors/${id}/slots`, {
      query: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        onlyAvailable: range.includeBooked ? false : undefined,
      },
      signal,
    }),

  /** Admin only. */
  create: (input: CreateDoctorInput) =>
    apiRequest<Doctor>('/doctors', { method: 'POST', body: input }),

  /** Doctor only: updates the signed-in doctor's own profile. */
  updateMe: (input: Partial<DoctorProfileInput>) =>
    apiRequest<Doctor>('/doctors/me', { method: 'PATCH', body: input }),
};
