import React from 'react';
import { Share2 } from 'lucide-react';
import { SignalStatus } from '../services/rtc/rtcTypes';

interface TopNavProps {
  signalStatus: SignalStatus;
  isOnline: boolean;
  networkLabel: string;
  canInstall: boolean;
  onInstall: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ signalStatus, isOnline, networkLabel, canInstall, onInstall }) => {
  return (
    <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl px-6 pb-5 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            EasyDrop
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {canInstall && (
            <button onClick={onInstall} className="text-xs font-semibold text-slate-600 bg-slate-50 rounded-full px-3 py-1.5">
              添加到桌面
            </button>
          )}
          <div className={`hidden md:flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${
            signalStatus === 'online'
              ? 'bg-green-50 text-green-700'
              : signalStatus === 'connecting'
              ? 'bg-amber-50 text-amber-700'
              : 'bg-slate-50 text-slate-500'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              signalStatus === 'online' ? 'bg-green-500 animate-pulse' : signalStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
            }`} />
            信令 {signalStatus === 'online' ? '已连接' : signalStatus === 'connecting' ? '连接中' : '离线'}
          </div>
          <div className={`hidden md:flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${
            isOnline ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-600'
          }`}>
            网络 {networkLabel}
          </div>
        </div>
      </div>
    </nav>
  );
};
