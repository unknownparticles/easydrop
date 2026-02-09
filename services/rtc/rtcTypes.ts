import { TransferType } from '../../types';

export type SignalStatus = 'connecting' | 'online' | 'offline';

export interface ShareRequest {
  from: string;
  name: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  kind: 'text' | 'image' | 'file';
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

export interface TransferMeta {
  fileId: string;
  name: string;
  size: number;
  mime: string;
  totalChunks: number;
  chunkSize: number;
  kind: TransferType;
}

export interface SendState {
  fileId: string;
  peerId: string;
  meta: TransferMeta;
  file?: File;
  buffer?: Uint8Array;
  nextIndex: number;
  acked: boolean[];
  inflight: Map<number, { sentAt: number; data: ArrayBuffer }>;
  resumeQueue: number[];
  timer?: number;
  transferId: string;
}

export interface ReceiveState {
  fileId: string;
  peerId: string;
  meta: TransferMeta;
  chunks: Array<Uint8Array | null>;
  receivedCount: number;
  transferId: string;
}
