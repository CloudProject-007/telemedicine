import { describe, expect, it } from 'vitest';
import type { Slot } from '@/types/api';
import { groupSlotsByDay } from './slots';

const slot = (id: string, start: string, isBooked = false): Slot => ({
  id,
  doctorId: 'd1',
  startTime: start,
  endTime: start,
  isBooked,
});

describe('groupSlotsByDay', () => {
  it('drops booked slots and sorts within and across days', () => {
    const days = groupSlotsByDay([
      slot('c', '2026-11-05T09:00:00'),
      slot('b', '2026-11-04T11:00:00'),
      slot('a', '2026-11-04T10:00:00'),
      slot('x', '2026-11-04T12:00:00', true),
    ]);
    expect(days.map((d) => d.key)).toEqual(['2026-11-04', '2026-11-05']);
    expect(days[0]?.slots.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('returns nothing when every slot is booked', () => {
    expect(groupSlotsByDay([slot('a', '2026-11-04T10:00:00', true)])).toEqual([]);
  });

  it("can include booked slots for a doctor's own view", () => {
    const days = groupSlotsByDay(
      [slot('a', '2026-11-04T10:00:00'), slot('b', '2026-11-04T11:00:00', true)],
      { includeBooked: true },
    );
    expect(days[0]?.slots.map((s) => s.id)).toEqual(['a', 'b']);
  });
});
