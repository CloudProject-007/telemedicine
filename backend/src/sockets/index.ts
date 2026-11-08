import type { Server as HttpServer } from 'node:http';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { Server } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../infrastructure/logger';
import { socketAuthMiddleware } from './auth.middleware';
import { registerCallHandlers } from './call.handlers';
import { registerChatHandlers } from './chat.handlers';
import type { TypedServer } from './types';

export interface RealtimeServer {
  io: TypedServer;
  /** Disconnects clients, closes the HTTP server and Redis connections. */
  close: () => Promise<void>;
}

/**
 * Attaches Socket.IO to the HTTP server.
 *
 * Scaling notes:
 *  - WebSocket-only transport: no sticky sessions needed behind the load balancer.
 *  - Set REDIS_URL to enable the Redis adapter so rooms and broadcasts work across instances
 *    (mandatory as soon as the Auto Scaling Group runs more than one instance).
 */
export async function createRealtimeServer(httpServer: HttpServer): Promise<RealtimeServer> {
  const io: TypedServer = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGINS, credentials: true },
    transports: ['websocket'],
    maxHttpBufferSize: 64 * 1024,
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  const redisClients: ReturnType<typeof createClient>[] = [];
  if (env.REDIS_URL) {
    const pubClient = createClient({ url: env.REDIS_URL });
    const subClient = pubClient.duplicate();
    for (const client of [pubClient, subClient]) {
      client.on('error', (error: unknown) => logger.error({ err: error }, 'Redis client error'));
    }
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    redisClients.push(pubClient, subClient);
    logger.info('Socket.IO Redis adapter enabled');
  } else if (env.NODE_ENV === 'production') {
    logger.warn('REDIS_URL not set: realtime features only work with a single instance');
  }

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    logger.debug({ socketId: socket.id, userId: socket.data.user.id }, 'Socket connected');
    registerChatHandlers(io, socket);
    registerCallHandlers(io, socket);
    socket.on('disconnect', (reason) => {
      logger.debug({ socketId: socket.id, reason }, 'Socket disconnected');
    });
  });

  return {
    io,
    close: async () => {
      // io.close() also closes the underlying HTTP server.
      await new Promise<void>((resolve) => {
        void io.close(() => resolve());
      });
      await Promise.all(redisClients.map((client) => client.quit().catch(() => undefined)));
    },
  };
}
