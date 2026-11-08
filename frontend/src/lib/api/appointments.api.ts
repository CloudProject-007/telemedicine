import type { Appointment, AppointmentStatus, Paginated } from '@/types/api';
import { apiList, apiRequest } from './client';

export interface AppointmentSearch {
  status?: AppointmentStatus | undefined;
  from?: Date | undefined;
  to?: Date | undefined;
  page?: number | undefined;
  limit?: number | undefined;
  order?: 'asc' | 'desc' | undefined;
}

/** Statuses a doctor can move an appointment to. */
export type DoctorAction = 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export const appointmentsApi = {
  /** One page of appointments the signed-in person is allowed to see (patients: their own, doctors: theirs, admins: all). */
  search: (search: AppointmentSearch, signal?: AbortSignal): Promise<Paginated<Appointment>> =>
    apiList<Appointment>('/appointments', {
      query: {
        status: search.status,
        from: search.from?.toISOString(),
        to: search.to?.toISOString(),
        page: search.page,
        limit: search.limit,
        order: search.order,
      },
      signal,
    }),

  /** The API caps `limit` at 100; the appointments screen groups this one page on the client. */
  list: (signal?: AbortSignal): Promise<Paginated<Appointment>> =>
    apiList<Appointment>('/appointments', { query: { limit: 100, order: 'desc' }, signal }),

  get: (id: string, signal?: AbortSignal) =>
    apiRequest<Appointment>(`/appointments/${id}`, { signal }),

  create: (input: { slotId: string; reason?: string | undefined }) =>
    apiRequest<Appointment>('/appointments', { method: 'POST', body: input }),

  cancel: (id: string, reason?: string) =>
    apiRequest<Appointment>(`/appointments/${id}/status`, {
      method: 'PATCH',
      body: { status: 'CANCELLED', ...(reason ? { reason } : {}) },
    }),

  setStatus: (id: string, status: DoctorAction, reason?: string) =>
    apiRequest<Appointment>(`/appointments/${id}/status`, {
      method: 'PATCH',
      body: { status, ...(reason ? { reason } : {}) },
    }),
};
