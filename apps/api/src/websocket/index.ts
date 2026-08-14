import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyAccessToken } from '../utils/jwt';
import { eventEmitter, AppEvents } from '../events/emitter';
import { env } from '../lib/env';
import prisma from '../lib/prisma';

// Track presence: projectId → Map<userId, { user, joinedAt }>
const presence = new Map<string, Map<string, { userId: string; name: string; avatar?: string | null; joinedAt: Date }>>();

export const setupWebSocket = (httpServer: HttpServer): SocketServer => {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token as string;
      if (!token) throw new Error('No token');

      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, name: true, avatar: true },
      });
      if (!user) throw new Error('User not found');

      socket.data.user = user;
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as { id: string; name: string; avatar?: string | null };
    console.log(`[WS] User connected: ${user.id}`);

    // Join project room
    socket.on('project:join', (projectId: string) => {
      socket.join(`project:${projectId}`);

      // Update presence
      if (!presence.has(projectId)) presence.set(projectId, new Map());
      presence.get(projectId)!.set(user.id, { userId: user.id, name: user.name, avatar: user.avatar, joinedAt: new Date() });

      const presenceList = [...(presence.get(projectId)?.values() ?? [])];
      io.to(`project:${projectId}`).emit('presence:update', { projectId, users: presenceList });
    });

    // Leave project room
    socket.on('project:leave', (projectId: string) => {
      socket.leave(`project:${projectId}`);
      presence.get(projectId)?.delete(user.id);

      const presenceList = [...(presence.get(projectId)?.values() ?? [])];
      io.to(`project:${projectId}`).emit('presence:update', { projectId, users: presenceList });
    });

    // Join task room (for typing indicators)
    socket.on('task:join', (taskId: string) => {
      socket.join(`task:${taskId}`);
    });

    socket.on('task:leave', (taskId: string) => {
      socket.leave(`task:${taskId}`);
    });

    // User room for personal notifications
    socket.join(`user:${user.id}`);

    // Typing indicators
    socket.on('typing:start', ({ taskId }: { taskId: string }) => {
      socket.to(`task:${taskId}`).emit('typing:start', { userId: user.id, name: user.name, taskId });
    });

    socket.on('typing:stop', ({ taskId }: { taskId: string }) => {
      socket.to(`task:${taskId}`).emit('typing:stop', { userId: user.id, taskId });
    });

    socket.on('disconnect', () => {
      // Remove from all presence maps
      presence.forEach((map, projectId) => {
        if (map.has(user.id)) {
          map.delete(user.id);
          const presenceList = [...map.values()];
          io.to(`project:${projectId}`).emit('presence:update', { projectId, users: presenceList });
        }
      });
      console.log(`[WS] User disconnected: ${user.id}`);
    });
  });

  // Bridge event emitter → Socket.IO

  eventEmitter.on(AppEvents.TASK_CREATED, ({ projectId, task, userId }) => {
    io.to(`project:${projectId}`).emit('task:created', { projectId, task, userId, timestamp: new Date() });
  });

  eventEmitter.on(AppEvents.TASK_UPDATED, ({ projectId, task, userId }) => {
    io.to(`project:${projectId}`).emit('task:updated', { projectId, task, userId, timestamp: new Date() });
  });

  eventEmitter.on(AppEvents.TASK_DELETED, ({ projectId, taskId, userId }) => {
    io.to(`project:${projectId}`).emit('task:deleted', { projectId, taskId, userId, timestamp: new Date() });
  });

  eventEmitter.on(AppEvents.TASK_MOVED, ({ projectId, task, userId, fromColumnId, toColumnId }) => {
    io.to(`project:${projectId}`).emit('task:moved', { projectId, task, userId, fromColumnId, toColumnId, timestamp: new Date() });
  });

  eventEmitter.on(AppEvents.COMMENT_ADDED, ({ projectId, taskId, comment, userId }) => {
    io.to(`project:${projectId}`).emit('comment:added', { projectId, taskId, comment, userId, timestamp: new Date() });
  });

  eventEmitter.on(AppEvents.COMMENT_EDITED, ({ projectId, taskId, comment, userId }) => {
    io.to(`project:${projectId}`).emit('comment:edited', { projectId, taskId, comment, userId, timestamp: new Date() });
  });

  eventEmitter.on(AppEvents.COMMENT_DELETED, ({ projectId, taskId, commentId, userId }) => {
    io.to(`project:${projectId}`).emit('comment:deleted', { projectId, taskId, commentId, userId, timestamp: new Date() });
  });

  eventEmitter.on(AppEvents.MEMBER_REMOVED, ({ projectId, userId }) => {
    io.to(`project:${projectId}`).emit('member:removed', { projectId, userId, timestamp: new Date() });
  });

  // Personal notification push
  eventEmitter.on(AppEvents.NOTIFICATION_CREATED, ({ userId, notification }) => {
    io.to(`user:${userId}`).emit('notification:new', { notification, timestamp: new Date() });
  });

  console.log('✅ WebSocket server initialized');
  return io;
};
