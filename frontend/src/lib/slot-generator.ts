import { addMinutes, isBefore } from 'date-fns';
import type { NewSlot } from '@/lib/api/slots.api';

/** The backend accepts at most 50 slots per request, from 10 to 120 minutes long. */
export const MAX_SLOTS_PER_BATCH = 50;
export const SLOT_LENGTHS = [15, 20, 30, 45, 60] as const;

export interface SlotPlan {
  /** Local calendar day, "2026-11-04". */
  date: string;
  /** Local time, "09:00". */
  from: string;
  /** Local time, "13:00". */
  to: string;
  minutes: number;
}

export type SlotPlanResult = { ok: true; slots: NewSlot[] } | { ok: false; message: string };

function parseLocal(date: string, time: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const clock = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match || !clock) return null;
  const result = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(clock[1]),
    Number(clock[2]),
  );
  return Number.isNaN(result.getTime()) ? null : result;
}

/**
 * Cuts a working window into back-to-back slots of equal length, in the viewer's own time zone.
 * A leftover shorter than one slot is dropped, so every slot has the full length.
 */
export function planSlots(plan: SlotPlan, now: Date = new Date()): SlotPlanResult {
  const start = parseLocal(plan.date, plan.from);
  const end = parseLocal(plan.date, plan.to);

  if (!start || !end) return { ok: false, message: 'Enter a date and both times.' };
  if (!isBefore(start, end))
    return { ok: false, message: 'The end time must be after the start time.' };
  if (!isBefore(now, start)) return { ok: false, message: 'Choose a start time in the future.' };

  const slots: NewSlot[] = [];
  let cursor = start;
  while (!isBefore(end, addMinutes(cursor, plan.minutes))) {
    const next = addMinutes(cursor, plan.minutes);
    slots.push({ startTime: cursor.toISOString(), endTime: next.toISOString() });
    cursor = next;
  }

  if (slots.length === 0) {
    return {
      ok: false,
      message: 'That window is shorter than one slot. Widen it or shorten the slot.',
    };
  }
  if (slots.length > MAX_SLOTS_PER_BATCH) {
    return {
      ok: false,
      message: `That makes ${slots.length} slots. Add at most ${MAX_SLOTS_PER_BATCH} at a time.`,
    };
  }
  return { ok: true, slots };
}
