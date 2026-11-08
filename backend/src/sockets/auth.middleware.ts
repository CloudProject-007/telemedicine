import { verifyAccessToken } from '../shared/auth/jwt';
import type { TypedSocket } from './types';

const BEARER_PREFIX = 'Bearer ';

function extractToken(socket: TypedSocket): string | undefined {
  const authToken: unknown = socket.handshake.auth?.['token'];
  if (typeof authToken === 'string' && authToken.length > 0) {
    return authToken;
  }
  const header = socket.handshake.headers.authorization;
  return header?.startsWith(BEARER_PREFIX) ? header.slice(BEARER_PREFIX.length).trim() : undefined;
}

/**
 * Rejects the handshake unless a valid access token is supplied via
 * `io(url, { auth: { token } })`. The token is verified once per connection, so clients
 * must reconnect with a fresh token after it expires (the client SDK does this on 'connect_error').
 */
export function socketAuthMiddleware(socket: TypedSocket, next: (error?: Error) => void): void {
  const token = extractToken(socket);
  if (!token) {
    next(new Error('UNAUTHORIZED'));
    return;
  }
  try {
    socket.data.user = verifyAccessToken(token);
    next();
  } catch {
    next(new Error('UNAUTHORIZED'));
  }
}
