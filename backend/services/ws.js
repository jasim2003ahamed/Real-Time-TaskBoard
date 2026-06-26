const { WebSocketServer, WebSocket } = require('ws');
const logger = require('../utils/logger');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.onlineCount = 0;
  }

  initialize(serverOrPort) {
    const options = typeof serverOrPort === 'number' ? { port: serverOrPort } : { server: serverOrPort };
    this.wss = new WebSocketServer(options);
    
    logger.info(`WebSocket server initialized.`);

    this.wss.on('connection', (ws) => {
      this.handleConnection(ws);
    });
  }

  handleConnection(ws) {
    this.onlineCount++;
    logger.info(`Client connected. Total online: ${this.onlineCount}`);

    // Broadcast presence update
    this.broadcast({ type: 'PRESENCE_CHANGE', count: this.onlineCount });

    ws.on('message', (message) => {
      this.handleMessage(ws, message);
    });

    ws.on('close', () => {
      this.handleDisconnect();
    });

    ws.on('error', (error) => {
      logger.error('Socket connection error:', error);
    });
  }

  handleMessage(ws, message) {
    try {
      const parsed = JSON.parse(message);
      logger.info(`Received broadcast event: ${parsed.type}`);
      
      // Broadcast the event to all other clients
      this.broadcast(parsed, ws);
    } catch (error) {
      logger.error('Error processing message payload:', error);
    }
  }

  handleDisconnect() {
    this.onlineCount = Math.max(0, this.onlineCount - 1);
    logger.info(`Client disconnected. Total online: ${this.onlineCount}`);
    this.broadcast({ type: 'PRESENCE_CHANGE', count: this.onlineCount });
  }

  broadcast(data, excludeWs = null) {
    if (!this.wss) return;
    const payload = JSON.stringify(data);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        if (excludeWs && client === excludeWs) {
          return;
        }
        client.send(payload);
      }
    });
  }
}

module.exports = new WebSocketService();
