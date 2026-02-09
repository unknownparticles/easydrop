
export enum TransferType {
  TEXT = 'TEXT',
  FILE = 'FILE',
  IMAGE = 'IMAGE'
}

export type TransferDirection = 'sent' | 'received';
export type TransferStatus = 'queued' | 'sending' | 'receiving' | 'paused' | 'completed' | 'failed';

export interface TransferItem {
  id: string;
  type: TransferType;
  content: string; // text or object URL for files/images
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  timestamp: number;
  sender: string;
  direction: TransferDirection;
  status: TransferStatus;
  progress: number; // 0-100
  error?: string;
  isRenaming?: boolean; // UI state for management
}

export interface Device {
  id: string;
  name: string;
  type: 'mobile' | 'desktop' | 'tablet';
  status: 'online' | 'offline';
  lastSeen: number;
}
