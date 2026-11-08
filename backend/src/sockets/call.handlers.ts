import { AppointmentStatus } from '@prisma/client';
import { z } from 'zod';
import { env } from '../config/env';
import { loadAppointmentForParticipant } from '../modules/appointments/appointment-access';
import { isWithinCallWindow } from '../modules/appointments/appointments.rules';
import { ForbiddenError, UnprocessableError } from '../shared/errors/app-error';
import { uuidSchema } from '../shared/http/validation';
import { safeHandler } from './safe-handler';
import { callRoom, type CallPeer, type TypedServer, type TypedSocket } from './types';

const appointmentPayload = z.object({ appointmentId: uuidSchema });
const signalPayload = z.object({ appointmentId: uuidSchema, data: z.unknown() });

type SignalEvent = 'webrtc:offer' | 'webrtc:answer' | 'webrtc:ice-candidate';
const SIGNAL_EVENTS: SignalEvent[] = ['webrtc:offer', 'webrtc:answer', 'webrtc:ice-candidate'];

export function registerCallHandlers(io: TypedServer, socket: TypedSocket): void {
  const { user } = socket.data;

  socket.on(
    'call:join',
    safeHandler(appointmentPayload, async ({ appointmentId }) => {
      const appointment = await loadAppointmentForParticipant(user, appointmentId);

      if (appointment.status !== AppointmentStatus.CONFIRMED) {
        throw new UnprocessableError('Calls are only available for confirmed appointments');
      }
      if (
        !isWithinCallWindow(
          appointment,
          new Date(),
          env.CALL_JOIN_EARLY_MINUTES,
          env.CALL_JOIN_LATE_MINUTES,
        )
      ) {
        throw new UnprocessableError('This call is not open yet or has already ended');
      }

      const room = callRoom(appointmentId);
      // fetchSockets() also sees sockets on other instances when the Redis adapter is enabled.
      const others = await io.in(room).fetchSockets();
      const peers = new Map<string, CallPeer>();
      for (const other of others) {
        if (other.data.user.id !== user.id) {
          peers.set(other.data.user.id, { userId: other.data.user.id, role: other.data.user.role });
        }
      }

      await socket.join(room);
      socket.to(room).emit('call:peer-joined', {
        appointmentId,
        userId: user.id,
        role: user.role,
      });
      return { peers: [...peers.values()] };
    }),
  );

  socket.on(
    'call:leave',
    safeHandler(appointmentPayload, async ({ appointmentId }) => {
      const room = callRoom(appointmentId);
      if (socket.rooms.has(room)) {
        socket.to(room).emit('call:peer-left', { appointmentId, userId: user.id });
        await socket.leave(room);
      }
      return null;
    }),
  );

  // Signalling relay: offer / answer / ICE candidates are forwarded to the other peer.
  for (const event of SIGNAL_EVENTS) {
    socket.on(
      event,
      safeHandler(signalPayload, async ({ appointmentId, data }) => {
        const room = callRoom(appointmentId);
        if (!socket.rooms.has(room)) {
          throw new ForbiddenError('Join the call before sending signalling data');
        }
        // `from` is set server-side so a client can never impersonate the other participant.
        socket.to(room).emit(event, { appointmentId, from: user.id, data });
        return null;
      }),
    );
  }

  // Tell the other participant when this socket drops without calling call:leave.
  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room.startsWith('call:')) {
        socket.to(room).emit('call:peer-left', {
          appointmentId: room.slice('call:'.length),
          userId: user.id,
        });
      }
    }
  });
}
