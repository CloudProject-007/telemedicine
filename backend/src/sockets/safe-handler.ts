import type { z } from 'zod';
import { logger } from '../infrastructure/logger';
import { normalizeError } from '../shared/middleware/error-handler';
import type { Ack } from './types';

/**
 * Wraps a socket event handler so that it:
 *  1. validates the payload with zod,
 *  2. never throws into Socket.IO (an uncaught async error would crash or hang the event),
 *  3. always answers through the ack callback with `{ ok, data | error }`.
 */
export function safeHandler<S extends z.ZodTypeAny, R>(
  schema: S,
  handle: (input: z.infer<S>) => Promise<R>,
): (payload: unknown, ack?: Ack<R>) => void {
  return (payload, ack) => {
    const reply = typeof ack === 'function' ? ack : undefined;
    void (async () => {
      try {
        const input: z.infer<S> = schema.parse(payload);
        const data = await handle(input);
        reply?.({ ok: true, data });
      } catch (error) {
        const normalized = normalizeError(error);
        if (normalized.status >= 500) {
          logger.error({ err: error }, 'Socket handler failed');
        }
        reply?.({ ok: false, error: { code: normalized.code, message: normalized.message } });
      }
    })();
  };
}
