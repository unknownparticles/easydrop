interface DeviceInfo {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  clientVersion?: string;
}

interface Session {
  ws: WebSocket;
  device: DeviceInfo;
}

interface Attachment {
  deviceId: string | null;
  device?: DeviceInfo;
}

export interface Env {
  SIGNAL_ROOM: DurableObjectNamespace;
}

const OPEN = 1;

function asString(data: string | ArrayBuffer): string {
  return typeof data === 'string' ? data : new TextDecoder().decode(data);
}

function json(type: string, payload: unknown): string {
  return JSON.stringify({ type, payload });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/ws' && request.headers.get('upgrade') === 'websocket') {
      const id = env.SIGNAL_ROOM.idFromName('global');
      return env.SIGNAL_ROOM.get(id).fetch(request);
    }
    return new Response('EasyDrop signaling worker is running.\nUse WebSocket path: /ws', { status: 200 });
  }
};

export class SignalRoom {
  private readonly state: DurableObjectState;
  private readonly sessions = new Map<string, Session>();

  constructor(state: DurableObjectState) {
    this.state = state;
    for (const ws of this.state.getWebSockets()) {
      const attachment = ws.deserializeAttachment() as Attachment | null;
      if (attachment?.deviceId && attachment.device) {
        this.sessions.set(attachment.deviceId, { ws, device: attachment.device });
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ deviceId: null } satisfies Attachment);
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    let parsed: any;
    try {
      parsed = JSON.parse(asString(message));
    } catch {
      return;
    }
    const { type, payload } = parsed || {};
    if (!type) return;

    if (type === 'hello') {
      const device = payload?.device as DeviceInfo | undefined;
      if (!device?.id || !device?.name || !device?.type) return;

      const current = this.sessions.get(device.id);
      if (current && current.ws !== ws) {
        try { current.ws.close(1012, 'replaced'); } catch {}
      }
      this.sessions.set(device.id, { ws, device: { ...device } });
      ws.serializeAttachment({ deviceId: device.id, device: { ...device } } satisfies Attachment);
      this.broadcastPresence();
      return;
    }

    const senderId = this.senderId(ws);
    if (!senderId) return;

    if (type === 'rename') {
      const session = this.sessions.get(senderId);
      if (!session) return;
      const name = String(payload?.name || '').trim();
      if (!name) return;
      session.device.name = name;
      ws.serializeAttachment({ deviceId: senderId, device: { ...session.device } } satisfies Attachment);
      this.broadcastPresence();
      return;
    }

    if (type === 'share:request' || type === 'share:accept' || type === 'share:reject' ||
      type === 'rtc:offer' || type === 'rtc:answer' || type === 'rtc:ice') {
      const to = payload?.to as string | undefined;
      if (!to) return;
      this.sendTo(to, type, { ...payload, from: senderId });
    }
  }

  webSocketClose(ws: WebSocket): void {
    this.removeSessionBySocket(ws);
  }

  webSocketError(ws: WebSocket): void {
    this.removeSessionBySocket(ws);
  }

  private senderId(ws: WebSocket): string | null {
    const attachment = ws.deserializeAttachment() as Attachment | null;
    return attachment?.deviceId || null;
  }

  private removeSessionBySocket(ws: WebSocket): void {
    const senderId = this.senderId(ws);
    if (!senderId) return;
    const session = this.sessions.get(senderId);
    if (!session || session.ws !== ws) return;
    this.sessions.delete(senderId);
    this.broadcastPresence();
  }

  private broadcastPresence(): void {
    const devices = Array.from(this.sessions.values()).map(({ device }) => ({
      id: device.id,
      name: device.name,
      type: device.type,
      status: 'online',
      lastSeen: Date.now()
    }));
    const message = json('presence:list', { devices });
    for (const session of this.sessions.values()) {
      if (session.ws.readyState === OPEN) {
        session.ws.send(message);
      }
    }
  }

  private sendTo(id: string, type: string, payload: unknown): void {
    const target = this.sessions.get(id);
    if (!target || target.ws.readyState !== OPEN) return;
    target.ws.send(json(type, payload));
  }
}
