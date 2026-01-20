import config from './config';

class WebSocketService {
  constructor() {
    this.connections = new Map();
  }

  connect(type, sessionId, handlers) {
    const key = `${type}-${sessionId}`;

    if (this.connections.has(key)) {
      this.disconnect(type, sessionId);
    }

    let wsUrl;
    if (type === 'chat') {
      wsUrl = `${config.wsBaseUrl}${config.ws.chat}?session_id=${sessionId}`;
    } else if (type === 'recording') {
      wsUrl = `${config.wsBaseUrl}${config.ws.recording}`;
    } else {
      throw new Error(`Unknown WebSocket type: ${type}`);
    }

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`WebSocket connected: ${type}`);
      handlers.onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handlers.onMessage?.(data);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error: ${type}`, error);
      handlers.onError?.(error);
    };

    ws.onclose = (event) => {
      console.log(`WebSocket closed: ${type}`, event.code, event.reason);
      this.connections.delete(key);
      handlers.onClose?.(event);
    };

    this.connections.set(key, ws);
    return ws;
  }

  send(type, sessionId, data) {
    const key = `${type}-${sessionId}`;
    const ws = this.connections.get(key);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  disconnect(type, sessionId) {
    const key = `${type}-${sessionId}`;
    const ws = this.connections.get(key);

    if (ws) {
      ws.close();
      this.connections.delete(key);
    }
  }

  disconnectAll() {
    this.connections.forEach((ws) => ws.close());
    this.connections.clear();
  }

  isConnected(type, sessionId) {
    const key = `${type}-${sessionId}`;
    const ws = this.connections.get(key);
    return ws && ws.readyState === WebSocket.OPEN;
  }
}

export const wsService = new WebSocketService();
export default wsService;
