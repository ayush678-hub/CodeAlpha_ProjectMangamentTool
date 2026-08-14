import prisma from '../lib/prisma';
import { NotificationType } from '@prisma/client';
import { delCache, CACHE_KEYS } from '../lib/redis';

export const notificationRepository = {
  getForUser: (userId: string, page: number, limit: number) =>
    prisma.notification.findMany({
      where: { userId },
      include: {
        actor: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),

  getUnreadCount: (userId: string) =>
    prisma.notification.count({ where: { userId, read: false } }),

  create: async (data: {
    type: NotificationType;
    title: string;
    message: string;
    userId: string;
    actorId?: string;
    projectId?: string;
    taskId?: string;
    metadata?: Record<string, unknown>;
  }) => {
    const notif = await prisma.notification.create({
      data: {
        ...data,
        metadata: data.metadata as object | undefined,
      },
      include: {
        actor: { select: { id: true, name: true, avatar: true } },
      },
    });
    // Invalidate unread count cache
    await delCache(CACHE_KEYS.unreadCount(data.userId));
    return notif;
  },

  createMany: async (
    notifications: Array<{
      type: NotificationType;
      title: string;
      message: string;
      userId: string;
      actorId?: string;
      projectId?: string;
      taskId?: string;
    }>
  ) => {
    if (!notifications.length) return;
    await prisma.notification.createMany({ data: notifications });
    // Invalidate caches for all recipients
    const userIds = [...new Set(notifications.map((n) => n.userId))];
    await Promise.all(userIds.map((id) => delCache(CACHE_KEYS.unreadCount(id))));
  },

  markRead: async (id: string, userId: string) => {
    const notif = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    await delCache(CACHE_KEYS.unreadCount(userId));
    return notif;
  },

  markAllRead: async (userId: string) => {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    await delCache(CACHE_KEYS.unreadCount(userId));
  },

  delete: (id: string, userId: string) =>
    prisma.notification.delete({ where: { id, userId } }),
};
