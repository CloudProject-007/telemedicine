import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getErrorMessage } from '@/lib/errors';
import { request } from '@/lib/realtime/request';
import type { AppSocket } from '@/lib/realtime/socket';
import type { ChatMessage } from '@/types/consultation';
import { consultationKeys, useChatHistory } from './consultation-queries';
import { mergeMessages } from './messages';

interface UseChatOptions {
  socket: AppSocket | null;
  appointmentId: string;
}

export function useChat({ socket, appointmentId }: UseChatOptions) {
  const queryClient = useQueryClient();
  const history = useChatHistory(appointmentId, true);
  const [live, setLive] = useState<ChatMessage[]>([]);
  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const connectedBefore = useRef(false);

  useEffect(() => {
    if (!socket) return;

    const join = () => {
      request<null>(socket, 'chat:join', { appointmentId }).then(
        () => {
          setJoined(true);
          setJoinError(null);
        },
        (error: unknown) => setJoinError(getErrorMessage(error)),
      );
    };

    const onConnect = () => {
      // After a drop, rooms are gone and messages may have been missed, so join again and reload.
      if (connectedBefore.current) {
        void queryClient.invalidateQueries({ queryKey: consultationKeys.messages(appointmentId) });
      }
      connectedBefore.current = true;
      join();
    };

    const onMessage = (message: ChatMessage) => {
      if (message.appointmentId !== appointmentId) return;
      setLive((current) =>
        current.some((item) => item.id === message.id) ? current : [...current, message],
      );
    };

    const onDisconnect = () => setJoined(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat:message', onMessage);
    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat:message', onMessage);
      if (socket.connected) socket.emit('chat:leave', { appointmentId });
    };
  }, [socket, appointmentId, queryClient]);

  const messages = useMemo(() => {
    // Pages are newest-first; each page is oldest-first inside, so reverse the pages only.
    const loaded = [...(history.data?.pages ?? [])].reverse().flatMap((page) => page.items);
    return mergeMessages(loaded, live);
  }, [history.data, live]);

  const send = useCallback(
    async (text: string): Promise<void> => {
      if (!socket) throw new Error('Not connected');
      // The server broadcasts the saved message to everyone in the room, including the sender,
      // so it shows up through `onMessage`. No separate local copy is added here.
      await request<ChatMessage>(socket, 'chat:send', { appointmentId, text });
    },
    [socket, appointmentId],
  );

  return {
    messages,
    send,
    joined,
    joinError,
    isLoading: history.isPending,
    loadError: history.isError ? getErrorMessage(history.error) : null,
    hasOlder: history.hasNextPage,
    isLoadingOlder: history.isFetchingNextPage,
    loadOlder: () => void history.fetchNextPage(),
    reload: () => void history.refetch(),
  };
}
