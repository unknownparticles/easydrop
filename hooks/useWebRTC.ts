import { useEffect, useRef } from 'react';
import { Device, TransferItem, TransferType } from '../types';
import { usePeerConnections } from './usePeerConnections';
import { useSignaling } from './useSignaling';
import { ShareRequest } from '../services/rtc/rtcTypes';

interface WebRTCHandlers {
  onUpdateTransfer: (id: string, patch: Partial<TransferItem>) => void;
  onAddTransfer: (item: TransferItem) => void;
}

export const useWebRTC = (deviceName: string, handlers: WebRTCHandlers) => {
  const peerRef = useRef<ReturnType<typeof usePeerConnections> | null>(null);
  const pendingRef = useRef<{
    peerId: string;
    kind: TransferType;
    text?: string;
    file?: File;
  } | null>(null);

  const signaling = useSignaling(deviceName, {
    onOffer: (from, sdp) => peerRef.current?.createConnection(from, false, sdp),
    onAnswer: (from, sdp) => peerRef.current?.handleAnswer(from, sdp),
    onIce: (from, candidate) => peerRef.current?.handleIce(from, candidate),
    onPairAccepted: (from) => {
      peerRef.current?.setPairingStatus((prev) => ({ ...prev, [from]: 'connecting' }));
      peerRef.current?.createConnection(from, true);
    },
    onPairRejected: (from) => peerRef.current?.setPairingStatus((prev) => ({ ...prev, [from]: 'rejected' }))
  });

  const peer = usePeerConnections({
    onUpdateTransfer: handlers.onUpdateTransfer,
    onAddTransfer: handlers.onAddTransfer,
    onSendSignal: signaling.sendSignal
  });

  peerRef.current = peer;

  const requestShare = (device: Device, payload: Record<string, unknown>) => {
    signaling.requestShare(device, payload);
    peer.setPairingStatus((prev) => ({ ...prev, [device.id]: 'requesting' }));
  };

  const acceptShareRequest = (request: ShareRequest) => {
    signaling.acceptShareRequest(request);
    peer.setPairingStatus((prev) => ({ ...prev, [request.from]: 'connecting' }));
  };

  const rejectShareRequest = (request: ShareRequest) => {
    signaling.rejectShareRequest(request);
    peer.setPairingStatus((prev) => ({ ...prev, [request.from]: 'rejected' }));
  };

  useEffect(() => {
    if (!pendingRef.current) return;
    if (peer.activePeerId !== pendingRef.current.peerId) return;
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending.kind === TransferType.TEXT && pending.text) peer.sendText(pending.text);
    if (pending.kind !== TransferType.TEXT && pending.file) peer.sendFile(pending.file, pending.kind);
  }, [peer.activePeerId, peer.sendFile, peer.sendText]);

  return {
    devices: signaling.devices,
    signalStatus: signaling.signalStatus,
    shareRequests: signaling.shareRequests,
    pairingStatus: peer.pairingStatus,
    activePeerId: peer.activePeerId,
    requestShare,
    acceptShareRequest,
    rejectShareRequest,
    disconnectPeer: peer.disconnectPeer,
    queueText: (device: Device, text: string) => {
      pendingRef.current = { peerId: device.id, kind: TransferType.TEXT, text };
      requestShare(device, { kind: 'text' });
    },
    queueFile: (device: Device, file: File, kind: TransferType) => {
      pendingRef.current = { peerId: device.id, kind, file };
      requestShare(device, { kind: kind === TransferType.IMAGE ? 'image' : 'file', fileName: file.name, fileSize: file.size, mimeType: file.type });
    }
  };
};
