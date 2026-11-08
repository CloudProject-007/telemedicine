import { describe, expect, it } from 'vitest';
import { MAX_SLOTS_PER_BATCH, planSlots } from './slot-generator';

const now = new Date(2026, 10, 1, 8, 0); // 1 Nov 2026, 08:00 local
const base = { date: '2026-11-04', from: '09:00', to: '11:00', minutes: 30 };

describe('planSlots', () => {
  it('cuts the window into back-to-back slots', () => {
    const result = planSlots(base, now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.slots).toHaveLength(4);
    expect(result.slots[0]?.startTime).toBe(new Date(2026, 10, 4, 9, 0).toISOString());
    expect(result.slots[3]?.endTime).toBe(new Date(2026, 10, 4, 11, 0).toISOString());
    // every slot starts exactly when the previous one ends
    result.slots.slice(1).forEach((slot, index) => {
      expect(slot.startTime).toBe(result.slots[index]?.endTime);
    });
  });

  it('drops a leftover shorter than one slot', () => {
    const result = planSlots({ ...base, to: '10:50' }, now);
    expect(result.ok && result.slots.length).toBe(3);
  });

  it('rejects an end before the start', () => {
    expect(planSlots({ ...base, from: '12:00', to: '09:00' }, now).ok).toBe(false);
  });

  it('rejects a start in the past', () => {
    expect(planSlots({ ...base, date: '2026-10-31' }, now).ok).toBe(false);
  });

  it('rejects a window shorter than one slot', () => {
    expect(planSlots({ ...base, to: '09:20' }, now).ok).toBe(false);
  });

  it('rejects more slots than the API accepts in one request', () => {
    const result = planSlots({ ...base, from: '00:00', to: '23:59', minutes: 15 }, now);
    expect(MAX_SLOTS_PER_BATCH).toBe(50);
    expect(result.ok).toBe(false);
  });

  it('rejects missing input', () => {
    expect(planSlots({ ...base, date: '' }, now).ok).toBe(false);
  });
});
