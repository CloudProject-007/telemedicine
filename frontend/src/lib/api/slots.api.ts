import type { Slot } from '@/types/api';
import { apiRequest } from './client';

export interface NewSlot {
  startTime: string;
  endTime: string;
}

export const slotsApi = {
  create: (slots: NewSlot[]) => apiRequest<Slot[]>('/slots', { method: 'POST', body: { slots } }),

  remove: (id: string) => apiRequest<void>(`/slots/${id}`, { method: 'DELETE' }),
};
