import { notificationRepository } from '../repositories/notification.repository';
import { eventEmitter, AppEvents } from '../events/emitter';
import type { NotificationType } from '@prisma/client';

export const notificationService = {
  getUserNotifications: (userId: string, page: number, limit: number) =>
    notificationRepository.getForUser(userId, page, limit),

  getUnreadCount: (userId: string) => notificationRepository.getUnreadCount(userId),

  createNotification: async (data: {
    type: NotificationType;
    title: string;
    message: string;
    userId: string;
    actorId?: string;
    projectId?: string;
    taskId?: string;
    metadata?: Record<string, unknown>;
  }) => {
    const notif = await notificationRepository.create(data);

    // Push via WebSocket
    eventEmitter.emit(AppEvents.NOTIFICATION_CREATED, {
      userId: data.userId,
      notification: notif,
    });

    return notif;
  },

  markRead: (notifId: string, userId: string) =>
    notificationRepository.markRead(notifId, userId),

  markAllRead: (userId: string) => notificationRepository.markAllRead(userId),

  deleteNotification: (notifId: string, userId: string) =>
    notificationRepository.delete(notifId, userId),
};
