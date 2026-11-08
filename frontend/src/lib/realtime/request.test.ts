import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/client';
import type { AckResponse } from './events';
import { request } from './request';
import type { AppSocket } from './socket';

type Ack = (error: Error | null, response: AckResponse<unknown>) => void;

function fakeSocket(connected: boolean, answer?: (ack: Ack) => void): AppSocket {
  return {
    connected,
    timeout: () => ({ emit: (_event: string, _payload: unknown, ack: Ack) => answer?.(ack) }),
  } as unknown as AppSocket;
}

describe('request', () => {
  it('resolves with the data the server acknowledges', async () => {
    const socket = fakeSocket(true, (ack) => ack(null, { ok: true, data: { peers: [] } }));
    await expect(request(socket, 'call:join', {})).resolves.toEqual({ peers: [] });
  });

  it('rejects with the server error code and message', async () => {
    const socket = fakeSocket(true, (ack) =>
      ack(null, {
        ok: false,
        error: { code: 'UNPROCESSABLE', message: 'This call is not open yet' },
      }),
    );
    const error = await request(socket, 'call:join', {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'UNPROCESSABLE', message: 'This call is not open yet' });
  });

  it('rejects straight away when offline, without sending', async () => {
    const answer = vi.fn();
    const socket = fakeSocket(false, answer);
    await expect(request(socket, 'chat:send', {})).rejects.toMatchObject({ code: 'OFFLINE' });
    expect(answer).not.toHaveBeenCalled();
  });

  it('rejects when the server does not answer in time', async () => {
    const socket = fakeSocket(true, (ack) => ack(new Error('timeout'), { ok: true, data: null }));
    await expect(request(socket, 'chat:send', {})).rejects.toMatchObject({ code: 'TIMEOUT' });
  });
});
