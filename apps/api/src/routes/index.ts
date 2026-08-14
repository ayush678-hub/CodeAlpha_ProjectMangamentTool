import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { userController } from '../controllers/user.controller';
import { projectController } from '../controllers/project.controller';
import { taskController } from '../controllers/task.controller';
import { commentController, notificationController, searchController } from '../controllers/misc.controller';
import { authenticate } from '../middleware/auth';
import { requireProjectRole } from '../middleware/role';
import { authLimiter, passwordResetLimiter, uploadLimiter } from '../middleware/rateLimiter';
import { upload, handleUploadError } from '../middleware/upload';

const router = Router();

// ============================================================
// Health
// ============================================================
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================
// Auth
// ============================================================
router.post('/auth/register', authLimiter, authController.register);
router.post('/auth/login', authLimiter, authController.login);
router.post('/auth/logout', authenticate, authController.logout);
router.post('/auth/refresh', authController.refresh);
router.get('/auth/me', authenticate, authController.me);
router.get('/auth/verify-email', authController.verifyEmail);
router.post('/auth/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.post('/auth/reset-password', passwordResetLimiter, authController.resetPassword);
router.post('/auth/change-password', authenticate, authController.changePassword);
router.post('/invitations/:token/accept', authenticate, authController.acceptInvitation);

// ============================================================
// Users
// ============================================================
router.get('/users/search', authenticate, userController.searchUsers);
router.get('/users/:id', authenticate, userController.getProfile);
router.patch('/users/me', authenticate, userController.updateProfile);
router.post(
  '/users/me/avatar',
  authenticate,
  uploadLimiter,
  upload.single('avatar'),
  handleUploadError,
  userController.uploadAvatar
);
router.get('/users/me/notification-prefs', authenticate, userController.getNotifPrefs);
router.patch('/users/me/notification-prefs', authenticate, userController.updateNotifPrefs);

// ============================================================
// Projects
// ============================================================
router.get('/projects', authenticate, projectController.list);
router.post('/projects', authenticate, projectController.create);
router.get('/projects/:id', authenticate, requireProjectRole('VIEWER'), projectController.get);
router.patch('/projects/:id', authenticate, requireProjectRole('ADMIN'), projectController.update);
router.delete('/projects/:id', authenticate, requireProjectRole('OWNER'), projectController.delete);

// Board
router.get('/projects/:id/board', authenticate, requireProjectRole('VIEWER'), projectController.getBoard);

// Columns
router.post('/projects/:id/board/:boardId/columns', authenticate, requireProjectRole('MEMBER'), projectController.createColumn);
router.post('/projects/:id/boards/:boardId/columns/reorder', authenticate, requireProjectRole('MEMBER'), projectController.reorderColumns);
router.patch('/projects/:id/columns/:columnId', authenticate, requireProjectRole('MEMBER'), projectController.updateColumn);
router.delete('/projects/:id/columns/:columnId', authenticate, requireProjectRole('ADMIN'), projectController.deleteColumn);

// Members
router.get('/projects/:id/members', authenticate, requireProjectRole('VIEWER'), projectController.getMembers);
router.post('/projects/:id/invitations', authenticate, requireProjectRole('ADMIN'), projectController.inviteMember);
router.patch('/projects/:id/members/:userId/role', authenticate, requireProjectRole('ADMIN'), projectController.updateMemberRole);
router.delete('/projects/:id/members/:userId', authenticate, requireProjectRole('ADMIN'), projectController.removeMember);

// Labels
router.get('/projects/:id/labels', authenticate, requireProjectRole('VIEWER'), projectController.getLabels);
router.post('/projects/:id/labels', authenticate, requireProjectRole('MEMBER'), projectController.createLabel);
router.patch('/projects/:id/labels/:labelId', authenticate, requireProjectRole('MEMBER'), projectController.updateLabel);
router.delete('/projects/:id/labels/:labelId', authenticate, requireProjectRole('ADMIN'), projectController.deleteLabel);

// Stats + Activity
router.get('/projects/:id/stats', authenticate, requireProjectRole('VIEWER'), projectController.getStats);
router.get('/projects/:id/activity', authenticate, requireProjectRole('VIEWER'), projectController.getActivity);

// ============================================================
// Tasks
// ============================================================
router.get('/projects/:projectId/tasks', authenticate, requireProjectRole('VIEWER'), taskController.list);
router.post('/projects/:projectId/tasks', authenticate, requireProjectRole('MEMBER'), taskController.create);
router.get('/projects/:projectId/calendar', authenticate, requireProjectRole('VIEWER'), taskController.getCalendar);
router.post('/tasks/reorder', authenticate, taskController.reorder);
router.get('/tasks/:id', authenticate, taskController.get);
router.patch('/tasks/:id', authenticate, taskController.update);
router.patch('/tasks/:id/move', authenticate, taskController.move);
router.delete('/tasks/:id', authenticate, taskController.delete);
router.post('/tasks/:id/duplicate', authenticate, taskController.duplicate);

// Subtasks
router.get('/tasks/:id/subtasks', authenticate, taskController.getSubtasks);
router.post('/tasks/:id/subtasks', authenticate, taskController.createSubtask);
router.patch('/tasks/:id/subtasks/:subtaskId', authenticate, taskController.updateSubtask);
router.delete('/tasks/:id/subtasks/:subtaskId', authenticate, taskController.deleteSubtask);

// Attachments
router.post('/tasks/:id/attachments', authenticate, uploadLimiter, upload.single('file'), handleUploadError, taskController.uploadAttachment);
router.delete('/tasks/:id/attachments/:attachmentId', authenticate, taskController.deleteAttachment);

// Time entries
router.get('/tasks/:id/time-entries', authenticate, taskController.getTimeEntries);
router.post('/tasks/:id/time-entries', authenticate, taskController.addTimeEntry);

// ============================================================
// Comments
// ============================================================
router.get('/tasks/:taskId/comments', authenticate, commentController.list);
router.post('/tasks/:taskId/comments', authenticate, commentController.create);
router.patch('/comments/:id', authenticate, commentController.update);
router.delete('/comments/:id', authenticate, commentController.delete);
router.post('/comments/:id/reactions', authenticate, commentController.toggleReaction);

// ============================================================
// Notifications
// ============================================================
router.get('/notifications', authenticate, notificationController.list);
router.patch('/notifications/read-all', authenticate, notificationController.markAllRead);
router.patch('/notifications/:id/read', authenticate, notificationController.markRead);
router.delete('/notifications/:id', authenticate, notificationController.delete);

// ============================================================
// Search
// ============================================================
router.get('/search', authenticate, searchController.search);

export default router;
