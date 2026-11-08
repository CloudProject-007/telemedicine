import { format } from 'date-fns';
import type { Slot } from '@/types/api';

export interface SlotDay {
  /** Local calendar day, "2026-11-04". Stable key for the day. */
  key: string;
  /** Start of that day's first slot, handy for formatting the day label. */
  date: Date;
  slots: Slot[];
}

/** Groups slots (open ones only, unless `includeBooked`) by the viewer's local calendar day, earliest day and time first. */
export function groupSlotsByDay(
  slots: Slot[],
  { includeBooked = false }: { includeBooked?: boolean } = {},
): SlotDay[] {
  const days = new Map<string, SlotDay>();

  const sorted = [...slots]
    .filter((slot) => includeBooked || !slot.isBooked)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  for (const slot of sorted) {
    const start = new Date(slot.startTime);
    const key = format(start, 'yyyy-MM-dd');
    const day = days.get(key);
    if (day) {
      day.slots.push(slot);
    } else {
      days.set(key, { key, date: start, slots: [slot] });
    }
  }
  return [...days.values()];
}
