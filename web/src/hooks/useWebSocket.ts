import { useEffect, useRef, useState, useCallback } from 'react';

interface WSMessage {
  type: 'start' | 'stdout' | 'stderr' | 'retry' | 'finish';
  data: string;
}

export function useWebSocket(executionId: number | null) {
  const [messages, setMessages] = useState<WSMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!executionId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/v1/ws/logs/${executionId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        setMessages(prev => [...prev, msg]);
      } catch {
        // ignore parse errors
      }
    };

    wsRef.current = ws;
  }, [executionId]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
  }, []);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return { messages, connected, clear };
}
