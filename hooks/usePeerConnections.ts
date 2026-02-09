import { useRef, useState } from 'react';
import { TransferItem, TransferType, TransferStatus } from '../types';
import { TransferManager } from '../services/rtc/transferManager';
import { createPeerConnection } from '../services/rtc/peerConnection';

const STORAGE_KEYS = {
  turnUrl: 'localdrop_turn_url',
  turnUsername: 'localdrop_turn_username',
  turnCredential: 'localdrop_turn_credential'
};

interface PeerHandlers {
  onUpdateTransfer: (id: string, patch: Partial<TransferItem>) => void;
  onAddTransfer: (item: TransferItem) => void;
  onSendSignal: (type: string, payload: Record<string, unknown>) => void;
}

export const usePeerConnections = (handlers: PeerHandlers) => {
  const [pairingStatus, setPairingStatus] = useState<Record<string, TransferStatus | 'idle' | 'requesting' | 'connecting' | 'connected' | 'rejected'>>({});
  const [activePeerId, setActivePeerId] = useState<string | null>(null);
  const peerRef = useRef(new Map<string, RTCPeerConnection>());
  const dataChannelRef = useRef(new Map<string, RTCDataChannel>());
  const transferManagerRef = useRef(new TransferManager({
    onUpdateTransfer: handlers.onUpdateTransfer,
    onAddTransfer: handlers.onAddTransfer,
    sendData: (peerId, data) => sendData(peerId, data)
  }));

  const sendData = (peerId: string, data: string | ArrayBuffer) => {
    const channel = dataChannelRef.current.get(peerId);
    if (!channel || channel.readyState !== 'open') return;
    channel.send(data);
  };

  const setupDataChannel = (peerId: string, channel: RTCDataChannel) => {
    dataChannelRef.current.set(peerId, channel);
    channel.onopen = () => {
      setPairingStatus((prev) => ({ ...prev, [peerId]: 'connected' }));
      setActivePeerId(peerId);
      transferManagerRef.current.resumePending(peerId);
    };
    channel.onclose = () => {
      setPairingStatus((prev) => ({ ...prev, [peerId]: 'paused' }));
    };
    channel.onmessage = (event) => {
      if (typeof event.data === 'string') transferManagerRef.current.handleControlMessage(peerId, event.data);
      else transferManagerRef.current.handleChunkMessage(peerId, event.data);
    };
  };

  const buildIceServers = () => {
    const turnUrl = localStorage.getItem(STORAGE_KEYS.turnUrl) || '';
    const turnUsername = localStorage.getItem(STORAGE_KEYS.turnUsername) || '';
    const turnCredential = localStorage.getItem(STORAGE_KEYS.turnCredential) || '';
    const iceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
    if (turnUrl) iceServers.push({ urls: turnUrl, username: turnUsername || undefined, credential: turnCredential || undefined });
    return iceServers;
  };

  const createConnection = async (peerId: string, isInitiator: boolean, remoteOffer?: RTCSessionDescriptionInit) => {
    const existing = peerRef.current.get(peerId);
    if (existing) {
      try { existing.close(); } catch { /* ignore */ }
      peerRef.current.delete(peerId);
      dataChannelRef.current.delete(peerId);
    }

    const { pc, localDescription } = await createPeerConnection(peerId, isInitiator, remoteOffer, buildIceServers(), {
      onIceCandidate: (candidate) => handlers.onSendSignal('rtc:ice', { to: peerId, candidate }),
      onConnectionState: (state) => {
        if (state === 'connected') {
          setPairingStatus((prev) => ({ ...prev, [peerId]: 'connected' }));
          setActivePeerId(peerId);
          transferManagerRef.current.resumePending(peerId);
        }
        if (state === 'failed' || state === 'disconnected') {
          setPairingStatus((prev) => ({ ...prev, [peerId]: 'paused' }));
          peerRef.current.delete(peerId);
          dataChannelRef.current.delete(peerId);
        }
      },
      onDataChannel: (channel) => setupDataChannel(peerId, channel)
    });

    peerRef.current.set(peerId, pc);
    setPairingStatus((prev) => ({ ...prev, [peerId]: 'connecting' }));

    if (localDescription) {
      handlers.onSendSignal(isInitiator ? 'rtc:offer' : 'rtc:answer', { to: peerId, sdp: localDescription });
    }
  };

  const disconnectPeer = () => {
    if (!activePeerId) return;
    const pc = peerRef.current.get(activePeerId);
    const dc = dataChannelRef.current.get(activePeerId);
    dc?.close();
    pc?.close();
    peerRef.current.delete(activePeerId);
    dataChannelRef.current.delete(activePeerId);
    setPairingStatus((prev) => ({ ...prev, [activePeerId]: 'idle' }));
    setActivePeerId(null);
  };

  return {
    pairingStatus,
    activePeerId,
    setPairingStatus,
    createConnection,
    handleAnswer: (from: string, sdp: RTCSessionDescriptionInit) => {
      const pc = peerRef.current.get(from);
      if (pc) pc.setRemoteDescription(new RTCSessionDescription(sdp));
    },
    handleIce: (from: string, candidate: RTCIceCandidateInit) => {
      const pc = peerRef.current.get(from);
      if (pc) pc.addIceCandidate(new RTCIceCandidate(candidate));
    },
    sendText: (text: string) => activePeerId && transferManagerRef.current.sendText(activePeerId, text),
    sendFile: (file: File, kind: TransferType) => activePeerId && transferManagerRef.current.sendFile(activePeerId, file, kind),
    disconnectPeer
  };
};
