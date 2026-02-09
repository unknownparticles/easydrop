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
const clients = new Map(); // id -> { ws, device }

function broadcast(type, payload) {
  const message = JSON.stringify({ type, payload });
  for (const { ws } of clients.values()) {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  }
}

function sendTo(id, type, payload) {
  const client = clients.get(id);
  if (!client) return;
  if (client.ws.readyState === client.ws.OPEN) {
    client.ws.send(JSON.stringify({ type, payload }));
  }
}

function presenceList() {
  return Array.from(clients.values()).map(({ device }) => ({
    id: device.id,
    name: device.name,
    type: device.type,
    status: 'online',
    lastSeen: Date.now()
  }));
}

wss.on('connection', (ws) => {
  let clientId = null;

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
      clients.set(device.id, { ws, device: { ...device } });
      broadcast('presence:list', { devices: presenceList() });
      return;
    }

    if (!clientId) return;

    if (type === 'rename') {
      const client = clients.get(clientId);
      if (client) {
        client.device.name = payload?.name || client.device.name;
        broadcast('presence:list', { devices: presenceList() });
      }
      return;
    }

    if (type === 'share:request') {
      sendTo(payload?.to, 'share:request', { ...payload, from: clientId });
      return;
    }

    if (type === 'share:accept') {
      sendTo(payload?.to, 'share:accept', { ...payload, from: clientId });
      return;
    }

    if (type === 'share:reject') {
      sendTo(payload?.to, 'share:reject', { ...payload, from: clientId });
      return;
    }

    if (type === 'rtc:offer' || type === 'rtc:answer' || type === 'rtc:ice') {
      sendTo(payload?.to, type, { ...payload, from: clientId });
      return;
    }

    if (type === 'text:message') {
      sendTo(payload?.to, 'text:message', { ...payload, from: clientId });
    }
  });

  ws.on('close', () => {
    if (clientId && clients.has(clientId)) {
      clients.delete(clientId);
      broadcast('presence:list', { devices: presenceList() });
    }
  });
});

server.listen(PORT, () => {
  const protocol = hasCert ? 'https' : 'http';
  console.log(`[server] ${protocol}://0.0.0.0:${PORT} (ws: /ws)`);
});
