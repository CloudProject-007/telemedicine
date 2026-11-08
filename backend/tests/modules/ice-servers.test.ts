import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildIceServers } from '../../src/modules/webrtc/ice-servers';

const NOW_MS = 1_700_000_000_000;

describe('buildIceServers', () => {
  it('returns STUN only when TURN is not configured', () => {
    const result = buildIceServers(
      'user-1',
      {
        STUN_URLS: ['stun:stun.example.com:3478'],
        TURN_URLS: undefined,
        TURN_SECRET: undefined,
        TURN_CREDENTIAL_TTL_SECONDS: 3600,
      },
      NOW_MS,
    );
    expect(result.iceServers).toEqual([{ urls: ['stun:stun.example.com:3478'] }]);
    expect(result.ttlSeconds).toBe(0);
  });

  it('issues time-limited TURN credentials using the coturn REST scheme', () => {
    const result = buildIceServers(
      'user-1',
      {
        STUN_URLS: ['stun:stun.example.com:3478'],
        TURN_URLS: ['turn:turn.example.com:3478?transport=udp'],
        TURN_SECRET: 'shared-secret',
        TURN_CREDENTIAL_TTL_SECONDS: 3600,
      },
      NOW_MS,
    );

    const expiry = Math.floor(NOW_MS / 1000) + 3600;
    const username = `${expiry}:user-1`;
    const credential = createHmac('sha1', 'shared-secret').update(username).digest('base64');

    expect(result.ttlSeconds).toBe(3600);
    expect(result.iceServers).toHaveLength(2);
    expect(result.iceServers[1]).toEqual({
      urls: ['turn:turn.example.com:3478?transport=udp'],
      username,
      credential,
    });
  });
});
