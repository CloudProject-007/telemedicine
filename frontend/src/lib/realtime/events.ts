import type { Role } from '@/types/api';
import type { CallPeer, ChatMessage } from '@/types/consultation';

/** Mirrors backend/src/sockets/types.ts. */

export interface AckError {
  code: string;
  message: string;
}

export type AckResponse<T> = { ok: true; data: T } | { ok: false; error: AckError };

export interface SignalEnvelope {
  appointmentId: string;
  /** The sender's user id. The server sets it, so it can be trusted. */
  from: string;
  /** An SDP description or an ICE candidate. */
  data: unknown;
}

export interface ServerToClientEvents {
  'chat:message': (message: ChatMessage) => void;
  'call:peer-joined': (event: { appointmentId: string; userId: string; role: Role }) => void;
  'call:peer-left': (event: { appointmentId: string; userId: string }) => void;
  'webrtc:offer': (event: SignalEnvelope) => void;
  'webrtc:answer': (event: SignalEnvelope) => void;
  'webrtc:ice-candidate': (event: SignalEnvelope) => void;
}

export interface ClientToServerEvents {
  'chat:join': (payload: { appointmentId: string }) => void;
  'chat:leave': (payload: { appointmentId: string }) => void;
  'chat:send': (payload: { appointmentId: string; text: string }) => void;
  'call:join': (payload: { appointmentId: string }) => void;
  'call:leave': (payload: { appointmentId: string }) => void;
  'webrtc:offer': (payload: { appointmentId: string; data: unknown }) => void;
  'webrtc:answer': (payload: { appointmentId: string; data: unknown }) => void;
  'webrtc:ice-candidate': (payload: { appointmentId: string; data: unknown }) => void;
}

export type SignalEvent = 'webrtc:offer' | 'webrtc:answer' | 'webrtc:ice-candidate';

/** What the server answers to `call:join`. */
export interface JoinResult {
  peers: CallPeer[];
}
