import { useCallback, useEffect, useRef, useState } from 'react';
import { consultationApi } from '@/lib/api/consultation.api';
import { getErrorMessage } from '@/lib/errors';
import { CallSession } from '@/lib/realtime/call-session';
import type { JoinResult, SignalEnvelope } from '@/lib/realtime/events';
import { describeMediaError, requestMedia } from '@/lib/realtime/media';
import { request } from '@/lib/realtime/request';
import type { AppSocket } from '@/lib/realtime/socket';

export type CallPhase = 'idle' | 'starting' | 'waiting' | 'connecting' | 'connected' | 'error';

interface UseVideoCallOptions {
  socket: AppSocket | null;
  appointmentId: string;
  selfId: string;
}

export function useVideoCall({ socket, appointmentId, selfId }: UseVideoCallOptions) {
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  // Refs hold what event handlers need to read without re-registering them on every render.
  const sessionRef = useRef<CallSession | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const iceServersRef = useRef<RTCIceServer[]>([]);
  const joinedRef = useRef(false);

  const closeSession = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
  }, []);

  const releaseMedia = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setLocalStream(null);
  }, []);

  /** Starts the connection to the other person. Safe to call again: it replaces the old one. */
  const openSession = useCallback(
    (peerId: string) => {
      if (!socket || !streamRef.current) return;
      closeSession();

      const session = new CallSession({
        iceServers: iceServersRef.current,
        // Both sides compare the same two ids, so exactly one of them is polite.
        polite: selfId > peerId,
        signaling: {
          send: (event, data) => socket.emit(event, { appointmentId, data }),
        },
        onRemoteStream: setRemoteStream,
        onConnectionState: (state) => {
          if (state === 'connected') setPhase('connected');
          else if (state === 'new' || state === 'connecting' || state === 'disconnected') {
            setPhase('connecting');
          }
        },
      });
      session.addLocalStream(streamRef.current);
      sessionRef.current = session;
      setPhase('connecting');
    },
    [socket, appointmentId, selfId, closeSession],
  );

  const joinRoom = useCallback(async () => {
    if (!socket) return;
    const { peers } = await request<JoinResult>(socket, 'call:join', { appointmentId });
    const other = peers[0];
    if (other) openSession(other.userId);
    else setPhase('waiting');
  }, [socket, appointmentId, openSession]);

  const cleanup = useCallback(() => {
    joinedRef.current = false;
    closeSession();
    releaseMedia();
    setMicOn(true);
    setCamOn(true);
  }, [closeSession, releaseMedia]);

  const start = useCallback(async () => {
    if (!socket || (phase !== 'idle' && phase !== 'error')) return;
    setError(null);
    setPhase('starting');

    try {
      const stream = await requestMedia();
      streamRef.current = stream;
      setLocalStream(stream);

      const config = await consultationApi.iceServers();
      iceServersRef.current = config.iceServers;

      joinedRef.current = true;
      await joinRoom();
    } catch (failure) {
      cleanup();
      setError(
        failure instanceof DOMException ? describeMediaError(failure) : getErrorMessage(failure),
      );
      setPhase('error');
    }
  }, [socket, phase, joinRoom, cleanup]);

  const leave = useCallback(() => {
    if (socket?.connected && joinedRef.current) socket.emit('call:leave', { appointmentId });
    cleanup();
    setPhase('idle');
  }, [socket, appointmentId, cleanup]);

  // Messages from the other person.
  useEffect(() => {
    if (!socket) return;

    const sessionFor = (peerId: string): CallSession | null => {
      if (!joinedRef.current) return null;
      if (!sessionRef.current) openSession(peerId);
      return sessionRef.current;
    };

    const onPeerJoined = (event: { appointmentId: string; userId: string }) => {
      if (event.appointmentId !== appointmentId || event.userId === selfId || !joinedRef.current)
        return;
      openSession(event.userId);
    };

    const onPeerLeft = (event: { appointmentId: string; userId: string }) => {
      if (event.appointmentId !== appointmentId || !joinedRef.current) return;
      closeSession();
      setPhase('waiting');
    };

    const onDescription = (envelope: SignalEnvelope) => {
      if (envelope.appointmentId !== appointmentId) return;
      void sessionFor(envelope.from)?.handleDescription(envelope.data as RTCSessionDescriptionInit);
    };

    const onCandidate = (envelope: SignalEnvelope) => {
      if (envelope.appointmentId !== appointmentId) return;
      void sessionFor(envelope.from)?.handleCandidate(envelope.data as RTCIceCandidateInit);
    };

    // After the connection drops and returns, the server has forgotten that we were in the call.
    const onReconnect = () => {
      if (!joinedRef.current) return;
      closeSession();
      joinRoom().catch((failure: unknown) => {
        setError(getErrorMessage(failure));
        setPhase('error');
      });
    };

    socket.on('call:peer-joined', onPeerJoined);
    socket.on('call:peer-left', onPeerLeft);
    socket.on('webrtc:offer', onDescription);
    socket.on('webrtc:answer', onDescription);
    socket.on('webrtc:ice-candidate', onCandidate);
    socket.io.on('reconnect', onReconnect);

    return () => {
      socket.off('call:peer-joined', onPeerJoined);
      socket.off('call:peer-left', onPeerLeft);
      socket.off('webrtc:offer', onDescription);
      socket.off('webrtc:answer', onDescription);
      socket.off('webrtc:ice-candidate', onCandidate);
      socket.io.off('reconnect', onReconnect);
    };
  }, [socket, appointmentId, selfId, openSession, closeSession, joinRoom]);

  // Leaving the page ends the call and releases the camera.
  useEffect(
    () => () => {
      if (socket?.connected && joinedRef.current) socket.emit('call:leave', { appointmentId });
      cleanup();
    },
    [socket, appointmentId, cleanup],
  );

  const toggle = (kind: 'audio' | 'video') => {
    const tracks =
      kind === 'audio' ? streamRef.current?.getAudioTracks() : streamRef.current?.getVideoTracks();
    if (!tracks?.length) return;
    const enabled = !tracks[0]?.enabled;
    tracks.forEach((track) => {
      track.enabled = enabled;
    });
    (kind === 'audio' ? setMicOn : setCamOn)(enabled);
  };

  return {
    phase,
    error,
    localStream,
    remoteStream,
    micOn,
    camOn,
    hasCamera: (localStream?.getVideoTracks().length ?? 0) > 0,
    start: () => void start(),
    leave,
    toggleMic: () => toggle('audio'),
    toggleCamera: () => toggle('video'),
  };
}
