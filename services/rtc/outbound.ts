import { TransferType } from '../../types';
import { generateId } from '../../utils/id';
import { CHUNK_SIZE, SEND_WINDOW_SIZE, RESEND_TIMEOUT_MS, readChunkPayload, encodeChunkMessage, encodeTextPayload } from './transferHelpers';
import { SendState, TransferMeta } from './rtcTypes';

interface OutboundHandlers {
  onUpdateTransfer: (id: string, patch: { progress: number; status: 'sending' | 'completed' }) => void;
  onAddTransfer: (item: { id: string; type: TransferType; content: string; fileName?: string; fileSize?: number; mimeType?: string; timestamp: number; sender: string; direction: 'sent'; status: 'sending'; progress: number }) => void;
  sendData: (peerId: string, data: string | ArrayBuffer) => void;
}

export const createTextSendState = (peerId: string, text: string, handlers: OutboundHandlers) => {
  const buffer = encodeTextPayload(text);
  const fileId = generateId();
  const totalChunks = Math.ceil(buffer.byteLength / CHUNK_SIZE) || 1;
  const meta: TransferMeta = {
    fileId,
    name: '文字消息.txt',
    size: buffer.byteLength,
    mime: 'text/plain',
    totalChunks,
    chunkSize: CHUNK_SIZE,
    kind: TransferType.TEXT
  };

  const transferId = generateId();
  handlers.onAddTransfer({
    id: transferId,
    type: TransferType.TEXT,
    content: text,
    fileName: '文字消息',
    fileSize: buffer.byteLength,
    mimeType: 'text/plain',
    timestamp: Date.now(),
    sender: '本地设备',
    direction: 'sent',
    status: 'sending',
    progress: 0
  });

  const state: SendState = {
    fileId,
    peerId,
    meta,
    buffer,
    nextIndex: 0,
    acked: Array(totalChunks).fill(false),
    inflight: new Map(),
    resumeQueue: [],
    transferId
  };

  handlers.sendData(peerId, JSON.stringify({ type: 'meta', payload: meta }));
  return state;
};

export const createFileSendState = (peerId: string, file: File, kind: TransferType, handlers: OutboundHandlers) => {
  const fileId = generateId();
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const objectUrl = URL.createObjectURL(file);
  const meta: TransferMeta = {
    fileId,
    name: file.name,
    size: file.size,
    mime: file.type || 'application/octet-stream',
    totalChunks,
    chunkSize: CHUNK_SIZE,
    kind
  };

  const transferId = generateId();
  handlers.onAddTransfer({
    id: transferId,
    type: kind,
    content: objectUrl,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    timestamp: Date.now(),
    sender: '本地设备',
    direction: 'sent',
    status: 'sending',
    progress: 0
  });

  const state: SendState = {
    fileId,
    peerId,
    meta,
    file,
    nextIndex: 0,
    acked: Array(totalChunks).fill(false),
    inflight: new Map(),
    resumeQueue: [],
    transferId
  };

  handlers.sendData(peerId, JSON.stringify({ type: 'meta', payload: meta }));
  return state;
};

export const startSendLoop = (state: SendState, sendStates: Map<string, SendState>, handlers: OutboundHandlers) => {
  if (state.timer) window.clearInterval(state.timer);
  state.timer = window.setInterval(async () => {
    const now = Date.now();
    for (const [index, entry] of state.inflight.entries()) {
      if (now - entry.sentAt > RESEND_TIMEOUT_MS) {
        handlers.sendData(state.peerId, entry.data);
        state.inflight.set(index, { sentAt: now, data: entry.data });
      }
    }

    while (state.inflight.size < SEND_WINDOW_SIZE) {
      const nextIndex = state.resumeQueue.length > 0
        ? state.resumeQueue.shift() ?? null
        : state.nextIndex < state.meta.totalChunks
          ? state.nextIndex++
          : null;
      if (nextIndex === null) break;
      const payload = await readChunkPayload(state, nextIndex);
      if (!payload) break;
      const packet = encodeChunkMessage(state.fileId, nextIndex, payload);
      handlers.sendData(state.peerId, packet);
      state.inflight.set(nextIndex, { sentAt: Date.now(), data: packet });
    }

    const progress = Math.floor((state.acked.filter(Boolean).length / state.meta.totalChunks) * 100);
    handlers.onUpdateTransfer(state.transferId, { progress, status: progress === 100 ? 'completed' : 'sending' });
    if (progress === 100) {
      clearInterval(state.timer);
      sendStates.delete(state.fileId);
    }
  }, 120);
};
