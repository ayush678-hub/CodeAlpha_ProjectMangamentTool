import { Request, Response, NextFunction } from 'express';
import { commentService } from '../services/comment.service';
import { notificationService } from '../services/notification.service';
import { searchService } from '../services/search.service';
import { sendSuccess } from '../utils/response';
import {
  createCommentSchema,
  updateCommentSchema,
  addReactionSchema,
} from '../validators/comment.validator';

export const commentController = {
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const comments = await commentService.getTaskComments(req.params.taskId, req.userId!);
      sendSuccess(res, comments);
    } catch (e) { next(e); }
  },

  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = createCommentSchema.parse(req.body);
      const comment = await commentService.createComment(req.params.taskId, req.userId!, input);
      sendSuccess(res, comment, 201);
    } catch (e) { next(e); }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { content } = updateCommentSchema.parse(req.body);
      const comment = await commentService.updateComment(req.params.id, req.userId!, content);
      sendSuccess(res, comment);
    } catch (e) { next(e); }
  },

  delete: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await commentService.deleteComment(req.params.id, req.userId!);
      sendSuccess(res, null, 200, 'Comment deleted');
    } catch (e) { next(e); }
  },

  toggleReaction: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { emoji } = addReactionSchema.parse(req.body);
      const result = await commentService.toggleReaction(req.params.id, req.userId!, emoji);
      sendSuccess(res, result);
    } catch (e) { next(e); }
  },
};

export const notificationController = {
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const [notifications, unreadCount] = await Promise.all([
        notificationService.getUserNotifications(req.userId!, page, limit),
        notificationService.getUnreadCount(req.userId!),
      ]);
      sendSuccess(res, { notifications, unreadCount, page, limit });
    } catch (e) { next(e); }
  },

  markRead: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await notificationService.markRead(req.params.id, req.userId!);
      sendSuccess(res, null, 200, 'Marked as read');
    } catch (e) { next(e); }
  },

  markAllRead: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await notificationService.markAllRead(req.userId!);
      sendSuccess(res, null, 200, 'All notifications marked as read');
    } catch (e) { next(e); }
  },

  delete: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await notificationService.deleteNotification(req.params.id, req.userId!);
      sendSuccess(res, null, 200, 'Notification deleted');
    } catch (e) { next(e); }
  },
};

export const searchController = {
  search: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const q = (req.query.q as string) ?? '';
      const results = await searchService.globalSearch(q, req.userId!);
      sendSuccess(res, results);
    } catch (e) { next(e); }
  },
};
