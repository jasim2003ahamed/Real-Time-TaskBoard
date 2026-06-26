import { useEffect, useState, useRef } from 'react';
import { ConnectionStatus, WSMessage } from '../types';

export function useWebSocket(
  clientId: string,
  onMessageReceived: (message: WSMessage) => void,
  onReconnect: () => void
) {
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [reconnectDelay, setReconnectDelay] = useState<number>(1000);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connectWS = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setConnectionStatus('reconnecting');

    const wsUrl = `ws://${window.location.hostname}:3001`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setConnectionStatus('connected');
      setReconnectDelay(1000);
      onReconnect();
    };

    socket.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        if (message.clientId === clientId) return;

        if (message.type === 'PRESENCE_CHANGE') {
          setOnlineCount(message.count || 1);
        } else {
          onMessageReceived(message);
        }
      } catch (err) {
        console.error('[WS] Error processing message payload:', err);
      }
    };

    socket.onclose = () => {
      setConnectionStatus('reconnecting');
      wsRef.current = null;

      reconnectTimeoutRef.current = setTimeout(() => {
        setReconnectDelay((prev) => Math.min(prev * 2, 16000));
        connectWS();
      }, reconnectDelay);
    };

    socket.onerror = (error) => {
      console.error('[WS] Socket error encountered:', error);
      socket.close();
    };
  };

  const sendMessage = (type: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type,
          clientId,
          ...payload,
        })
      );
    }
  };

  useEffect(() => {
    connectWS();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return { connectionStatus, onlineCount, sendMessage };
}
