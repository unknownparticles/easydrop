import React, { useMemo, useRef, useState } from 'react';
import { Device, TransferType } from './types';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { useTransfers } from './hooks/useTransfers';
import { useWebRTC } from './hooks/useWebRTC';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { generateDefaultName } from './utils/device';
import { TopNav } from './components/TopNav';
import { ShareMenuModal } from './components/ShareMenuModal';
import { TextShareModal } from './components/TextShareModal';
import { HomeScreen } from './components/HomeScreen';

const STORAGE_DEVICE_NAME = 'localdrop_device_name';

const App: React.FC = () => {
  const [deviceName, setDeviceName] = useState(() => {
    const stored = localStorage.getItem(STORAGE_DEVICE_NAME);
    if (stored) return stored;
    const fallback = generateDefaultName();
    localStorage.setItem(STORAGE_DEVICE_NAME, fallback);
    return fallback;
  });
  const [shareOpen, setShareOpen] = useState(false);
  const [textShareOpen, setTextShareOpen] = useState(false);
  const [transferCollapsed, setTransferCollapsed] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [hint, setHint] = useState('');
  const { isOnline, networkLabel } = useNetworkStatus();
  const install = useInstallPrompt();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const transfers = useTransfers();

  const webRtc = useWebRTC(deviceName, {
    onUpdateTransfer: (id, patch) => transfers.setTransfers((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item))),
    onAddTransfer: (item) => transfers.setTransfers((prev) => [item, ...prev])
  });

  const selfType = useMemo(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('ipad')) return 'tablet';
    if (ua.includes('iphone') || ua.includes('android')) return 'mobile';
    return 'desktop';
  }, []);

  const chooseDevice = (device: Device) => {
    if (!isOnline) return;
    setSelectedDevice(device);
    setHint('');
    setShareOpen(true);
  };

  const queueText = (text: string) => {
    if (!selectedDevice || !isOnline) return setHint('请先选择设备');
    webRtc.queueText(selectedDevice, text);
  };

  const queueFile = (file: File | null) => {
    if (!file || !selectedDevice || !isOnline) return setHint('请先选择设备');
    const kind = file.type.startsWith('image/') ? TransferType.IMAGE : TransferType.FILE;
    webRtc.queueFile(selectedDevice, file, kind);
  };

  const downloadItem = (item: { content: string; fileName?: string }) => {
    if (!item.content) return;
    const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    if (isIOS) return void window.open(item.content, '_blank');
    const link = document.createElement('a');
    link.href = item.content;
    link.download = item.fileName || 'download';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <TopNav signalStatus={webRtc.signalStatus} isOnline={isOnline} networkLabel={networkLabel} canInstall={install.canInstall} onInstall={install.install} />

      <HomeScreen
        isOnline={isOnline}
        deviceName={deviceName}
        onDeviceNameChange={setDeviceName}
        onDeviceNameBlur={() => localStorage.setItem(STORAGE_DEVICE_NAME, deviceName)}
        devices={webRtc.devices as Device[]}
        pairingStatus={webRtc.pairingStatus}
        selfType={selfType}
        selectedDeviceId={selectedDevice?.id}
        onDeviceClick={chooseDevice}
        shareRequests={webRtc.shareRequests}
        onAcceptShare={webRtc.acceptShareRequest}
        onRejectShare={webRtc.rejectShareRequest}
        hint={hint}
        installHint={install.installHint}
        transferCollapsed={transferCollapsed}
        onToggleTransfer={() => setTransferCollapsed((prev) => !prev)}
        transferItems={transfers.filteredTransfers}
        searchQuery={transfers.searchQuery}
        onSearchChange={transfers.setSearchQuery}
        filterType={transfers.filterType}
        onFilterChange={transfers.setFilterType}
        copiedId={transfers.copiedId}
        onCopy={transfers.copyToClipboard}
        onDownload={downloadItem}
        onClearAll={() => transfers.setTransfers([])}
        onDelete={transfers.deleteTransfer}
      />

      <ShareMenuModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        onRecentTransfers={() => {
          setShareOpen(false);
          setTransferCollapsed(false);
        }}
        onShareText={() => {
          setShareOpen(false);
          if (!selectedDevice) return setHint('请先选择设备');
          setTextShareOpen(true);
        }}
        onShareGallery={() => {
          setShareOpen(false);
          if (!selectedDevice) return setHint('请先选择设备');
          galleryInputRef.current?.click();
        }}
        onShareCamera={() => {
          setShareOpen(false);
          if (!selectedDevice) return setHint('请先选择设备');
          cameraInputRef.current?.click();
        }}
        onShareFile={() => {
          setShareOpen(false);
          if (!selectedDevice) return setHint('请先选择设备');
          fileInputRef.current?.click();
        }}
      />

      <TextShareModal open={textShareOpen} onClose={() => setTextShareOpen(false)} onSend={queueText} />

      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => queueFile(e.target.files?.[0] || null)} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => queueFile(e.target.files?.[0] || null)} />
      <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => queueFile(e.target.files?.[0] || null)} />
    </div>
  );
};

export default App;
