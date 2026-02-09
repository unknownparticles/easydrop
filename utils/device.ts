import { Device } from '../types';

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
