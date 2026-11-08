import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/format';
import { useNow } from '@/lib/use-now';
import type { Appointment } from '@/types/api';
import { CALL_OPENS_MINUTES_BEFORE, getCallAvailability } from './call-availability';
import { MediaView } from './media-view';
import { useRealtime } from './realtime-context';
import { useVideoCall } from './use-video-call';

interface CallPanelProps {
  appointment: Appointment;
  selfId: string;
  otherName: string;
}

export function CallPanel({ appointment, selfId, otherName }: CallPanelProps) {
  const { socket, status } = useRealtime();
  const call = useVideoCall({ socket, appointmentId: appointment.id, selfId });
  const availability = getCallAvailability(appointment, useNow());

  const inCall =
    call.phase === 'waiting' || call.phase === 'connecting' || call.phase === 'connected';

  return (
    <section aria-labelledby="video-title" className="space-y-4">
      <h2 id="video-title" className="text-2xl">
        Video call
      </h2>

      {status !== 'connected' && (
        <p role="status" className="rounded-control bg-signal-soft px-3 py-2 text-sm">
          {status === 'connecting'
            ? 'Connecting…'
            : 'You are offline. Reconnecting when your connection returns.'}
        </p>
      )}

      {call.error && <ErrorAlert title="Could not start the call">{call.error}</ErrorAlert>}

      {inCall || call.phase === 'starting' ? (
        <div className="space-y-3">
          <div className="relative aspect-video overflow-hidden rounded-panel bg-ink">
            {call.remoteStream ? (
              <MediaView stream={call.remoteStream} label={`${otherName}'s video`} />
            ) : (
              <p className="absolute inset-0 grid place-items-center px-6 text-center text-paper">
                {call.phase === 'starting' && 'Starting your camera…'}
                {call.phase === 'waiting' && `Waiting for ${otherName} to join`}
                {call.phase === 'connecting' && `Connecting to ${otherName}…`}
              </p>
            )}
            {call.localStream && (
              <div className="absolute right-3 bottom-3 h-24 w-36 overflow-hidden rounded-control border-2 border-paper bg-ink">
                <MediaView stream={call.localStream} label="Your video" muted mirrored />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              aria-pressed={!call.micOn}
              onClick={call.toggleMic}
              disabled={!call.localStream}
            >
              {call.micOn ? (
                <Mic aria-hidden="true" className="size-4" />
              ) : (
                <MicOff aria-hidden="true" className="size-4" />
              )}
              {call.micOn ? 'Mute' : 'Unmute'}
            </Button>
            {call.hasCamera && (
              <Button variant="secondary" aria-pressed={!call.camOn} onClick={call.toggleCamera}>
                {call.camOn ? (
                  <Video aria-hidden="true" className="size-4" />
                ) : (
                  <VideoOff aria-hidden="true" className="size-4" />
                )}
                {call.camOn ? 'Turn camera off' : 'Turn camera on'}
              </Button>
            )}
            <Button variant="danger" onClick={call.leave}>
              <PhoneOff aria-hidden="true" className="size-4" />
              Leave call
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-panel border border-line bg-surface p-6">
          {availability.state === 'open' && (
            <>
              <p className="text-ink-soft">
                Your browser will ask to use your camera and microphone. Only {otherName} can see
                and hear you.
              </p>
              <Button size="lg" onClick={call.start} disabled={!socket || status !== 'connected'}>
                <Video aria-hidden="true" className="size-4" />
                Join video call
              </Button>
            </>
          )}
          {availability.state === 'early' && (
            <p>
              The call opens at <strong>{formatTime(availability.opensAt)}</strong>. You can join{' '}
              {CALL_OPENS_MINUTES_BEFORE} minutes before the start time.
            </p>
          )}
          {availability.state === 'ended' && (
            <p>This call has ended. You can still use the chat.</p>
          )}
          {availability.state === 'unavailable' && (
            <p>Video is only available for confirmed appointments.</p>
          )}
        </div>
      )}
    </section>
  );
}
