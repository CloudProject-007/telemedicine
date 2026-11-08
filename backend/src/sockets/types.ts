import type { Role } from '@prisma/client';
import type { Server, Socket } from 'socket.io';
import type { MessageDto } from '../modules/messages/messages.service';
import type { AuthUser } from '../shared/types/auth';

export interface AckError {
  code: string;
  message: string;
}

/** Every client->server event answers through an acknowledgement callback. */
export type AckResponse<T> = { ok: true; data: T } | { ok: false; error: AckError };
export type Ack<T = null> = (response: AckResponse<T>) => void;

export interface CallPeer {
  userId: string;
  role: Role;
}

export interface SignalEnvelope {
  appointmentId: string;
  /** Sender's user id, set by the server (never trusted from the client). */
  from: string;
  /** Opaque WebRTC payload: an SDP description or an ICE candidate. */
  data: unknown;
}

export interface ServerToClientEvents {
  'chat:message': (message: MessageDto) => void;
  'call:peer-joined': (event: { appointmentId: string } & CallPeer) => void;
  'call:peer-left': (event: { appointmentId: string; userId: string }) => void;
  'webrtc:offer': (event: SignalEnvelope) => void;
  'webrtc:answer': (event: SignalEnvelope) => void;
  'webrtc:ice-candidate': (event: SignalEnvelope) => void;
}

// Payloads are `unknown` on purpose: nothing from the network is trusted until zod parses it.
export interface ClientToServerEvents {
  'chat:join': (payload: unknown, ack?: Ack) => void;
  'chat:leave': (payload: unknown, ack?: Ack) => void;
  'chat:send': (payload: unknown, ack?: Ack<MessageDto>) => void;
  'call:join': (payload: unknown, ack?: Ack<{ peers: CallPeer[] }>) => void;
  'call:leave': (payload: unknown, ack?: Ack) => void;
  'webrtc:offer': (payload: unknown, ack?: Ack) => void;
  'webrtc:answer': (payload: unknown, ack?: Ack) => void;
  'webrtc:ice-candidate': (payload: unknown, ack?: Ack) => void;
}

export type InterServerEvents = Record<string, never>;

export interface SocketData {
  user: AuthUser;
}

export type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export const chatRoom = (appointmentId: string): string => `chat:${appointmentId}`;
export const callRoom = (appointmentId: string): string => `call:${appointmentId}`;
