// Configurable WebSocket Service Factory
export function createWsService(config = {}) {
  const wsBaseUrl = config.wsBaseUrl || 'ws://localhost:8000';
  const wsEndpoints = {
    chat: '/api/ws/chat',
    recording: '/api/ws/recording',
    ...config.wsEndpoints
  };

  const connections = new Map();

  function connect(type, sessionId, handlers) {
    const key = `${type}-${sessionId}`;

    if (connections.has(key)) {
      disconnect(type, sessionId);
    }

    let wsUrl;
    if (type === 'chat') {
      wsUrl = `${wsBaseUrl}${wsEndpoints.chat}?session_id=${sessionId}`;
    } else if (type === 'recording') {
      wsUrl = `${wsBaseUrl}${wsEndpoints.recording}`;
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
      connections.delete(key);
      handlers.onClose?.(event);
    };

    connections.set(key, ws);
    return ws;
  }

  function send(type, sessionId, data) {
    const key = `${type}-${sessionId}`;
    const ws = connections.get(key);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  function disconnect(type, sessionId) {
    const key = `${type}-${sessionId}`;
    const ws = connections.get(key);

    if (ws) {
      ws.close();
      connections.delete(key);
    }
  }

  function disconnectAll() {
    connections.forEach((ws) => ws.close());
    connections.clear();
  }

  function isConnected(type, sessionId) {
    const key = `${type}-${sessionId}`;
    const ws = connections.get(key);
    return ws && ws.readyState === WebSocket.OPEN;
  }

  return {
    connect,
    send,
    disconnect,
    disconnectAll,
    isConnected,
  };
}

export default createWsService;
