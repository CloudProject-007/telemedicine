import { io, type Socket } from 'socket.io-client';
import { env } from '@/config/env';
import { refreshSession, tokenStore } from '@/lib/api/client';
import type { ClientToServerEvents, ServerToClientEvents } from './events';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * One connection for the consultation room.
 *
 * The server checks the access token once, during the handshake, and then refuses to retry on its
 * own. Access tokens last 15 minutes, so a reconnect later in a long visit can arrive with an
 * expired one. When that happens we refresh the session once and connect again.
 */
export function createAppSocket(): AppSocket {
  const socket: AppSocket = io(env.VITE_SOCKET_URL, {
    transports: ['websocket'],
    autoConnect: false,
    // A function, so every (re)connect sends whatever token is current.
    auth: (send) => send({ token: tokenStore.getAccess() ?? '' }),
  });

  let refreshing = false;
  socket.on('connect_error', (error) => {
    if (error.message !== 'UNAUTHORIZED' || refreshing) return;
    refreshing = true;
    void refreshSession()
      .then((outcome) => {
        if (outcome.kind === 'ok') socket.connect();
      })
      .finally(() => {
        refreshing = false;
      });
  });

  return socket;
}
