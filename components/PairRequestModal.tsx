import React from 'react';
import { AlertCircle } from 'lucide-react';
import { ShareRequest } from '../services/rtc/rtcTypes';

interface PairRequestModalProps {
  requests: ShareRequest[];
  onAccept: (request: ShareRequest) => void;
  onReject: (request: ShareRequest) => void;
}

export const PairRequestModal: React.FC<PairRequestModalProps> = ({ requests, onAccept, onReject }) => {
  if (requests.length === 0) return null;
  const request = requests[0];
  const label = request.kind === 'text' ? '文字' : request.kind === 'image' ? '图片' : '文件';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-6 w-[320px] shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-amber-700">
          <AlertCircle className="w-4 h-4" />
          {request.name} 想发送 {label}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onAccept(request)}
            className="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-green-600 text-white"
          >
            接受
          </button>
          <button
            onClick={() => onReject(request)}
            className="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-slate-200 text-slate-600"
          >
            拒绝
          </button>
        </div>
        {requests.length > 1 && (
          <p className="text-[10px] text-slate-400">还有 {requests.length - 1} 个请求</p>
        )}
      </div>
    </div>
  );
};
