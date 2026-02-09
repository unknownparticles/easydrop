import { useEffect, useState } from 'react';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [networkLabel, setNetworkLabel] = useState<string>('未知网络');

  useEffect(() => {
    const updateNetwork = () => {
      setIsOnline(navigator.onLine);
      const connection = (navigator as Navigator & { connection?: { effectiveType?: string; type?: string } }).connection;
      if (!navigator.onLine) {
        setNetworkLabel('无网络');
        return;
      }
      if (connection?.type) {
        setNetworkLabel(connection.type === 'wifi' ? 'Wi‑Fi' : connection.type);
        return;
      }
      if (connection?.effectiveType) {
        setNetworkLabel(`网络(${connection.effectiveType})`);
        return;
      }
      setNetworkLabel('已联网');
    };

    updateNetwork();
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    return () => {
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
    };
  }, []);

  return { isOnline, networkLabel };
};
