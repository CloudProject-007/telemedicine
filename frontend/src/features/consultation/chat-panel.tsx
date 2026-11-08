import { SendHorizontal } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { toast } from 'sonner';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/errors';
import { formatTime } from '@/lib/format';
import { useRealtime } from './realtime-context';
import { useChat } from './use-chat';

const MAX_LENGTH = 2000;
/** Only follow new messages down if the reader is already at the bottom. */
const NEAR_BOTTOM_PX = 80;

interface ChatPanelProps {
  appointmentId: string;
  selfId: string;
  otherName: string;
}

export function ChatPanel({ appointmentId, selfId, otherName }: ChatPanelProps) {
  const { socket, status } = useRealtime();
  const chat = useChat({ socket, appointmentId });
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);

  useEffect(() => {
    const list = listRef.current;
    if (list && followRef.current) list.scrollTop = list.scrollHeight;
  }, [chat.messages]);

  const onScroll = () => {
    const list = listRef.current;
    if (list)
      followRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < NEAR_BOTTOM_PX;
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      await chat.send(trimmed);
      setText('');
      followRef.current = true;
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter adds a line, and a composing IME keeps its own Enter.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  };

  const canSend = chat.joined && status === 'connected';

  return (
    <section aria-labelledby="chat-title" className="flex flex-col gap-4">
      <h2 id="chat-title" className="text-2xl">
        Chat
      </h2>

      {chat.joinError && <ErrorAlert title="Chat is not available">{chat.joinError}</ErrorAlert>}
      {chat.loadError && (
        <ErrorAlert title="Could not load earlier messages" onRetry={chat.reload}>
          {chat.loadError}
        </ErrorAlert>
      )}

      <div
        ref={listRef}
        onScroll={onScroll}
        role="log"
        aria-label={`Messages with ${otherName}`}
        aria-live="polite"
        className="h-96 space-y-3 overflow-y-auto rounded-panel border border-line bg-surface p-4"
      >
        {chat.isLoading && <Skeleton className="h-10 w-2/3" />}

        {chat.hasOlder && (
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              loading={chat.isLoadingOlder}
              onClick={chat.loadOlder}
            >
              Show earlier messages
            </Button>
          </div>
        )}

        {!chat.isLoading && chat.messages.length === 0 && (
          <p className="text-sm text-ink-soft">No messages yet. Say hello to {otherName}.</p>
        )}

        {chat.messages.map((message) => {
          const mine = message.senderId === selfId;
          return (
            <div
              key={message.id}
              className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}
            >
              <p
                className={cn(
                  'max-w-[85%] rounded-panel px-3 py-2 text-sm break-words whitespace-pre-wrap',
                  mine ? 'bg-action text-white' : 'bg-ink/8 text-ink',
                )}
              >
                {message.text}
              </p>
              <span className="mt-1 text-xs text-ink-soft">
                {mine ? 'You' : otherName}, {formatTime(message.sentAt)}
              </span>
            </div>
          );
        })}
      </div>

      <form onSubmit={(event) => void submit(event)} className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="chat-input" className="sr-only">
            Message to {otherName}
          </label>
          <textarea
            id="chat-input"
            value={text}
            rows={2}
            maxLength={MAX_LENGTH}
            placeholder="Write a message"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            className="block w-full resize-none rounded-control border border-ink/30 bg-surface px-3 py-2 placeholder:text-ink-soft/70 hover:border-ink/50"
          />
        </div>
        <Button type="submit" loading={sending} disabled={!canSend || !text.trim()}>
          <SendHorizontal aria-hidden="true" className="size-4" />
          Send
        </Button>
      </form>
      <p className="-mt-2 text-xs text-ink-soft">Enter sends. Shift and Enter adds a new line.</p>
    </section>
  );
}
