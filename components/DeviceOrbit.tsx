import React, { useMemo } from 'react';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { Device } from '../types';

interface DeviceOrbitProps {
  devices: Device[];
  pairingStatus: Record<string, string>;
  deviceName: string;
  selfType: Device['type'];
  isOnline: boolean;
  selectedDeviceId?: string | null;
  onPair: (device: Device) => void;
}

export const DeviceOrbit: React.FC<DeviceOrbitProps> = ({
  devices,
  pairingStatus,
  deviceName,
  selfType,
  isOnline,
  selectedDeviceId,
  onPair
}) => {
  const positions = useMemo(() => {
    const count = devices.length;
    const radius = 118;
    return devices.map((device, index) => {
      const angle = count > 1 ? (2 * Math.PI * index) / count - Math.PI / 2 : -Math.PI / 2;
      return { device, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    });
  }, [devices]);

  return (
    <div className="relative rounded-[32px] p-14 h-[380px] sm:h-[440px] bg-white/70 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="group flex flex-col items-center gap-2 text-center">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-indigo-600 text-white flex items-center justify-center group-hover:scale-[1.02] transition-transform">
            {selfType === 'desktop' && <Monitor className="w-8 h-8" />}
            {selfType === 'mobile' && <Smartphone className="w-8 h-8" />}
            {selfType === 'tablet' && <Tablet className="w-8 h-8" />}
          </div>
          <p className="text-sm font-bold text-slate-800">{deviceName}</p>
          <p className="text-[10px] text-slate-400">{isOnline ? '在线' : '离线'}</p>
        </div>
      </div>

      {positions.map(({ device, x, y }) => {
        const status = pairingStatus[device.id] || 'idle';
        return (
          <button
            key={device.id}
            onClick={() => isOnline && onPair(device)}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center gap-2"
            style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
          >
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all ${
              status === 'connected'
                ? 'bg-green-100 text-green-600'
              : status === 'requesting'
                ? 'bg-amber-100 text-amber-600'
                : 'bg-white/90 text-slate-600 group-hover:bg-white'
            } ${selectedDeviceId === device.id ? 'ring-2 ring-indigo-400' : ''}`}>
              {device.type === 'desktop' && <Monitor className="w-6 h-6" />}
              {device.type === 'mobile' && <Smartphone className="w-6 h-6" />}
              {device.type === 'tablet' && <Tablet className="w-6 h-6" />}
            </div>
            <div className="text-center">
              <p className="text-[10px] font-semibold text-slate-700 max-w-[90px] truncate">{device.name}</p>
              <p className="text-[9px] text-slate-400">
                {status === 'requesting' && '请求中'}
                {status === 'connecting' && '连接中'}
                {status === 'connected' && '已连接'}
                {status === 'rejected' && '已拒绝'}
                {status === 'paused' && '已中断'}
                {status === 'idle' && '在线'}
              </p>
            </div>
          </button>
        );
      })}

      {devices.length === 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/85 px-4 py-2 text-sm text-slate-400">
          暂无其他设备在线
        </div>
      )}
    </div>
  );
};
