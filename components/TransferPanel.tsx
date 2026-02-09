import React, { useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { TransferItem, TransferType } from '../types';

interface TransferPanelProps {
  collapsed: boolean;
  onToggle: () => void;
  items: TransferItem[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterType: TransferType | 'ALL';
  onFilterChange: (value: TransferType | 'ALL') => void;
  copiedId: string | null;
  activeItemId: string | null;
  onCopy: (text: string, id: string) => void;
  onDownload: (item: TransferItem) => void;
  onClearAll: () => void;
  onDelete: (id: string) => void;
}

export const TransferPanel: React.FC<TransferPanelProps> = ({
  collapsed,
  onToggle,
  items,
  searchQuery,
  onSearchChange,
  filterType,
  onFilterChange,
  copiedId,
  activeItemId,
  onCopy,
  onDownload,
  onClearAll,
  onDelete
}) => {
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const getStatusView = (status: TransferItem['status']) => {
    if (status === 'completed') return { label: '传输成功', className: 'bg-emerald-100 text-emerald-700' };
    if (status === 'sending') return { label: '发送中', className: 'bg-blue-100 text-blue-700 animate-pulse' };
    if (status === 'receiving') return { label: '接收中', className: 'bg-amber-100 text-amber-700 animate-pulse' };
    if (status === 'failed') return { label: '传输失败', className: 'bg-red-100 text-red-700' };
    if (status === 'paused') return { label: '已暂停', className: 'bg-slate-100 text-slate-600' };
    return { label: status, className: 'bg-slate-100 text-slate-600' };
  };

  useEffect(() => {
    if (collapsed || !activeItemId) return;
    const el = itemRefs.current[activeItemId];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeItemId, collapsed, items.length]);

  return (
    <div className="bg-white/80 rounded-2xl px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={onToggle} className="flex items-center gap-2 text-[12px] font-semibold text-slate-700">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          传输记录
        </button>
        <button onClick={onClearAll} className="text-[10px] font-semibold text-slate-400 hover:text-slate-600">
          清空全部
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="搜索内容或文件名"
                className="w-full rounded-2xl bg-white px-9 py-2 text-xs outline-none"
              />
            </div>
            <div className="flex gap-2 text-[11px] font-semibold text-slate-500">
              <button onClick={() => onFilterChange('ALL')} className={filterType === 'ALL' ? 'text-slate-900' : ''}>全部</button>
              <button onClick={() => onFilterChange(TransferType.TEXT)} className={filterType === TransferType.TEXT ? 'text-slate-900' : ''}>文字</button>
              <button onClick={() => onFilterChange(TransferType.IMAGE)} className={filterType === TransferType.IMAGE ? 'text-slate-900' : ''}>图片</button>
              <button onClick={() => onFilterChange(TransferType.FILE)} className={filterType === TransferType.FILE ? 'text-slate-900' : ''}>文件</button>
            </div>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
            {items.length === 0 && <div className="text-[11px] text-slate-400">暂无记录</div>}
            {items.map((item) => (
              <div
                key={item.id}
                ref={(node) => {
                  itemRefs.current[item.id] = node;
                }}
                className={`rounded-xl px-3 py-2 transition-all ${
                item.status === 'completed' ? 'bg-emerald-50/70 ring-1 ring-emerald-200' : 'bg-white'
              } ${
                activeItemId === item.id ? 'ring-2 ring-indigo-300' : ''
              }`}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-slate-700 truncate">{item.fileName || '分享内容'}</div>
                    {item.type === TransferType.TEXT && (
                      <div className="text-[11px] text-slate-500 whitespace-pre-wrap break-words">{item.content}</div>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">{item.direction === 'sent' ? '发送' : '接收'} · {item.progress}%</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getStatusView(item.status).className}`}>
                        {getStatusView(item.status).label}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          item.status === 'completed' ? 'bg-emerald-500' : item.status === 'failed' ? 'bg-red-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.max(0, Math.min(item.progress, 100))}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold">
                    {item.type === TransferType.TEXT ? (
                      <button onClick={() => onCopy(item.content, item.id)} className="text-slate-500">{copiedId === item.id ? '已复制' : '复制'}</button>
                    ) : (
                      item.content && item.status === 'completed' && (
                        <button onClick={() => onDownload(item)} className="text-indigo-600">下载</button>
                      )
                    )}
                    <button onClick={() => onDelete(item.id)} className="rounded-full px-2 py-0.5 text-red-500 bg-red-50/80 hover:bg-red-100">
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
