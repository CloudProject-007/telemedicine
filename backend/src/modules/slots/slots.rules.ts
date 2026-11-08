import { UnprocessableError } from '../../shared/errors/app-error';
import { MAX_SLOT_MINUTES, MIN_SLOT_MINUTES, type SlotInput } from './slots.schemas';

const MS_PER_MINUTE = 60_000;

/** True when the half-open intervals [aStart, aEnd) and [bStart, bEnd) intersect. */
export function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Validates a batch of slots a doctor wants to publish:
 * each slot is in the future, has a sensible duration, and none overlap each other.
 */
export function validateSlotBatch(slots: SlotInput[], now: Date = new Date()): void {
  for (const slot of slots) {
    if (slot.endTime <= slot.startTime) {
      throw new UnprocessableError('Slot end time must be after its start time');
    }
    if (slot.startTime <= now) {
      throw new UnprocessableError('Slots must start in the future');
    }
    const minutes = (slot.endTime.getTime() - slot.startTime.getTime()) / MS_PER_MINUTE;
    if (minutes < MIN_SLOT_MINUTES || minutes > MAX_SLOT_MINUTES) {
      throw new UnprocessableError(
        `Slot duration must be between ${MIN_SLOT_MINUTES} and ${MAX_SLOT_MINUTES} minutes`,
      );
    }
  }

  const sorted = [...slots].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (
      previous &&
      current &&
      intervalsOverlap(previous.startTime, previous.endTime, current.startTime, current.endTime)
    ) {
      throw new UnprocessableError('Slots in the request overlap each other');
    }
  }
}
