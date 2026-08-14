import { commentRepository } from '../repositories/comment.repository';
import { taskRepository } from '../repositories/task.repository';
import { userRepository } from '../repositories/user.repository';
import { createError } from '../middleware/error';
import { createActivity } from '../utils/activity';
import { eventEmitter, AppEvents } from '../events/emitter';
import type { CreateCommentInput } from '../validators/comment.validator';

// Extract @mentions from content: "Hello @john how are you"
export const extractMentions = (content: string): string[] => {
  const regex = /@([a-zA-Z0-9_]+)/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.push(match[1]);
  }
  return [...new Set(matches)];
};

export const commentService = {
  getTaskComments: async (taskId: string, userId: string) => {
    const task = await taskRepository.findById(taskId);
    if (!task) throw createError('Task not found', 404, 'NOT_FOUND');
    return commentRepository.getTaskComments(taskId);
  },

  createComment: async (taskId: string, userId: string, input: CreateCommentInput) => {
    const task = await taskRepository.findById(taskId);
    if (!task) throw createError('Task not found', 404, 'NOT_FOUND');

    const comment = await commentRepository.create({
      content: input.content,
      task: { connect: { id: taskId } },
      author: { connect: { id: userId } },
      ...(input.parentId && { parent: { connect: { id: input.parentId } } }),
    });

    // Process @mentions from content
    const mentionedUsernames = extractMentions(input.content);
    const mentionedUserIds: string[] = [...input.mentionIds];

    if (mentionedUsernames.length) {
      const users = await Promise.all(
        mentionedUsernames.map((u) => userRepository.findByUsername(u))
      );
      users.forEach((u) => {
        if (u && !mentionedUserIds.includes(u.id)) mentionedUserIds.push(u.id);
      });
    }

    if (mentionedUserIds.length) {
      await commentRepository.addMentions(comment.id, mentionedUserIds);
    }

    await createActivity({
      action: 'COMMENT_ADDED',
      description: 'Added a comment',
      userId,
      projectId: task.projectId,
      taskId,
    });

    const fullComment = await commentRepository.findById(comment.id);

    eventEmitter.emit(AppEvents.COMMENT_ADDED, {
      projectId: task.projectId,
      taskId,
      comment: fullComment,
      userId,
    });

    // Emit mention notifications
    if (mentionedUserIds.length) {
      eventEmitter.emit(AppEvents.USER_MENTIONED, {
        projectId: task.projectId,
        taskId,
        taskTitle: task.title,
        commentId: comment.id,
        mentionedUserIds: mentionedUserIds.filter((id) => id !== userId),
        actorId: userId,
      });
    }

    return fullComment;
  },

  updateComment: async (commentId: string, userId: string, content: string) => {
    const comment = await commentRepository.findById(commentId);
    if (!comment) throw createError('Comment not found', 404, 'NOT_FOUND');
    if (comment.authorId !== userId)
      throw createError('Cannot edit another user\'s comment', 403, 'FORBIDDEN');

    const updated = await commentRepository.update(commentId, {
      content,
      isEdited: true,
    });

    const task = await taskRepository.findById(comment.taskId);
    eventEmitter.emit(AppEvents.COMMENT_EDITED, {
      projectId: task?.projectId,
      taskId: comment.taskId,
      comment: updated,
      userId,
    });

    return updated;
  },

  deleteComment: async (commentId: string, userId: string) => {
    const comment = await commentRepository.findById(commentId);
    if (!comment) throw createError('Comment not found', 404, 'NOT_FOUND');
    if (comment.authorId !== userId)
      throw createError('Cannot delete another user\'s comment', 403, 'FORBIDDEN');

    const task = await taskRepository.findById(comment.taskId);
    await commentRepository.delete(commentId);

    eventEmitter.emit(AppEvents.COMMENT_DELETED, {
      projectId: task?.projectId,
      taskId: comment.taskId,
      commentId,
      userId,
    });
  },

  toggleReaction: async (commentId: string, userId: string, emoji: string) => {
    const existing = await commentRepository.findReaction(commentId, userId, emoji);

    if (existing) {
      await commentRepository.removeReaction(commentId, userId, emoji);
      return { action: 'removed' };
    } else {
      await commentRepository.addReaction(commentId, userId, emoji);
      return { action: 'added' };
    }
  },
};
