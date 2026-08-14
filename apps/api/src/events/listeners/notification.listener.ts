import { eventEmitter, AppEvents } from '../emitter';
import { notificationRepository } from '../../repositories/notification.repository';
import { userRepository } from '../../repositories/user.repository';
import { projectRepository } from '../../repositories/project.repository';

/**
 * Notification listener — decoupled from controllers.
 * Listens for app events and creates DB notifications + queues emails.
 */
export const registerNotificationListeners = (): void => {
  // Task assigned
  eventEmitter.on(
    AppEvents.TASK_ASSIGNED,
    async (data: {
      projectId: string;
      taskId: string;
      taskTitle: string;
      assigneeIds: string[];
      actorId: string;
    }) => {
      try {
        const actor = await userRepository.findById(data.actorId);
        await notificationRepository.createMany(
          data.assigneeIds
            .filter((id) => id !== data.actorId)
            .map((userId) => ({
              type: 'TASK_ASSIGNED' as const,
              title: 'Task Assigned',
              message: `${actor?.name ?? 'Someone'} assigned you to "${data.taskTitle}"`,
              userId,
              actorId: data.actorId,
              projectId: data.projectId,
              taskId: data.taskId,
            }))
        );
      } catch (e) {
        console.error('Notification error (TASK_ASSIGNED):', e);
      }
    }
  );

  // User mentioned in comment
  eventEmitter.on(
    AppEvents.USER_MENTIONED,
    async (data: {
      projectId: string;
      taskId: string;
      taskTitle: string;
      commentId: string;
      mentionedUserIds: string[];
      actorId: string;
    }) => {
      try {
        const actor = await userRepository.findById(data.actorId);
        await notificationRepository.createMany(
          data.mentionedUserIds.map((userId) => ({
            type: 'COMMENT_MENTION' as const,
            title: 'You were mentioned',
            message: `${actor?.name ?? 'Someone'} mentioned you in "${data.taskTitle}"`,
            userId,
            actorId: data.actorId,
            projectId: data.projectId,
            taskId: data.taskId,
          }))
        );
      } catch (e) {
        console.error('Notification error (USER_MENTIONED):', e);
      }
    }
  );

  // Task status changed
  eventEmitter.on(
    AppEvents.TASK_STATUS_CHANGED,
    async (data: {
      projectId: string;
      taskId: string;
      taskTitle: string;
      oldStatus: string;
      newStatus: string;
      actorId: string;
      assigneeIds: string[];
    }) => {
      try {
        const actor = await userRepository.findById(data.actorId);
        await notificationRepository.createMany(
          data.assigneeIds
            .filter((id) => id !== data.actorId)
            .map((userId) => ({
              type: 'TASK_STATUS_CHANGED' as const,
              title: 'Task Status Updated',
              message: `${actor?.name ?? 'Someone'} moved "${data.taskTitle}" to ${data.newStatus.replace('_', ' ')}`,
              userId,
              actorId: data.actorId,
              projectId: data.projectId,
              taskId: data.taskId,
            }))
        );
      } catch (e) {
        console.error('Notification error (TASK_STATUS_CHANGED):', e);
      }
    }
  );

  // Member joined
  eventEmitter.on(
    AppEvents.MEMBER_JOINED,
    async (data: { projectId: string; userId: string; actorId: string }) => {
      try {
        const actor = await userRepository.findById(data.actorId);
        const project = await projectRepository.findById(data.projectId);
        if (!project) return;

        await notificationRepository.create({
          type: 'MEMBER_JOINED',
          title: 'New Project Member',
          message: `${actor?.name ?? 'Someone'} joined project "${project.name}"`,
          userId: data.userId,
          actorId: data.actorId,
          projectId: data.projectId,
        });
      } catch (e) {
        console.error('Notification error (MEMBER_JOINED):', e);
      }
    }
  );

  console.log('✅ Notification listeners registered');
};
