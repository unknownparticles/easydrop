export interface PeerConnectionCallbacks {
  onIceCandidate: (candidate: RTCIceCandidate) => void;
  onConnectionState: (state: RTCPeerConnectionState) => void;
  onDataChannel: (channel: RTCDataChannel) => void;
}

export const createPeerConnection = async (peerId: string, isInitiator: boolean, remoteOffer: RTCSessionDescriptionInit | undefined, iceServers: RTCIceServer[], callbacks: PeerConnectionCallbacks) => {
  const pc = new RTCPeerConnection({ iceServers });

  pc.onicecandidate = (event) => {
    if (event.candidate) callbacks.onIceCandidate(event.candidate);
  };

  pc.onconnectionstatechange = () => {
    callbacks.onConnectionState(pc.connectionState);
  };

  if (isInitiator) {
    const channel = pc.createDataChannel('localdrop', { ordered: true });
    callbacks.onDataChannel(channel);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return { pc, localDescription: offer };
  }

  pc.ondatachannel = (event) => callbacks.onDataChannel(event.channel);

  if (remoteOffer) {
    await pc.setRemoteDescription(new RTCSessionDescription(remoteOffer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return { pc, localDescription: answer };
  }

  return { pc, localDescription: null };
};
