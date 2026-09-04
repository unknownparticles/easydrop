import QRCode from 'qrcode';

export async function generateQRDataUrl(text: string, size: number = 200): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 2,
    color: {
      dark: '#1e293b',
      light: '#ffffff'
    }
  });
}

export function buildShareUrl(code: string): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.searchParams.set('code', code);
  return url.toString();
}

export function generateRoomCode(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

export function parseCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  return code && /^\d{4}$/.test(code) ? code : null;
}
