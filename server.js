import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import express from 'express';
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const distDir = path.join(__dirname, 'dist');
const certDir = process.env.SSL_CERT_DIR || path.join(__dirname, '.certs');
const keyPath = process.env.SSL_KEY || path.join(certDir, 'localdrop.key');
const certPath = process.env.SSL_CERT || path.join(certDir, 'localdrop.crt');
const hasCert = fs.existsSync(keyPath) && fs.existsSync(certPath);

if (!fs.existsSync(distDir)) {
  console.error('[server] dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

const app = express();
app.use(express.static(distDir, { extensions: ['html'] }));
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

const server = hasCert
  ? https.createServer({
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    }, app)
  : http.createServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });

// Room-based client management: roomId -> Map<deviceId, { ws, device }>
const rooms = new Map();
// Track code creation times for expiry: code -> timestamp
const codeExpiry = new Map();
// Track each ws -> { roomId, clientId } for cleanup
const wsRoomMap = new WeakMap();

const CODE_TTL = 60 * 60 * 1000; // 1 hour

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function getRoomId(req) {
  const url = new URL(req.url, 'http://localhost');
  const code = url.searchParams.get('code');
  if (code && /^\d{4}$/.test(code)) {
    if (!codeExpiry.has(code)) {
      codeExpiry.set(code, Date.now());
    }
    return `code:${code}`;
  }
  return `ip:${getClientIp(req)}`;
}

function getRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Map());
  return rooms.get(roomId);
}

function broadcastToRoom(roomId, type, payload) {
  const room = rooms.get(roomId);
  if (!room) return;
  const message = JSON.stringify({ type, payload });
  for (const { ws } of room.values()) {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  }
}

function sendTo(roomId, id, type, payload) {
  const room = rooms.get(roomId);
  if (!room) return;
  const client = room.get(id);
  if (!client) return;
  if (client.ws.readyState === client.ws.OPEN) {
    client.ws.send(JSON.stringify({ type, payload }));
  }
}

function presenceList(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.values()).map(({ device }) => ({
    id: device.id,
    name: device.name,
    type: device.type,
    status: 'online',
    lastSeen: Date.now()
  }));
}

// Cleanup expired code rooms every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [code, created] of codeExpiry) {
    if (now - created > CODE_TTL) {
      const roomId = `code:${code}`;
      const room = rooms.get(roomId);
      if (room) {
        for (const { ws } of room.values()) {
          try { ws.close(1000, 'Code expired'); } catch { /* ignore */ }
        }
        rooms.delete(roomId);
      }
      codeExpiry.delete(code);
    }
  }
}, 60_000);

wss.on('connection', (ws, req) => {
  let clientId = null;
  const roomId = getRoomId(req);
  wsRoomMap.set(ws, { roomId, clientId: null });

  ws.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch (err) {
      return;
    }

    const { type, payload } = message || {};
    if (!type) return;

    if (type === 'hello') {
      const device = payload?.device;
      if (!device?.id) return;
      clientId = device.id;
      wsRoomMap.set(ws, { roomId, clientId });
      const room = getRoom(roomId);
      room.set(device.id, { ws, device: { ...device } });
      broadcastToRoom(roomId, 'presence:list', { devices: presenceList(roomId) });
      return;
    }

    if (!clientId) return;

    if (type === 'rename') {
      const room = rooms.get(roomId);
      const client = room?.get(clientId);
      if (client) {
        client.device.name = payload?.name || client.device.name;
        broadcastToRoom(roomId, 'presence:list', { devices: presenceList(roomId) });
      }
      return;
    }

    if (type === 'share:request') {
      sendTo(roomId, payload?.to, 'share:request', { ...payload, from: clientId });
      return;
    }

    if (type === 'share:accept') {
      sendTo(roomId, payload?.to, 'share:accept', { ...payload, from: clientId });
      return;
    }

    if (type === 'share:reject') {
      sendTo(roomId, payload?.to, 'share:reject', { ...payload, from: clientId });
      return;
    }

    if (type === 'rtc:offer' || type === 'rtc:answer' || type === 'rtc:ice') {
      sendTo(roomId, payload?.to, type, { ...payload, from: clientId });
      return;
    }

    if (type === 'text:message') {
      sendTo(roomId, payload?.to, 'text:message', { ...payload, from: clientId });
      return;
    }

    if (type === 'relay:file-meta' || type === 'relay:file-chunk' || type === 'relay:file-complete') {
      sendTo(roomId, payload?.to, type, { ...payload, from: clientId });
    }
  });

  ws.on('close', () => {
    const info = wsRoomMap.get(ws);
    if (info?.clientId && rooms.has(info.roomId)) {
      const room = rooms.get(info.roomId);
      if (room.has(info.clientId)) {
        room.delete(info.clientId);
        broadcastToRoom(info.roomId, 'presence:list', { devices: presenceList(info.roomId) });
        // Clean up empty rooms
        if (room.size === 0) rooms.delete(info.roomId);
      }
    }
  });
});

server.listen(PORT, () => {
  const protocol = hasCert ? 'https' : 'http';
  console.log(`[server] ${protocol}://0.0.0.0:${PORT} (ws: /ws)`);
});
