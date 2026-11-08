import { createContext, useContext } from 'react';
import type { AppSocket } from '@/lib/realtime/socket';

export type RealtimeStatus = 'connecting' | 'connected' | 'offline';

export interface RealtimeValue {
  /** Null until the first render has created the connection. */
  socket: AppSocket | null;
  status: RealtimeStatus;
}

export const RealtimeContext = createContext<RealtimeValue | null>(null);

export function useRealtime(): RealtimeValue {
  const value = useContext(RealtimeContext);
  if (!value) throw new Error('useRealtime must be used inside <RealtimeProvider>');
  return value;
}
