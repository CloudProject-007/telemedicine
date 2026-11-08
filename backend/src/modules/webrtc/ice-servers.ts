import { createHmac } from 'node:crypto';
import { env, type Env } from '../../config/env';

export interface IceServer {
  urls: string[];
  username?: string;
  credential?: string;
}

export interface IceServerConfig {
  iceServers: IceServer[];
  /** Seconds until TURN credentials expire (0 when only STUN is configured). */
  ttlSeconds: number;
}

type IceEnv = Pick<Env, 'STUN_URLS' | 'TURN_URLS' | 'TURN_SECRET' | 'TURN_CREDENTIAL_TTL_SECONDS'>;

/**
 * Builds the ICE server list for a WebRTC client.
 * TURN credentials use coturn's "use-auth-secret" scheme (TURN REST API): the username is
 * `<expiryUnix>:<userId>` and the password is base64(HMAC-SHA1(secret, username)).
 * Credentials are short-lived and never stored, so a leaked one stops working on its own.
 */
export function buildIceServers(
  userId: string,
  config: IceEnv = env,
  nowMs: number = Date.now(),
): IceServerConfig {
  const iceServers: IceServer[] = [{ urls: config.STUN_URLS }];

  if (!config.TURN_URLS || config.TURN_URLS.length === 0 || !config.TURN_SECRET) {
    return { iceServers, ttlSeconds: 0 };
  }

  const expiresAt = Math.floor(nowMs / 1000) + config.TURN_CREDENTIAL_TTL_SECONDS;
  const username = `${expiresAt}:${userId}`;
  const credential = createHmac('sha1', config.TURN_SECRET).update(username).digest('base64');
  iceServers.push({ urls: config.TURN_URLS, username, credential });

  return { iceServers, ttlSeconds: config.TURN_CREDENTIAL_TTL_SECONDS };
}
