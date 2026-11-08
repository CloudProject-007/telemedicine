import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { AppointmentStatus, Role } from '@prisma/client';
import { io as connect, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { signAccessToken } from '../../src/shared/auth/jwt';
import { NotFoundError } from '../../src/shared/errors/app-error';
import { createRealtimeServer, type RealtimeServer } from '../../src/sockets';
import {
  APPOINTMENT_ID,
  DOCTOR_ID,
  OTHER_ID,
  PATIENT_ID,
  minutesFromNow,
} from '../helpers/fixtures';

const mocks = vi.hoisted(() => ({
  loadParticipant: vi.fn(),
  messageCreate: vi.fn(),
}));

vi.mock('../../src/infrastructure/prisma', () => ({
  prisma: { message: { create: mocks.messageCreate } },
  isPrismaError: () => false,
}));
vi.mock('../../src/modules/appointments/appointment-access', () => ({
  loadAppointmentForParticipant: mocks.loadParticipant,
}));

interface AckResult {
  ok: boolean;
  data?: unknown;
  error?: { code: string; message: string };
}

let httpServer: HttpServer;
let realtime: RealtimeServer;
let url: string;
const openSockets: Socket[] = [];

function tokenFor(id: string, role: Role): string {
  return signAccessToken({ id, role });
}

function open(token: string | undefined): Promise<Socket> {
  const socket = connect(url, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    ...(token ? { auth: { token } } : {}),
  });
  openSockets.push(socket);
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

function emit(socket: Socket, event: string, payload: unknown): Promise<AckResult> {
  return new Promise((resolve) => {
    socket.emit(event, payload, resolve);
  });
}

function waitFor<T>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve) => {
    socket.once(event, resolve);
  });
}

beforeAll(async () => {
  httpServer = createServer();
  realtime = await createRealtimeServer(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
});

afterAll(async () => {
  for (const socket of openSockets) {
    socket.close();
  }
  await realtime.close();
});

beforeEach(() => {
  mocks.loadParticipant.mockImplementation(async (user: { id: string }) => {
    if (user.id !== PATIENT_ID && user.id !== DOCTOR_ID) {
      throw new NotFoundError('Appointment');
    }
    return {
      id: APPOINTMENT_ID,
      patientId: PATIENT_ID,
      doctorId: DOCTOR_ID,
      status: AppointmentStatus.CONFIRMED,
      scheduledStart: minutesFromNow(-5),
      scheduledEnd: minutesFromNow(25),
    };
  });
  mocks.messageCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: '77777777-7777-4777-8777-777777777777',
    sentAt: new Date(),
    ...data,
  }));
});

describe('socket authentication', () => {
  it('rejects connections without a token', async () => {
    await expect(open(undefined)).rejects.toThrow('UNAUTHORIZED');
  });

  it('rejects connections with an invalid token', async () => {
    await expect(open('nope')).rejects.toThrow('UNAUTHORIZED');
  });
});

describe('call signalling', () => {
  it('lets both participants join and relays signalling with a server-set sender', async () => {
    const patient = await open(tokenFor(PATIENT_ID, Role.PATIENT));
    const doctor = await open(tokenFor(DOCTOR_ID, Role.DOCTOR));

    const first = await emit(patient, 'call:join', { appointmentId: APPOINTMENT_ID });
    expect(first).toEqual({ ok: true, data: { peers: [] } });

    const peerJoined = waitFor<{ userId: string; role: Role }>(patient, 'call:peer-joined');
    const second = await emit(doctor, 'call:join', { appointmentId: APPOINTMENT_ID });
    expect(second).toEqual({
      ok: true,
      data: { peers: [{ userId: PATIENT_ID, role: Role.PATIENT }] },
    });
    expect(await peerJoined).toMatchObject({ userId: DOCTOR_ID, role: Role.DOCTOR });

    const offerReceived = waitFor<{ from: string; data: unknown }>(doctor, 'webrtc:offer');
    const ack = await emit(patient, 'webrtc:offer', {
      appointmentId: APPOINTMENT_ID,
      data: { type: 'offer', sdp: 'v=0...' },
    });
    expect(ack.ok).toBe(true);
    expect(await offerReceived).toEqual({
      appointmentId: APPOINTMENT_ID,
      from: PATIENT_ID,
      data: { type: 'offer', sdp: 'v=0...' },
    });

    const peerLeft = waitFor<{ userId: string }>(doctor, 'call:peer-left');
    patient.close();
    expect(await peerLeft).toMatchObject({ userId: PATIENT_ID });
  });

  it('refuses signalling from a socket that has not joined the call', async () => {
    const patient = await open(tokenFor(PATIENT_ID, Role.PATIENT));
    const ack = await emit(patient, 'webrtc:answer', { appointmentId: APPOINTMENT_ID, data: {} });
    expect(ack).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
  });

  it('refuses users who are not part of the appointment', async () => {
    const stranger = await open(tokenFor(OTHER_ID, Role.PATIENT));
    const ack = await emit(stranger, 'call:join', { appointmentId: APPOINTMENT_ID });
    expect(ack).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });

  it('refuses calls outside the join window', async () => {
    mocks.loadParticipant.mockResolvedValue({
      id: APPOINTMENT_ID,
      patientId: PATIENT_ID,
      doctorId: DOCTOR_ID,
      status: AppointmentStatus.CONFIRMED,
      scheduledStart: minutesFromNow(240),
      scheduledEnd: minutesFromNow(270),
    });
    const patient = await open(tokenFor(PATIENT_ID, Role.PATIENT));
    const ack = await emit(patient, 'call:join', { appointmentId: APPOINTMENT_ID });
    expect(ack).toMatchObject({ ok: false, error: { code: 'UNPROCESSABLE' } });
  });

  it('validates payloads', async () => {
    const patient = await open(tokenFor(PATIENT_ID, Role.PATIENT));
    const ack = await emit(patient, 'call:join', { appointmentId: 'not-a-uuid' });
    expect(ack).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
  });
});

describe('chat', () => {
  it('persists a message and delivers it to the other participant', async () => {
    const patient = await open(tokenFor(PATIENT_ID, Role.PATIENT));
    const doctor = await open(tokenFor(DOCTOR_ID, Role.DOCTOR));
    expect(await emit(patient, 'chat:join', { appointmentId: APPOINTMENT_ID })).toMatchObject({
      ok: true,
    });
    expect(await emit(doctor, 'chat:join', { appointmentId: APPOINTMENT_ID })).toMatchObject({
      ok: true,
    });

    const received = waitFor<{ text: string; senderId: string }>(doctor, 'chat:message');
    const ack = await emit(patient, 'chat:send', {
      appointmentId: APPOINTMENT_ID,
      text: '  Hello doctor  ',
    });

    expect(ack.ok).toBe(true);
    expect(mocks.messageCreate).toHaveBeenCalledWith({
      data: { appointmentId: APPOINTMENT_ID, senderId: PATIENT_ID, text: 'Hello doctor' },
    });
    expect(await received).toMatchObject({ text: 'Hello doctor', senderId: PATIENT_ID });
  });

  it('requires joining the chat room before sending', async () => {
    const patient = await open(tokenFor(PATIENT_ID, Role.PATIENT));
    const ack = await emit(patient, 'chat:send', { appointmentId: APPOINTMENT_ID, text: 'hi' });
    expect(ack).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
  });

  it('throttles message bursts', async () => {
    const patient = await open(tokenFor(PATIENT_ID, Role.PATIENT));
    await emit(patient, 'chat:join', { appointmentId: APPOINTMENT_ID });

    const results: AckResult[] = [];
    for (let index = 0; index < 12; index += 1) {
      results.push(
        await emit(patient, 'chat:send', { appointmentId: APPOINTMENT_ID, text: `m${index}` }),
      );
    }
    expect(results.filter((result) => result.ok)).toHaveLength(10);
    expect(results.slice(10).every((result) => !result.ok)).toBe(true);
  });
});
