import type { ChatMessage } from '@/types/consultation';

/**
 * Joins messages loaded from history with ones that arrived live. A message can be in both (it is
 * sent live and also appears in a later history load), so duplicates are dropped by id.
 */
export function mergeMessages(history: ChatMessage[], live: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const message of [...history, ...live]) byId.set(message.id, message);

  return [...byId.values()].sort(
    (a, b) =>
      new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime() || a.id.localeCompare(b.id),
  );
}
