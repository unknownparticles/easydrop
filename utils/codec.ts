const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const encodeChunk = (fileId: string, index: number, payload: ArrayBuffer) => {
  const fileIdBytes = textEncoder.encode(fileId);
  const headerLength = 1 + 2 + 4 + fileIdBytes.length;
  const buffer = new ArrayBuffer(headerLength + payload.byteLength);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  view.setUint8(0, 1);
  view.setUint16(1, fileIdBytes.length);
  view.setUint32(3, index);
  bytes.set(fileIdBytes, 7);
  bytes.set(new Uint8Array(payload), headerLength);
  return buffer;
};

export const decodeChunk = (buffer: ArrayBuffer) => {
  const view = new DataView(buffer);
  const type = view.getUint8(0);
  if (type !== 1) return null;
  const fileIdLength = view.getUint16(1);
  const index = view.getUint32(3);
  const bytes = new Uint8Array(buffer);
  const fileIdStart = 7;
  const fileIdEnd = fileIdStart + fileIdLength;
  const fileId = textDecoder.decode(bytes.slice(fileIdStart, fileIdEnd));
  const payload = bytes.slice(fileIdEnd).buffer;
  return { fileId, index, payload };
};

export const mergeChunks = (chunks: Array<Uint8Array | null>) => {
  const totalSize = chunks.reduce((acc, chunk) => acc + (chunk ? chunk.byteLength : 0), 0);
  const merged = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    if (!chunk) continue;
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
};

export const decodeText = (payload: Uint8Array) => textDecoder.decode(payload);
export const encodeText = (text: string) => textEncoder.encode(text);
