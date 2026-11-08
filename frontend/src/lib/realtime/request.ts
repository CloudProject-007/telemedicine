import { ApiError } from '@/lib/api/client';
import type { AckResponse } from './events';
import type { AppSocket } from './socket';

const ACK_TIMEOUT_MS = 8_000;

interface TimeoutEmitter {
  timeout: (ms: number) => {
    emit: (
      event: string,
      payload: unknown,
      ack: (error: Error | null, response: AckResponse<unknown>) => void,
    ) => void;
  };
}

/**
 * Sends one event and waits for the server's acknowledgement. Every client event on this server
 * answers with `{ ok, data | error }`, so this turns that into a promise that resolves with the
 * data or rejects with an `ApiError` (status 0, like a network failure) the UI can show.
 *
 * The cast below is the one place we step outside socket.io's generic types: its typed `emit`
 * does not model the timeout form with an acknowledgement.
 */
export function request<T>(socket: AppSocket, event: string, payload: unknown): Promise<T> {
  if (!socket.connected) {
    return Promise.reject(
      new ApiError(
        0,
        'OFFLINE',
        'You are offline. Check your connection and try again.',
        undefined,
      ),
    );
  }

  return new Promise<T>((resolve, reject) => {
    (socket as unknown as TimeoutEmitter)
      .timeout(ACK_TIMEOUT_MS)
      .emit(event, payload, (error, response) => {
        if (error) {
          reject(
            new ApiError(0, 'TIMEOUT', 'The server took too long to answer. Try again.', undefined),
          );
        } else if (response.ok) {
          resolve(response.data as T);
        } else {
          reject(new ApiError(0, response.error.code, response.error.message, undefined));
        }
      });
  });
}
