import React, { useEffect, useRef, useState } from 'react';
import { Globe, Hash, QrCode, Copy, Share2, Check, X } from 'lucide-react';
import { generateQRDataUrl, buildShareUrl, generateRoomCode } from '../utils/qrcode';

export type RoomMode = 'lan' | 'code';

interface RoomModePanelProps {
  roomMode: RoomMode;
  roomCode: string | null;
  codeExpiresAt: number | null;
  onModeChange: (mode: RoomMode) => void;
  onCodeChange: (code: string | null) => void;
}

export const RoomModePanel: React.FC<RoomModePanelProps> = ({
  roomMode,
  roomCode,
  codeExpiresAt,
  onModeChange,
  onCodeChange
}) => {
  const [codeInput, setCodeInput] = useState(['', '', '', '']);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (!codeExpiresAt) { setRemaining(''); return; }
    const tick = () => {
      const diff = Math.max(0, codeExpiresAt - Date.now());
      if (diff <= 0) { setRemaining('已过期'); return; }
      const m = Math.floor(diff / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setRemaining(`${m}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [codeExpiresAt]);

  // Generate QR when roomCode changes
  useEffect(() => {
    if (!roomCode) { setQrDataUrl(null); return; }
    let cancelled = false;
    generateQRDataUrl(buildShareUrl(roomCode), 280).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => { cancelled = true; };
  }, [roomCode]);

  const handleGenerate = () => {
    const code = generateRoomCode();
    onCodeChange(code);
    setCodeInput(code.split(''));
  };

  const handleDigitChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    const next = [...codeInput];
    next[index] = value;
    setCodeInput(next);
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d !== '')) {
      onCodeChange(next.join(''));
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !codeInput[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (text.length === 4) {
      setCodeInput(text.split(''));
      onCodeChange(text);
    }
  };

  const handleCopyLink = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(buildShareUrl(roomCode));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const handleShare = async () => {
    if (!roomCode) return;
    const url = buildShareUrl(roomCode);
    if (navigator.share) {
      try { await navigator.share({ title: 'EasyDrop', text: `使用数字码 ${roomCode} 连接`, url }); } catch { /* ignore */ }
    } else {
      handleCopyLink();
    }
  };

  const switchToLan = () => {
    onModeChange('lan');
    onCodeChange(null);
    setCodeInput(['', '', '', '']);
    setShowQR(false);
  };

  return (
    <div className="rounded-2xl bg-slate-50/80 p-4 space-y-3">
      {/* Mode tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1">
        <button
          onClick={switchToLan}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
            roomMode === 'lan' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          局域网
        </button>
        <button
          onClick={() => onModeChange('code')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
            roomMode === 'code' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Hash className="w-3.5 h-3.5" />
          数字码
        </button>
      </div>

      {/* LAN mode */}
      {roomMode === 'lan' && (
        <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          已自动连接到局域网房间，仅同网络设备可见
        </div>
      )}

      {/* Code mode */}
      {roomMode === 'code' && (
        <div className="space-y-3">
          {/* Generate / Active code */}
          {!roomCode ? (
            <div className="space-y-3">
              <button
                onClick={handleGenerate}
                className="w-full bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                生成数字码
              </button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center"><span className="bg-slate-50 px-2 text-xs text-slate-400">或输入对方的数字码</span></div>
              </div>
              <div className="flex justify-center gap-2" onPaste={handleDigitPaste}>
                {codeInput.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-slate-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Active code display */}
              <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">数字码</span>
                  <span className="text-2xl font-bold tracking-[0.3em] text-indigo-600">{roomCode}</span>
                </div>
                <div className="flex items-center gap-2">
                  {remaining && (
                    <span className={`text-xs font-mono ${remaining === '已过期' ? 'text-red-500' : 'text-slate-400'}`}>
                      ⏱ {remaining}
                    </span>
                  )}
                  <button
                    onClick={switchToLan}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    title="退出数字码模式"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowQR(!showQR)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                    showQR ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  二维码
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold bg-white text-slate-600 hover:bg-slate-100 transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? '已复制' : '复制链接'}
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold bg-white text-slate-600 hover:bg-slate-100 transition-all"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  分享
                </button>
              </div>

              {/* QR code display */}
              {showQR && qrDataUrl && (
                <div className="flex flex-col items-center gap-2 bg-white rounded-xl p-4">
                  <img src={qrDataUrl} alt="QR Code" className="w-52 h-52 rounded-lg" />
                  <span className="text-xs text-slate-400">扫描二维码加入房间</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
