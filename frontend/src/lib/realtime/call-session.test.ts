import { describe, expect, it, vi } from 'vitest';
import { CallSession } from './call-session';

/** Just enough of RTCPeerConnection to exercise the negotiation rules. */
class FakePeer {
  signalingState: RTCSignalingState = 'stable';
  localDescription: { type: RTCSdpType; sdp: string } | null = null;
  connectionState: RTCPeerConnectionState = 'new';
  onnegotiationneeded: (() => void) | null = null;
  onicecandidate: unknown = null;
  ontrack: unknown = null;
  onconnectionstatechange: unknown = null;

  setRemoteDescription = vi.fn((description: RTCSessionDescriptionInit) => {
    this.signalingState = description.type === 'offer' ? 'have-remote-offer' : 'stable';
    return Promise.resolve();
  });
  setLocalDescription = vi.fn(() => {
    const answering = this.signalingState === 'have-remote-offer';
    this.localDescription = { type: answering ? 'answer' : 'offer', sdp: 'sdp' };
    this.signalingState = answering ? 'stable' : 'have-local-offer';
    return Promise.resolve();
  });
  addIceCandidate = vi.fn(() => Promise.resolve());
  addTrack = vi.fn();
  restartIce = vi.fn();
  close = vi.fn();
}

function setup(polite: boolean) {
  const peer = new FakePeer();
  const send = vi.fn();
  const onRemoteStream = vi.fn();
  const session = new CallSession({
    iceServers: [],
    polite,
    signaling: { send },
    onRemoteStream,
    onConnectionState: vi.fn(),
    createPeer: () => peer as unknown as RTCPeerConnection,
  });
  return { peer, send, onRemoteStream, session };
}

const offer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'remote' };

describe('CallSession', () => {
  it('sends an offer when the browser asks for a negotiation', async () => {
    const { peer, send } = setup(true);
    peer.onnegotiationneeded?.();
    await vi.waitFor(() =>
      expect(send).toHaveBeenCalledWith('webrtc:offer', { type: 'offer', sdp: 'sdp' }),
    );
  });

  it('answers an offer that arrives while idle', async () => {
    const { peer, send, session } = setup(false);
    await session.handleDescription(offer);
    expect(peer.setRemoteDescription).toHaveBeenCalledWith(offer);
    expect(send).toHaveBeenCalledWith('webrtc:answer', { type: 'answer', sdp: 'sdp' });
  });

  it('impolite side ignores an offer that collides with its own', async () => {
    const { peer, send, session } = setup(false);
    peer.signalingState = 'have-local-offer';
    await session.handleDescription(offer);
    expect(peer.setRemoteDescription).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('polite side gives way and answers the colliding offer', async () => {
    const { peer, send, session } = setup(true);
    peer.signalingState = 'have-local-offer';
    await session.handleDescription(offer);
    expect(peer.setRemoteDescription).toHaveBeenCalledWith(offer);
    expect(send).toHaveBeenCalledWith('webrtc:answer', expect.anything());
  });

  it('ignores candidates that fail for an offer it chose to ignore', async () => {
    const { peer, session } = setup(false);
    peer.signalingState = 'have-local-offer';
    await session.handleDescription(offer);
    peer.addIceCandidate.mockRejectedValueOnce(new Error('no remote description'));
    await expect(session.handleCandidate({ candidate: 'c' })).resolves.toBeUndefined();
  });

  it('reports candidate failures that are real', async () => {
    const { peer, session } = setup(false);
    peer.addIceCandidate.mockRejectedValueOnce(new Error('bad candidate'));
    await expect(session.handleCandidate({ candidate: 'c' })).rejects.toThrow('bad candidate');
  });

  it('closes the connection, clears the remote video and ignores later messages', async () => {
    const { peer, onRemoteStream, session } = setup(true);
    session.close();
    expect(peer.close).toHaveBeenCalled();
    expect(onRemoteStream).toHaveBeenCalledWith(null);

    await session.handleDescription(offer);
    expect(peer.setRemoteDescription).not.toHaveBeenCalled();
  });
});
