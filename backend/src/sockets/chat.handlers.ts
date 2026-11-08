import { z } from 'zod';
import { loadAppointmentForParticipant } from '../modules/appointments/appointment-access';
import { CHAT_STATUSES } from '../modules/appointments/appointments.rules';
import { chatTextSchema } from '../modules/messages/messages.schemas';
import { createMessage } from '../modules/messages/messages.service';
import { ForbiddenError, UnprocessableError } from '../shared/errors/app-error';
import { uuidSchema } from '../shared/http/validation';
import { SlidingWindowLimiter } from './rate-limiter';
import { safeHandler } from './safe-handler';
import { chatRoom, type TypedServer, type TypedSocket } from './types';

const appointmentPayload = z.object({ appointmentId: uuidSchema });
const sendPayload = z.object({ appointmentId: uuidSchema, text: chatTextSchema });

const MAX_MESSAGES = 10;
const WINDOW_MS = 10_000;

export function registerChatHandlers(io: TypedServer, socket: TypedSocket): void {
  const { user } = socket.data;
  const limiter = new SlidingWindowLimiter(MAX_MESSAGES, WINDOW_MS);

  socket.on(
    'chat:join',
    safeHandler(appointmentPayload, async ({ appointmentId }) => {
      const appointment = await loadAppointmentForParticipant(user, appointmentId);
      if (!CHAT_STATUSES.includes(appointment.status)) {
        throw new UnprocessableError('Chat is available once the appointment is confirmed');
      }
      await socket.join(chatRoom(appointmentId));
      return null;
    }),
  );

  socket.on(
    'chat:leave',
    safeHandler(appointmentPayload, async ({ appointmentId }) => {
      await socket.leave(chatRoom(appointmentId));
      return null;
    }),
  );

  socket.on(
    'chat:send',
    safeHandler(sendPayload, async ({ appointmentId, text }) => {
      if (!socket.rooms.has(chatRoom(appointmentId))) {
        throw new ForbiddenError('Join the chat before sending messages');
      }
      if (!limiter.tryConsume()) {
        throw new UnprocessableError('You are sending messages too quickly');
      }
      // Persists first; the service re-checks participation and appointment status on every message.
      const message = await createMessage(user, appointmentId, text);
      io.to(chatRoom(appointmentId)).emit('chat:message', message);
      return message;
    }),
  );
}
