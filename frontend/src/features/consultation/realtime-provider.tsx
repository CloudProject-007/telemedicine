import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createAppSocket, type AppSocket } from '@/lib/realtime/socket';
import { RealtimeContext, type RealtimeStatus } from './realtime-context';

/** Owns the one socket for the consultation room and closes it when the room closes. */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<AppSocket | null>(null);
  const [status, setStatus] = useState<RealtimeStatus>('connecting');

  useEffect(() => {
    const next = createAppSocket();

    next.on('connect', () => setStatus('connected'));
    next.on('disconnect', () => setStatus('offline'));
    next.on('connect_error', () => setStatus('offline'));
    next.io.on('reconnect_attempt', () => setStatus('connecting'));

    setSocket(next);
    next.connect();

    return () => {
      next.removeAllListeners();
      next.io.removeAllListeners();
      next.disconnect();
      setSocket(null);
    };
  }, []);

  const value = useMemo(() => ({ socket, status }), [socket, status]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
