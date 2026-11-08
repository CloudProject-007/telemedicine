import type {
  IceServerConfig,
  MessagePage,
  Prescription,
  PrescriptionInput,
} from '@/types/consultation';
import { apiRequest } from './client';

const MESSAGE_PAGE_SIZE = 50;

export const consultationApi = {
  /** Newest page first. Pass the previous page's `nextCursor` to load older messages. */
  messages: (appointmentId: string, cursor?: string, signal?: AbortSignal) =>
    apiRequest<MessagePage>(`/appointments/${appointmentId}/messages`, {
      query: { limit: MESSAGE_PAGE_SIZE, cursor },
      signal,
    }),

  prescription: (appointmentId: string, signal?: AbortSignal) =>
    apiRequest<Prescription>(`/appointments/${appointmentId}/prescription`, { signal }),

  /** Doctor only. Creates the prescription or replaces the existing one. */
  savePrescription: (appointmentId: string, input: PrescriptionInput) =>
    apiRequest<Prescription>(`/appointments/${appointmentId}/prescription`, {
      method: 'PUT',
      body: input,
    }),

  /** A short-lived link to the prescription PDF. */
  prescriptionPdfLink: (appointmentId: string) =>
    apiRequest<{ url: string; expiresIn: number }>(
      `/appointments/${appointmentId}/prescription/pdf-url`,
    ),

  /** Short-lived TURN credentials, so fetch a fresh set for every call. */
  iceServers: () => apiRequest<IceServerConfig>('/webrtc/ice-servers'),
};
