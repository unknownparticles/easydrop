import { useEffect, useMemo, useRef, useState } from 'react';
import { Device } from '../types';
import { detectDeviceType } from '../utils/device';
import { generateId } from '../utils/id';
import { ShareRequest, SignalStatus } from '../services/rtc/rtcTypes';

const STORAGE_KEYS = {
  deviceId: 'localdrop_device_id',
  deviceName: 'localdrop_device_name'
};

const buildDefaultSignalingUrl = () => {
  const envUrl = import.meta.env.VITE_SIGNALING_URL as string | undefined;
  if (envUrl && envUrl.trim()) return envUrl.trim();
  if (typeof window === 'undefined') return 'ws://localhost/ws';
  const { protocol, host } = window.location;
  const wsProtocol = protocol === 'https:' ? 'wss' : 'ws';
  return `${wsProtocol}://${host}/ws`;
};

interface SignalingHandlers {
  onOffer: (from: string, sdp: RTCSessionDescriptionInit) => void;
  onAnswer: (from: string, sdp: RTCSessionDescriptionInit) => void;
  onIce: (from: string, candidate: RTCIceCandidateInit) => void;
  onPairAccepted: (from: string) => void;
  onPairRejected: (from: string) => void;
  onTextMessage: (from: string, text: string) => void;
}

export const useSignaling = (deviceName: string, handlers: SignalingHandlers) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [signalStatus, setSignalStatus] = useState<SignalStatus>('offline');
  const [shareRequests, setShareRequests] = useState<ShareRequest[]>([]);
  const signalingUrl = useMemo(() => buildDefaultSignalingUrl(), []);
  const wsRef = useRef<WebSocket | null>(null);
  const deviceIdRef = useRef<string>('');
  const deviceNameRef = useRef(deviceName);
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEYS.deviceId) || generateId();
    localStorage.setItem(STORAGE_KEYS.deviceId, storedId);
    deviceIdRef.current = storedId;

    const storedName = localStorage.getItem(STORAGE_KEYS.deviceName);
    if (!storedName) localStorage.setItem(STORAGE_KEYS.deviceName, deviceName);
  }, [deviceName]);

  useEffect(() => {
    deviceNameRef.current = deviceName;
    localStorage.setItem(STORAGE_KEYS.deviceName, deviceName);
  }, [deviceName]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'rename', payload: { name: deviceNameRef.current } }));
      }
    }, 200);

    return () => window.clearTimeout(timer);
  }, [deviceName]);

  useEffect(() => {
    let retry = 0;
    let retryTimer: number | null = null;

    const connect = () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      setSignalStatus('connecting');
      let ws: WebSocket;
      try {
        ws = new WebSocket(signalingUrl);
      } catch {
        setSignalStatus('offline');
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        retry = 0;
        setSignalStatus('online');
        ws.send(JSON.stringify({
          type: 'hello',
          payload: {
            device: {
              id: deviceIdRef.current,
              name: deviceNameRef.current,
              type: detectDeviceType(),
              clientVersion: '1.0'
            }
          }
        }));
      };

      ws.onmessage = (event) => {
        let message;
        try { message = JSON.parse(event.data); } catch { return; }
        const { type, payload } = message || {};

        if (type === 'presence:list') {
          const list: Device[] = (payload?.devices || []).filter((d: Device) => d.id !== deviceIdRef.current);
          setDevices(list);
          return;
        }

        if (type === 'share:request') {
          const from = payload?.from;
          const name = payload?.name || '未知设备';
          const deviceType = payload?.deviceType || 'desktop';
          if (!from) return;
          const kind = payload?.kind || 'file';
          const fileName = payload?.fileName;
          const fileSize = payload?.fileSize;
          const mimeType = payload?.mimeType;
          setShareRequests((prev) =>
            prev.find((item) => item.from === from)
              ? prev
              : [...prev, { from, name, deviceType, kind, fileName, fileSize, mimeType }]
          );
          return;
        }

        if (type === 'text:message') {
          const from = payload?.from;
          const text = payload?.text;
          if (from && typeof text === 'string') handlersRef.current.onTextMessage(from, text);
          return;
        }

        if (type === 'share:accept') {
          const from = payload?.from;
          if (from) handlersRef.current.onPairAccepted(from);
          return;
        }

        if (type === 'share:reject') {
          const from = payload?.from;
          if (from) handlersRef.current.onPairRejected(from);
          return;
        }

        if (type === 'rtc:offer') {
          const from = payload?.from;
          const sdp = payload?.sdp;
          if (from && sdp) handlersRef.current.onOffer(from, sdp);
          return;
        }

        if (type === 'rtc:answer') {
          const from = payload?.from;
          const sdp = payload?.sdp;
          if (from && sdp) handlersRef.current.onAnswer(from, sdp);
          return;
        }

        if (type === 'rtc:ice') {
          const from = payload?.from;
          const candidate = payload?.candidate;
          if (from && candidate) handlersRef.current.onIce(from, candidate);
        }
      };

      ws.onclose = () => {
        setSignalStatus('offline');
        const delay = Math.min(5000, 1000 + retry * 1000);
        retry += 1;
        retryTimer = window.setTimeout(connect, delay);
      };

      ws.onerror = () => {
        setSignalStatus('offline');
      };
    };

    connect();

    return () => {
      if (retryTimer) window.clearTimeout(retryTimer);
      wsRef.current?.close();
    };
  }, [signalingUrl]);

  const sendSignal = (type: string, payload: Record<string, unknown>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type, payload }));
  };

  const requestShare = (device: Device, payload: Record<string, unknown>) => {
    sendSignal('share:request', { to: device.id, name: deviceNameRef.current, deviceType: detectDeviceType(), ...payload });
  };

  const sendTextMessage = (device: Device, text: string) => {
    sendSignal('text:message', { to: device.id, text });
  };

  const acceptShareRequest = (request: ShareRequest) => {
    setShareRequests((prev) => prev.filter((item) => item.from !== request.from));
    sendSignal('share:accept', { to: request.from });
  };

  const rejectShareRequest = (request: ShareRequest) => {
    setShareRequests((prev) => prev.filter((item) => item.from !== request.from));
    sendSignal('share:reject', { to: request.from });
  };

  return {
    devices,
    signalStatus,
    shareRequests,
    requestShare,
    sendTextMessage,
    acceptShareRequest,
    rejectShareRequest,
    sendSignal
  };
};
