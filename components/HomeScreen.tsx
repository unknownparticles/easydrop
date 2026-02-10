import React from 'react';
import { Zap } from 'lucide-react';
import { Device, TransferItem, TransferType } from '../types';
import { DeviceOrbit } from './DeviceOrbit';
import { PairRequestModal } from './PairRequestModal';
import { TransferPanel } from './TransferPanel';
import { ShareRequest } from '../services/rtc/rtcTypes';

interface HomeScreenProps {
  isOnline: boolean;
  deviceName: string;
  deviceNamePrefix: string;
  deviceSerial: string;
  onDeviceNamePrefixChange: (name: string) => void;
  onDeviceNameBlur: () => void;
  devices: Device[];
  pairingStatus: Record<string, string>;
  selfType: Device['type'];
  selectedDeviceId?: string | null;
  onDeviceClick: (device: Device) => void;
  shareRequests: ShareRequest[];
  onAcceptShare: (request: ShareRequest) => void;
  onRejectShare: (request: ShareRequest) => void;
  hint: string;
  installHint: string;
  transferCollapsed: boolean;
  onToggleTransfer: () => void;
  transferItems: TransferItem[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterType: TransferType | 'ALL';
  onFilterChange: (value: TransferType | 'ALL') => void;
  copiedId: string | null;
  activeTransferId: string | null;
  onCopy: (text: string, id: string) => void;
  onDownload: (item: TransferItem) => void;
  onClearAll: () => void;
  onDelete: (id: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  isOnline,
  deviceName,
  deviceNamePrefix,
  deviceSerial,
  onDeviceNamePrefixChange,
  onDeviceNameBlur,
  devices,
  pairingStatus,
  selfType,
  selectedDeviceId,
  onDeviceClick,
  shareRequests,
  onAcceptShare,
  onRejectShare,
  hint,
  installHint,
  transferCollapsed,
  onToggleTransfer,
  transferItems,
  searchQuery,
  onSearchChange,
  filterType,
  onFilterChange,
  copiedId,
  activeTransferId,
  onCopy,
  onDownload,
  onClearAll,
  onDelete
}) => {
  return (
    <main className="max-w-6xl mx-auto px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12 space-y-10">
      {!isOnline && (
        <div className="bg-red-50/80 text-red-700 rounded-2xl px-5 py-4 text-sm font-semibold">
          当前无网络，无法发现设备或传输文件。
        </div>
      )}

      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold">附近的设备</h2>
            <span className="text-xs font-medium text-slate-400">自动发现在线设备</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-white/80 rounded-2xl px-3 py-2 text-xs">
              <span className="text-slate-400">设备名</span>
              <input
                value={deviceNamePrefix}
                onChange={(e) => onDeviceNamePrefixChange(e.target.value)}
                onBlur={onDeviceNameBlur}
                className="bg-transparent outline-none text-slate-700 font-bold"
              />
              <span className="text-slate-500 font-semibold select-none">{deviceSerial}</span>
            </div>
          </div>
        </div>

        <PairRequestModal requests={shareRequests} onAccept={onAcceptShare} onReject={onRejectShare} />

        <DeviceOrbit
          devices={devices}
          pairingStatus={pairingStatus}
          deviceName={deviceName}
          selfType={selfType}
          isOnline={isOnline}
          selectedDeviceId={selectedDeviceId}
          onPair={onDeviceClick}
        />

        {hint && <div className="text-xs text-slate-400">{hint}</div>}
        {installHint && <div className="text-xs text-slate-400">{installHint}</div>}

        <TransferPanel
          collapsed={transferCollapsed}
          onToggle={onToggleTransfer}
          items={transferItems}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          filterType={filterType}
          onFilterChange={onFilterChange}
          activeItemId={activeTransferId}
          onCopy={onCopy}
          onDownload={onDownload}
          onClearAll={onClearAll}
          onDelete={onDelete}
          copiedId={copiedId}
        />
      </section>
    </main>
  );
};
