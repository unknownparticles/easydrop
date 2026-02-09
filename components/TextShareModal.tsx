import React, { useState } from 'react';

interface TextShareModalProps {
  open: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
}

export const TextShareModal: React.FC<TextShareModalProps> = ({ open, onClose, onSend }) => {
  const [value, setValue] = useState('');
  if (!open) return null;

  const handleSend = () => {
    if (!value.trim()) return;
    onSend(value.trim());
    setValue('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md">
      <div className="w-[320px] rounded-3xl bg-white/90 p-4">
        <div className="text-sm font-semibold text-slate-800 mb-3">分享文字</div>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full h-32 rounded-2xl bg-white/70 p-3 text-sm text-left leading-6 align-top resize-none outline-none focus:ring-2 focus:ring-indigo-500/40"
          placeholder="输入要分享的文字..."
        />
        <div className="mt-3 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-2xl bg-slate-100 text-slate-600 text-xs font-semibold py-2">
            取消
          </button>
          <button onClick={handleSend} className="flex-1 rounded-2xl bg-indigo-600 text-white text-xs font-semibold py-2">
            发送
          </button>
        </div>
      </div>
    </div>
  );
};
