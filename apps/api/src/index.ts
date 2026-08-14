import http from 'http';
import app from './app';
import { env } from './lib/env';
import prisma from './lib/prisma';
import redis from './lib/redis';
import { setupWebSocket } from './websocket/index';
import { registerNotificationListeners } from './events/listeners/notification.listener';

const httpServer = http.createServer(app);

// Initialize WebSocket server
setupWebSocket(httpServer);

// Register event-driven listeners
registerNotificationListeners();

const startServer = async () => {
  try {
    // Test DB connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // Test Redis connection
    await redis.connect();

    // Start server
    httpServer.listen(env.PORT, () => {
      console.log(`🚀 Server running on port ${env.PORT} (${env.NODE_ENV})`);
      console.log(`📡 WebSocket server ready`);
      console.log(`🔗 API: http://localhost:${env.PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  httpServer.close(async () => {
    await prisma.$disconnect();
    await redis.quit();
    console.log('✅ Server shut down cleanly');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
