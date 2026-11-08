/** Shapes for the consultation room (chat, prescriptions, calls). Dates arrive as ISO strings. */
import type { Role } from './api';

export interface ChatMessage {
  id: string;
  appointmentId: string;
  senderId: string;
  text: string;
  sentAt: string;
}

export interface MessagePage {
  /** Oldest first, ready to render. */
  items: ChatMessage[];
  /** Pass as the cursor to load older messages. Null when there are no more. */
  nextCursor: string | null;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions?: string | undefined;
}

export interface Prescription {
  id: string;
  appointmentId: string;
  diagnosis: string | null;
  notes: string;
  medications: Medication[];
  followUpDate: string | null;
  hasPdf: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionInput {
  diagnosis?: string | undefined;
  notes: string;
  medications: Medication[];
  followUpDate?: string | undefined;
}

export interface IceServerConfig {
  iceServers: RTCIceServer[];
  /** Seconds until TURN credentials expire. 0 when only STUN is configured. */
  ttlSeconds: number;
}

export interface CallPeer {
  userId: string;
  role: Role;
}
