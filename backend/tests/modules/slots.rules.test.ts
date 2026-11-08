import { describe, expect, it } from 'vitest';
import { intervalsOverlap, validateSlotBatch } from '../../src/modules/slots/slots.rules';
import { UnprocessableError } from '../../src/shared/errors/app-error';

const now = new Date('2026-11-01T08:00:00Z');
const slot = (start: string, end: string) => ({
  startTime: new Date(`2026-11-01T${start}Z`),
  endTime: new Date(`2026-11-01T${end}Z`),
});

describe('intervalsOverlap', () => {
  it('treats back-to-back slots as non-overlapping', () => {
    const a = slot('09:00', '09:30');
    const b = slot('09:30', '10:00');
    expect(intervalsOverlap(a.startTime, a.endTime, b.startTime, b.endTime)).toBe(false);
  });

  it('detects partial and full overlap', () => {
    const a = slot('09:00', '10:00');
    const partial = slot('09:30', '10:30');
    const contained = slot('09:10', '09:20');
    expect(intervalsOverlap(a.startTime, a.endTime, partial.startTime, partial.endTime)).toBe(true);
    expect(intervalsOverlap(a.startTime, a.endTime, contained.startTime, contained.endTime)).toBe(
      true,
    );
  });
});

describe('validateSlotBatch', () => {
  it('accepts valid, ordered, non-overlapping slots', () => {
    expect(() =>
      validateSlotBatch(
        [slot('09:00', '09:30'), slot('09:30', '10:00'), slot('11:00', '11:45')],
        now,
      ),
    ).not.toThrow();
  });

  it('rejects slots in the past', () => {
    expect(() => validateSlotBatch([slot('07:00', '07:30')], now)).toThrow(UnprocessableError);
  });

  it('rejects end before start', () => {
    expect(() => validateSlotBatch([slot('10:00', '09:00')], now)).toThrow(UnprocessableError);
  });

  it('rejects durations outside 10-120 minutes', () => {
    expect(() => validateSlotBatch([slot('09:00', '09:05')], now)).toThrow(/duration/);
    expect(() => validateSlotBatch([slot('09:00', '11:30')], now)).toThrow(/duration/);
  });

  it('rejects overlapping slots regardless of input order', () => {
    expect(() => validateSlotBatch([slot('10:00', '10:30'), slot('09:45', '10:15')], now)).toThrow(
      /overlap/,
    );
  });
});
