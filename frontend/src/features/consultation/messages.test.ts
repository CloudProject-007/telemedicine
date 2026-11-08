import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '@/types/consultation';
import { mergeMessages } from './messages';

const message = (id: string, sentAt: string, text = id): ChatMessage => ({
  id,
  appointmentId: 'a',
  senderId: 's',
  text,
  sentAt,
});

describe('mergeMessages', () => {
  it('drops a message that is in both history and live', () => {
    const merged = mergeMessages(
      [message('1', '2026-11-04T10:00:00Z')],
      [message('1', '2026-11-04T10:00:00Z'), message('2', '2026-11-04T10:01:00Z')],
    );
    expect(merged.map((m) => m.id)).toEqual(['1', '2']);
  });

  it('orders by time, then by id for messages sent in the same moment', () => {
    const merged = mergeMessages(
      [message('b', '2026-11-04T10:00:00Z'), message('a', '2026-11-04T10:00:00Z')],
      [message('c', '2026-11-04T09:59:00Z')],
    );
    expect(merged.map((m) => m.id)).toEqual(['c', 'a', 'b']);
  });

  it('returns an empty list for no messages', () => {
    expect(mergeMessages([], [])).toEqual([]);
  });
});
