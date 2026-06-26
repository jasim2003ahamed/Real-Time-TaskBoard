const logger = require('./utils/logger');
const wsService = require('./services/ws');

// Initialize Dotenv config if dotenv package is installed
try {
  require('dotenv').config();
} catch (e) {
  logger.warn('dotenv package not found, defaulting to system environment settings.');
}

const PORT = process.env.WS_PORT || 3001;

function startServer() {
  try {
    logger.info(`Starting production WebSocket server...`);
    wsService.initialize(Number(PORT));
    logger.info(`WebSocket server is listening on port ${PORT}`);
  } catch (error) {
    logger.error('Failed to start WebSocket server:', error);
    process.exit(1);
  }
}

startServer();
