import { SendState, ReceiveState } from './rtcTypes';
import { TransferType } from '../../types';
import { encodeChunk, decodeChunk, mergeChunks, decodeText, encodeText } from '../../utils/codec';

export const CHUNK_SIZE = 64 * 1024;
export const SEND_WINDOW_SIZE = 8;
export const RESEND_TIMEOUT_MS = 2000;

export const buildReceivedRanges = (chunks: Array<Uint8Array | null>) => {
  const ranges: Array<[number, number]> = [];
  let start: number | null = null;
  for (let i = 0; i < chunks.length; i += 1) {
    if (chunks[i] && start === null) start = i;
    if ((!chunks[i] || i === chunks.length - 1) && start !== null) {
      const end = chunks[i] ? i : i - 1;
      ranges.push([start, end]);
      start = null;
    }
  }
  return ranges;
};

export const computeMissingIndices = (total: number, ranges: Array<[number, number]>) => {
  const received = new Array(total).fill(false);
  ranges.forEach(([start, end]) => {
    for (let i = start; i <= end; i += 1) received[i] = true;
  });
  const missing: number[] = [];
  for (let i = 0; i < total; i += 1) if (!received[i]) missing.push(i);
  return missing;
};

export const readChunkPayload = async (state: SendState, index: number) => {
  const start = index * state.meta.chunkSize;
  const end = Math.min(start + state.meta.chunkSize, state.meta.size);
  if (state.buffer) return state.buffer.slice(start, end).buffer;
  if (!state.file) return null;
  const blob = state.file.slice(start, end);
  return await blob.arrayBuffer();
};

export const decodeChunkMessage = (data: ArrayBuffer) => decodeChunk(data);
export const encodeChunkMessage = (fileId: string, index: number, payload: ArrayBuffer) => encodeChunk(fileId, index, payload);

export const finalizeReceivedPayload = (state: ReceiveState) => {
  if (state.meta.kind === TransferType.TEXT) {
    const merged = mergeChunks(state.chunks);
    return { text: decodeText(merged), url: '' };
  }
  const blob = new Blob(state.chunks as Uint8Array[], { type: state.meta.mime });
  return { text: '', url: URL.createObjectURL(blob) };
};

export const encodeTextPayload = (text: string) => encodeText(text);
