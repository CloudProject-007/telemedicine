import type { Message } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma';
import { UnprocessableError } from '../../shared/errors/app-error';
import type { AuthUser } from '../../shared/types/auth';
import { loadAppointmentForParticipant } from '../appointments/appointment-access';
import { CHAT_STATUSES } from '../appointments/appointments.rules';
import type { ListMessagesQuery } from './messages.schemas';

export interface MessageDto {
  id: string;
  appointmentId: string;
  senderId: string;
  text: string;
  sentAt: Date;
}

export interface MessagePage {
  /** Oldest first, ready to render. */
  items: MessageDto[];
  /** Pass as `cursor` to load older messages; null when there are no more. */
  nextCursor: string | null;
}

export function toMessageDto(message: Message): MessageDto {
  return {
    id: message.id,
    appointmentId: message.appointmentId,
    senderId: message.senderId,
    text: message.text,
    sentAt: message.sentAt,
  };
}

export async function listMessages(
  user: AuthUser,
  appointmentId: string,
  query: ListMessagesQuery,
): Promise<MessagePage> {
  await loadAppointmentForParticipant(user, appointmentId);

  const rows = await prisma.message.findMany({
    where: { appointmentId },
    orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const nextCursor = hasMore ? (page.at(-1)?.id ?? null) : null;

  return { items: [...page].reverse().map(toMessageDto), nextCursor };
}

/** Persists a chat message. Used by the realtime layer; enforces participation + status. */
export async function createMessage(
  user: AuthUser,
  appointmentId: string,
  text: string,
): Promise<MessageDto> {
  const appointment = await loadAppointmentForParticipant(user, appointmentId);
  if (!CHAT_STATUSES.includes(appointment.status)) {
    throw new UnprocessableError('Chat is available once the appointment is confirmed');
  }
  const message = await prisma.message.create({
    data: { appointmentId, senderId: user.id, text },
  });
  return toMessageDto(message);
}
