import type { AvailabilitySlot, Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error';
import type { CreateSlotsInput, ListSlotsQuery } from './slots.schemas';
import { intervalsOverlap, validateSlotBatch } from './slots.rules';

export interface SlotDto {
  id: string;
  doctorId: string;
  startTime: Date;
  endTime: Date;
  isBooked: boolean;
}

function toSlotDto(slot: AvailabilitySlot): SlotDto {
  return {
    id: slot.id,
    doctorId: slot.doctorId,
    startTime: slot.startTime,
    endTime: slot.endTime,
    isBooked: slot.isBooked,
  };
}

export async function listDoctorSlots(doctorId: string, query: ListSlotsQuery): Promise<SlotDto[]> {
  const doctor = await prisma.doctorProfile.findFirst({
    where: { userId: doctorId, user: { isActive: true } },
    select: { userId: true },
  });
  if (!doctor) {
    throw new NotFoundError('Doctor');
  }

  const now = new Date();
  // Never list past slots, even if the client asks for an earlier "from".
  const from = query.from && query.from > now ? query.from : now;
  const where: Prisma.AvailabilitySlotWhereInput = {
    doctorId,
    startTime: { gte: from, ...(query.to ? { lte: query.to } : {}) },
    ...(query.onlyAvailable ? { isBooked: false } : {}),
  };

  const slots = await prisma.availabilitySlot.findMany({
    where,
    orderBy: { startTime: 'asc' },
    take: 500,
  });
  return slots.map(toSlotDto);
}

export async function createSlots(doctorId: string, input: CreateSlotsInput): Promise<SlotDto[]> {
  validateSlotBatch(input.slots);

  const earliest = new Date(Math.min(...input.slots.map((slot) => slot.startTime.getTime())));
  const latest = new Date(Math.max(...input.slots.map((slot) => slot.endTime.getTime())));

  const existing = await prisma.availabilitySlot.findMany({
    where: { doctorId, startTime: { lt: latest }, endTime: { gt: earliest } },
    select: { startTime: true, endTime: true },
  });
  const clashes = input.slots.some((slot) =>
    existing.some((other) =>
      intervalsOverlap(slot.startTime, slot.endTime, other.startTime, other.endTime),
    ),
  );
  if (clashes) {
    throw new ConflictError('One or more slots overlap with your existing slots');
  }

  const created = await prisma.availabilitySlot.createManyAndReturn({
    data: input.slots.map((slot) => ({
      doctorId,
      startTime: slot.startTime,
      endTime: slot.endTime,
    })),
  });
  return created.map(toSlotDto);
}

export async function deleteSlot(doctorId: string, slotId: string): Promise<void> {
  const slot = await prisma.availabilitySlot.findFirst({ where: { id: slotId, doctorId } });
  // Same error for "missing" and "someone else's" so ids cannot be probed.
  if (!slot) {
    throw new NotFoundError('Slot');
  }
  if (slot.isBooked) {
    throw new ConflictError('A booked slot cannot be deleted. Cancel the appointment first.');
  }

  // Guard against a booking that lands between the check above and the delete.
  const result = await prisma.availabilitySlot.deleteMany({
    where: { id: slotId, doctorId, isBooked: false },
  });
  if (result.count !== 1) {
    throw new ConflictError('The slot was booked in the meantime');
  }
}
