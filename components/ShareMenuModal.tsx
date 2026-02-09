import React from 'react';

interface ShareMenuModalProps {
  open: boolean;
  onClose: () => void;
  onRecentTransfers: () => void;
  onShareText: () => void;
  onShareGallery: () => void;
  onShareCamera: () => void;
  onShareFile: () => void;
}

export const ShareMenuModal: React.FC<ShareMenuModalProps> = ({
  open,
  onClose,
  onRecentTransfers,
  onShareText,
  onShareGallery,
  onShareCamera,
  onShareFile
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md">
      <div className="w-[300px] rounded-3xl bg-white/90 p-4">
        <div className="text-sm font-semibold text-slate-800 mb-3">分享内容</div>
        <div className="space-y-2">
          <button onClick={onRecentTransfers} className="w-full rounded-2xl bg-white/70 hover:bg-white text-slate-800 text-sm font-semibold py-3">
            最近传输
          </button>
          <button onClick={onShareText} className="w-full rounded-2xl bg-white/70 hover:bg-white text-slate-800 text-sm font-semibold py-3">
            分享文字
          </button>
          <button onClick={onShareGallery} className="w-full rounded-2xl bg-white/70 hover:bg-white text-slate-800 text-sm font-semibold py-3">
            分享图库图片
          </button>
          <button onClick={onShareCamera} className="w-full rounded-2xl bg-white/70 hover:bg-white text-slate-800 text-sm font-semibold py-3">
            分享拍照
          </button>
          <button onClick={onShareFile} className="w-full rounded-2xl bg-white/70 hover:bg-white text-slate-800 text-sm font-semibold py-3">
            分享文件
          </button>
        </div>
        <button onClick={onClose} className="mt-3 w-full text-xs font-semibold text-slate-500">取消</button>
      </div>
    </div>
  );
};
