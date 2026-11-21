import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export interface WsEvent {
  event: 'camera_ready' | 'photo_captured' | 'processing_complete' | 'print_started' | 'print_completed' | 'printer_error' | 'session_updated' | 'heartbeat';
  payload: Record<string, unknown>;
  timestamp: string;
}

export function initWebSocketServer(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    clients.add(ws);

    // Send immediate connection acknowledge
    ws.send(JSON.stringify({
      event: 'connected',
      payload: { message: 'Connected to Photo Booth WebSocket server' },
      timestamp: new Date().toISOString()
    }));

    ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        }
      } catch {
        // ignore non-json messages
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('WebSocket client error:', err);
      clients.delete(ws);
    });
  });

  return wss;
}

export function broadcastEvent(event: WsEvent['event'], payload: Record<string, unknown>): void {
  if (!wss) return;

  const message: WsEvent = {
    event,
    payload,
    timestamp: new Date().toISOString()
  };

  const serialized = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(serialized);
    }
  }
}
