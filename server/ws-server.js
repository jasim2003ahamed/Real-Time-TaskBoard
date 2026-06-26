const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.WS_PORT || 3001;
const wss = new WebSocketServer({ port: PORT });

console.log(`[WS] Server listening on port ${PORT}`);

let onlineCount = 0;

function broadcast(data, excludeWs = null) {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      if (excludeWs && client === excludeWs) {
        return; // skip sender
      }
      client.send(payload);
    }
  });
}

wss.on('connection', (ws) => {
  onlineCount++;
  console.log(`[WS] Client connected. Total online: ${onlineCount}`);

  // Send initial presence broadcast to all clients
  broadcast({ type: 'PRESENCE_CHANGE', count: onlineCount });

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      console.log(`[WS] Broadcast event: ${parsed.type}`);
      
      // Broadcast the event to all OTHER clients
      broadcast(parsed, ws);
    } catch (error) {
      console.error('[WS] Error processing message:', error);
    }
  });

  ws.on('close', () => {
    onlineCount = Math.max(0, onlineCount - 1);
    console.log(`[WS] Client disconnected. Total online: ${onlineCount}`);
    broadcast({ type: 'PRESENCE_CHANGE', count: onlineCount });
  });

  ws.on('error', (error) => {
    console.error('[WS] Connection error:', error);
  });
});
