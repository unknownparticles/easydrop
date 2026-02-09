import { TransferItem, TransferType } from '../../types';
import { generateId } from '../../utils/id';
import { buildReceivedRanges, computeMissingIndices, decodeChunkMessage, finalizeReceivedPayload } from './transferHelpers';
import { ReceiveState, SendState, TransferMeta } from './rtcTypes';
import { createFileSendState, createTextSendState, startSendLoop } from './outbound';

interface TransferHandlers {
  onUpdateTransfer: (id: string, patch: Partial<TransferItem>) => void;
  onAddTransfer: (item: TransferItem) => void;
  sendData: (peerId: string, data: string | ArrayBuffer) => void;
}

export class TransferManager {
  private sendStates = new Map<string, SendState>();
  private receiveStates = new Map<string, ReceiveState>();
  private handlers: TransferHandlers;

  constructor(handlers: TransferHandlers) {
    this.handlers = handlers;
  }

  resumePending(peerId: string) {
    for (const state of this.sendStates.values()) {
      if (state.peerId === peerId) {
        this.handlers.sendData(peerId, JSON.stringify({ type: 'resume:request', payload: { fileId: state.fileId } }));
      }
    }
  }

  handleControlMessage(peerId: string, data: string) {
    let message;
    try { message = JSON.parse(data); } catch { return; }
    const { type, payload } = message || {};

    if (type === 'meta') {
      const meta: TransferMeta = payload;
      const transferId = generateId();
      this.handlers.onAddTransfer({
        id: transferId,
        type: meta.kind,
        content: '',
        fileName: meta.name,
        fileSize: meta.size,
        mimeType: meta.mime,
        timestamp: Date.now(),
        sender: peerId,
        direction: 'received',
        status: 'receiving',
        progress: 0
      });
      this.receiveStates.set(meta.fileId, {
        fileId: meta.fileId,
        peerId,
        meta,
        chunks: Array(meta.totalChunks).fill(null),
        receivedCount: 0,
        transferId
      });
      return;
    }

    if (type === 'ack') {
      const { fileId, index } = payload || {};
      const state = this.sendStates.get(fileId);
      if (!state) return;
      state.acked[index] = true;
      state.inflight.delete(index);
      const progress = Math.floor((state.acked.filter(Boolean).length / state.meta.totalChunks) * 100);
      this.handlers.onUpdateTransfer(state.transferId, { progress, status: progress === 100 ? 'completed' : 'sending' });
      if (progress === 100) {
        clearInterval(state.timer);
        this.sendStates.delete(fileId);
      }
      return;
    }

    if (type === 'resume:request') {
      const { fileId } = payload || {};
      const state = this.receiveStates.get(fileId);
      if (!state) return;
      const ranges = buildReceivedRanges(state.chunks);
      this.handlers.sendData(peerId, JSON.stringify({ type: 'resume:state', payload: { fileId, ranges } }));
      return;
    }

    if (type === 'resume:state') {
      const { fileId, ranges } = payload || {};
      const state = this.sendStates.get(fileId);
      if (!state) return;
      state.resumeQueue = computeMissingIndices(state.meta.totalChunks, ranges || []);
    }
  }

  handleChunkMessage(peerId: string, data: ArrayBuffer) {
    const decoded = decodeChunkMessage(data);
    if (!decoded) return;
    const { fileId, index, payload } = decoded;
    const state = this.receiveStates.get(fileId);
    if (!state) return;
    if (!state.chunks[index]) {
      state.chunks[index] = new Uint8Array(payload);
      state.receivedCount += 1;
      const progress = Math.floor((state.receivedCount / state.meta.totalChunks) * 100);
      this.handlers.onUpdateTransfer(state.transferId, { progress, status: progress === 100 ? 'completed' : 'receiving' });
    }
    this.handlers.sendData(peerId, JSON.stringify({ type: 'ack', payload: { fileId, index } }));

    if (state.receivedCount === state.meta.totalChunks) {
      const result = finalizeReceivedPayload(state);
      this.handlers.onUpdateTransfer(state.transferId, {
        content: state.meta.kind === TransferType.TEXT ? result.text : result.url,
        status: 'completed',
        progress: 100
      });
      this.receiveStates.delete(fileId);
    }
  }

  sendText(peerId: string, text: string) {
    const state = createTextSendState(peerId, text, this.handlers);
    this.sendStates.set(state.fileId, state);
    startSendLoop(state, this.sendStates, this.handlers);
  }

  sendFile(peerId: string, file: File, kind: TransferType) {
    const state = createFileSendState(peerId, file, kind, this.handlers);
    this.sendStates.set(state.fileId, state);
    startSendLoop(state, this.sendStates, this.handlers);
  }
}
