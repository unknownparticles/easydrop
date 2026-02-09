import { useEffect, useMemo, useState } from 'react';
import { TransferItem, TransferType } from '../types';

const STORAGE_KEY = 'localdrop_transfers';

export const useTransfers = () => {
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TransferType | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const savedTransfers = localStorage.getItem(STORAGE_KEY);
    if (!savedTransfers) return;
    try {
      const parsed = JSON.parse(savedTransfers);
      if (Array.isArray(parsed)) {
        setTransfers(parsed.map((item) => ({
          ...item,
          direction: item.direction || 'received',
          status: item.status || 'completed',
          progress: typeof item.progress === 'number' ? item.progress : 100
        })));
      }
    } catch (err) {
      console.error('Failed to load transfers');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transfers));
  }, [transfers]);

  const filteredTransfers = useMemo(() => {
    return transfers.filter((item) => {
      const textContent = item.type === TransferType.TEXT ? item.content : '';
      const matchesSearch = `${item.fileName || ''} ${textContent}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesFilter = filterType === 'ALL' || item.type === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [transfers, searchQuery, filterType]);

  const startRenaming = (item: TransferItem) => {
    setEditingId(item.id);
    setTempName(item.fileName || '未命名');
  };

  const saveRename = (id: string) => {
    setTransfers((prev) => prev.map((item) => (item.id === id ? { ...item, fileName: tempName } : item)));
    setEditingId(null);
  };

  const cancelRename = () => setEditingId(null);

  const deleteTransfer = (id: string) => {
    if (window.confirm('确定要删除这个文件吗？')) {
      setTransfers((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return {
    transfers,
    setTransfers,
    filteredTransfers,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    viewMode,
    setViewMode,
    editingId,
    tempName,
    setTempName,
    startRenaming,
    saveRename,
    cancelRename,
    deleteTransfer,
    copyToClipboard,
    copiedId,
    formatSize
  };
};
