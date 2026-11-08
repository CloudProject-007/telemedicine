import type { SignalEvent } from './events';

export interface Signaling {
  send: (event: SignalEvent, data: unknown) => void;
}

export interface CallSessionOptions {
  iceServers: RTCIceServer[];
  /**
   * Decides who gives way when both sides send an offer at the same moment. Exactly one of the
   * two peers must be polite, so derive it from something both know (the user ids).
   */
  polite: boolean;
  signaling: Signaling;
  onRemoteStream: (stream: MediaStream | null) => void;
  onConnectionState: (state: RTCPeerConnectionState) => void;
  /** Replaceable in tests, where there is no WebRTC. */
  createPeer?: (config: RTCConfiguration) => RTCPeerConnection;
}

/**
 * One WebRTC connection to one other person, using the "perfect negotiation" pattern from the
 * WebRTC spec. Both sides run the same code and may offer at any time, for example when both add
 * their camera at once. A collision is settled by `polite`: the polite side rolls back its own
 * offer and accepts the other's, the impolite side ignores the incoming one.
 */
export class CallSession {
  private readonly pc: RTCPeerConnection;
  private readonly polite: boolean;
  private readonly signaling: Signaling;
  private makingOffer = false;
  private ignoreOffer = false;
  private settingRemoteAnswer = false;
  private closed = false;

  constructor(private readonly options: CallSessionOptions) {
    this.polite = options.polite;
    this.signaling = options.signaling;
    const create = options.createPeer ?? ((config) => new RTCPeerConnection(config));
    this.pc = create({ iceServers: options.iceServers });

    this.pc.onnegotiationneeded = () => void this.negotiate();

    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.signaling.send('webrtc:ice-candidate', candidate.toJSON());
    };

    this.pc.ontrack = ({ track, streams }) => {
      options.onRemoteStream(streams[0] ?? new MediaStream([track]));
    };

    this.pc.onconnectionstatechange = () => {
      options.onConnectionState(this.pc.connectionState);
      // A dropped network path: ask both sides to find a new one without ending the call.
      if (this.pc.connectionState === 'failed') this.pc.restartIce();
    };
  }

  /** Adding tracks makes the browser ask for a negotiation, which sends the first offer. */
  addLocalStream(stream: MediaStream): void {
    for (const track of stream.getTracks()) this.pc.addTrack(track, stream);
  }

  async handleDescription(description: RTCSessionDescriptionInit): Promise<void> {
    if (this.closed) return;

    const readyForOffer =
      !this.makingOffer && (this.pc.signalingState === 'stable' || this.settingRemoteAnswer);
    const collision = description.type === 'offer' && !readyForOffer;

    this.ignoreOffer = !this.polite && collision;
    if (this.ignoreOffer) return;

    this.settingRemoteAnswer = description.type === 'answer';
    await this.pc.setRemoteDescription(description); // the polite side rolls back implicitly
    this.settingRemoteAnswer = false;

    if (description.type === 'offer') {
      await this.pc.setLocalDescription();
      this.sendLocalDescription('webrtc:answer');
    }
  }

  async handleCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.closed) return;
    try {
      await this.pc.addIceCandidate(candidate);
    } catch (error) {
      // Candidates that belong to an offer we chose to ignore are expected to fail.
      if (!this.ignoreOffer) throw error;
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.pc.onnegotiationneeded = null;
    this.pc.onicecandidate = null;
    this.pc.ontrack = null;
    this.pc.onconnectionstatechange = null;
    this.pc.close();
    this.options.onRemoteStream(null);
  }

  private async negotiate(): Promise<void> {
    try {
      this.makingOffer = true;
      await this.pc.setLocalDescription();
      this.sendLocalDescription('webrtc:offer');
    } finally {
      this.makingOffer = false;
    }
  }

  private sendLocalDescription(event: 'webrtc:offer' | 'webrtc:answer'): void {
    const description = this.pc.localDescription;
    if (description) this.signaling.send(event, { type: description.type, sdp: description.sdp });
  }
}
