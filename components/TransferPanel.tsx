import React from 'react';
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
  onCopy,
  onDownload,
  onClearAll,
  onDelete
}) => {
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
              <div key={item.id} className="rounded-xl bg-white px-3 py-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-slate-700 truncate">{item.fileName || '分享内容'}</div>
                    {item.type === TransferType.TEXT && (
                      <div className="text-[11px] text-slate-500 whitespace-pre-wrap break-words">{item.content}</div>
                    )}
                    <div className="text-[10px] text-slate-400">{item.direction === 'sent' ? '发送' : '接收'} · {item.status} · {item.progress}%</div>
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
