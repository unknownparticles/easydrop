import { useRef } from 'react';
import { Device, TransferItem, TransferType } from '../types';
import { usePeerConnections } from './usePeerConnections';
import { useSignaling } from './useSignaling';
import { ShareRequest } from '../services/rtc/rtcTypes';
import { generateId } from '../utils/id';

interface WebRTCHandlers {
  onUpdateTransfer: (id: string, patch: Partial<TransferItem>) => void;
  onAddTransfer: (item: TransferItem) => void;
}

interface WebRTCOptions {
  enableRelayFallback?: boolean;
}

export const useWebRTC = (deviceName: string, handlers: WebRTCHandlers, options: WebRTCOptions = {}) => {
  const relayFallbackEnabled = options.enableRelayFallback ?? true;
  const peerRef = useRef<ReturnType<typeof usePeerConnections> | null>(null);
  const relayReceiveRef = useRef(new Map<string, {
    from: string;
    kind: TransferType;
    name: string;
    mime: string;
    totalChunks: number;
    chunks: string[];
    receivedCount: number;
    transferId: string;
  }>());

  const base64ToBlobUrl = (chunks: string[], mime: string) => {
    const bytes: number[] = [];
    for (const chunk of chunks) {
      const binary = atob(chunk);
      for (let i = 0; i < binary.length; i += 1) bytes.push(binary.charCodeAt(i));
    }
    return URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: mime || 'application/octet-stream' }));
  };

  const sendFileByRelay = async (device: Device, file: File, kind: TransferType) => {
    const fileId = generateId();
    const transferId = generateId();
    const chunkSize = 48 * 1024;
    const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));
    const mime = file.type || 'application/octet-stream';
    const objectUrl = URL.createObjectURL(file);

    handlers.onAddTransfer({
      id: transferId,
      type: kind,
      content: objectUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: mime,
      timestamp: Date.now(),
      sender: '本地设备',
      direction: 'sent',
      status: 'sending',
      progress: 0
    });

    signaling.sendSignal('relay:file-meta', {
      to: device.id,
      fileId,
      name: file.name,
      mime,
      size: file.size,
      totalChunks,
      kind: kind === TransferType.IMAGE ? 'image' : 'file'
    });

    for (let index = 0; index < totalChunks; index += 1) {
      const start = index * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const buffer = await file.slice(start, end).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
      signaling.sendSignal('relay:file-chunk', {
        to: device.id,
        fileId,
        index,
        data: btoa(binary)
      });
      const progress = Math.floor(((index + 1) / totalChunks) * 100);
      handlers.onUpdateTransfer(transferId, { progress, status: progress === 100 ? 'completed' : 'sending' });
    }

    signaling.sendSignal('relay:file-complete', { to: device.id, fileId });
  };

  const signaling = useSignaling(deviceName, {
    onOffer: (from, sdp) => peerRef.current?.createConnection(from, false, sdp),
    onAnswer: (from, sdp) => peerRef.current?.handleAnswer(from, sdp),
    onIce: (from, candidate) => peerRef.current?.handleIce(from, candidate),
    onPairAccepted: (from) => {
      peerRef.current?.setPairingStatus((prev) => ({ ...prev, [from]: 'connecting' }));
      peerRef.current?.createConnection(from, true);
    },
    onPairRejected: (from) => peerRef.current?.setPairingStatus((prev) => ({ ...prev, [from]: 'rejected' })),
    onTextMessage: (from, text) => {
      handlers.onAddTransfer({
        id: generateId(),
        type: TransferType.TEXT,
        content: text,
        fileName: '文字消息',
        fileSize: text.length,
        mimeType: 'text/plain',
        timestamp: Date.now(),
        sender: from,
        direction: 'received',
        status: 'completed',
        progress: 100
      });
    },
    onRelayFileMeta: (from, payload) => {
      const fileId = String(payload.fileId || '');
      if (!fileId) return;
      const kind = payload.kind === 'image' ? TransferType.IMAGE : TransferType.FILE;
      const name = String(payload.name || 'shared-file');
      const mime = String(payload.mime || 'application/octet-stream');
      const totalChunks = Number(payload.totalChunks || 0);
      const transferId = generateId();
      handlers.onAddTransfer({
        id: transferId,
        type: kind,
        content: '',
        fileName: name,
        fileSize: Number(payload.size || 0),
        mimeType: mime,
        timestamp: Date.now(),
        sender: from,
        direction: 'received',
        status: 'receiving',
        progress: 0
      });
      relayReceiveRef.current.set(fileId, {
        from,
        kind,
        name,
        mime,
        totalChunks: Math.max(1, totalChunks),
        chunks: Array(Math.max(1, totalChunks)).fill(''),
        receivedCount: 0,
        transferId
      });
    },
    onRelayFileChunk: (_from, payload) => {
      const fileId = String(payload.fileId || '');
      const index = Number(payload.index);
      const data = String(payload.data || '');
      const state = relayReceiveRef.current.get(fileId);
      if (!state || !data || Number.isNaN(index) || index < 0 || index >= state.totalChunks) return;
      if (!state.chunks[index]) {
        state.chunks[index] = data;
        state.receivedCount += 1;
        const progress = Math.floor((state.receivedCount / state.totalChunks) * 100);
        handlers.onUpdateTransfer(state.transferId, { progress, status: progress === 100 ? 'completed' : 'receiving' });
      }
    },
    onRelayFileComplete: (_from, payload) => {
      const fileId = String(payload.fileId || '');
      const state = relayReceiveRef.current.get(fileId);
      if (!state) return;
      if (state.receivedCount !== state.totalChunks) return;
      handlers.onUpdateTransfer(state.transferId, {
        content: base64ToBlobUrl(state.chunks, state.mime),
        status: 'completed',
        progress: 100
      });
      relayReceiveRef.current.delete(fileId);
    }
  });

  const peer = usePeerConnections({
    onUpdateTransfer: handlers.onUpdateTransfer,
    onAddTransfer: handlers.onAddTransfer,
    onSendSignal: signaling.sendSignal
  });

  peerRef.current = peer;

  const acceptShareRequest = (request: ShareRequest) => {
    signaling.acceptShareRequest(request);
    peer.setPairingStatus((prev) => ({ ...prev, [request.from]: 'connecting' }));
  };

  const rejectShareRequest = (request: ShareRequest) => {
    signaling.rejectShareRequest(request);
    peer.setPairingStatus((prev) => ({ ...prev, [request.from]: 'rejected' }));
  };

  return {
    devices: signaling.devices,
    signalStatus: signaling.signalStatus,
    shareRequests: signaling.shareRequests,
    pairingStatus: peer.pairingStatus,
    activePeerId: peer.activePeerId,
    acceptShareRequest,
    rejectShareRequest,
    disconnectPeer: peer.disconnectPeer,
    queueText: (device: Device, text: string) => {
      handlers.onAddTransfer({
        id: generateId(),
        type: TransferType.TEXT,
        content: text,
        fileName: '文字消息',
        fileSize: text.length,
        mimeType: 'text/plain',
        timestamp: Date.now(),
        sender: '本地设备',
        direction: 'sent',
        status: 'completed',
        progress: 100
      });
      signaling.sendTextMessage(device, text);
    },
    queueFile: (device: Device, file: File, kind: TransferType) => {
      const connected = peer.activePeerId === device.id && peer.pairingStatus[device.id] === 'connected';
      if (typeof RTCPeerConnection !== 'undefined' && connected) {
        peer.sendFile(file, kind);
        return true;
      }
      if (relayFallbackEnabled) {
        void sendFileByRelay(device, file, kind);
        return true;
      }
      handlers.onAddTransfer({
        id: generateId(),
        type: kind,
        content: '',
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        timestamp: Date.now(),
        sender: '本地设备',
        direction: 'sent',
        status: 'failed',
        progress: 0,
        error: '未建立直连且已关闭中继降级'
      });
      return false;
    }
  };
};
