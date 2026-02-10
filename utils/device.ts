import { Device } from '../types';

export const DEVICE_NAME_SERIAL_PREFIX = '#';

export const detectDeviceType = (): Device['type'] => {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('ipad')) return 'tablet';
  if (ua.includes('iphone') || ua.includes('android')) return 'mobile';
  return 'desktop';
};

export const detectDeviceLabel = () => {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('iphone')) return 'iPhone';
  if (ua.includes('ipad')) return 'iPad';
  if (ua.includes('android')) return 'Android 手机';
  if (ua.includes('mac')) return 'Mac';
  if (ua.includes('windows')) return 'Windows 电脑';
  return '设备';
};

export const generateDefaultName = () => {
  const label = detectDeviceLabel();
  const suffix = Math.floor(10 + Math.random() * 90);
  return `${label} #${suffix}`;
};

export const deriveDeviceSerial = (deviceId: string) => `${DEVICE_NAME_SERIAL_PREFIX}${deviceId.toUpperCase()}`;

export const parseDeviceName = (name: string) => {
  const trimmed = name.trim();
  const markerIndex = trimmed.lastIndexOf(` ${DEVICE_NAME_SERIAL_PREFIX}`);
  if (markerIndex <= 0) {
    return { prefix: trimmed, serial: '' };
  }
  const prefix = trimmed.slice(0, markerIndex).trim();
  const serial = trimmed.slice(markerIndex + 1).trim();
  return { prefix, serial };
};

export const composeDeviceName = (prefix: string, serial: string, fallbackPrefix: string) => {
  const safePrefix = prefix.trim() || fallbackPrefix.trim() || '设备';
  const safeSerial = serial.trim();
  return safeSerial ? `${safePrefix} ${safeSerial}` : safePrefix;
};
