import { Request, Response, NextFunction } from 'express';
import { taskService } from '../services/task.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import {
  createTaskSchema,
  updateTaskSchema,
  moveTaskSchema,
  reorderTasksSchema,
  createSubtaskSchema,
  updateSubtaskSchema,
  createTimeEntrySchema,
  taskFilterSchema,
} from '../validators/task.validator';
import type { TaskFilters } from '../repositories/task.repository';
import type { TaskPriority, TaskStatus } from '@prisma/client';

export const taskController = {
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = taskFilterSchema.parse(req.query);
      const filters: TaskFilters = {
        assigneeIds: query.assigneeIds?.split(',').filter(Boolean),
        priorities: query.priorities?.split(',').filter(Boolean) as TaskPriority[] | undefined,
        statuses: query.statuses?.split(',').filter(Boolean) as TaskStatus[] | undefined,
        labelIds: query.labelIds?.split(',').filter(Boolean),
        dueDateFrom: query.dueDateFrom ? new Date(query.dueDateFrom) : undefined,
        dueDateTo: query.dueDateTo ? new Date(query.dueDateTo) : undefined,
        search: query.search,
        archived: query.archived === 'true',
      };

      const result = await taskService.getProjectTasks(
        req.params.projectId,
        filters,
        query.page,
        query.limit
      );

      sendPaginated(res, result.tasks, result.total, result.page, result.limit);
    } catch (e) { next(e); }
  },

  get: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const task = await taskService.getTask(req.params.id, req.userId!);
      sendSuccess(res, task);
    } catch (e) { next(e); }
  },

  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = createTaskSchema.parse(req.body);
      const task = await taskService.createTask(req.params.projectId, req.userId!, input);
      sendSuccess(res, task, 201);
    } catch (e) { next(e); }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = updateTaskSchema.parse(req.body);
      const task = await taskService.updateTask(req.params.id, req.userId!, input);
      sendSuccess(res, task);
    } catch (e) { next(e); }
  },

  move: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { columnId, order } = moveTaskSchema.parse(req.body);
      const task = await taskService.moveTask(req.params.id, req.userId!, columnId, order);
      sendSuccess(res, task);
    } catch (e) { next(e); }
  },

  reorder: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tasks } = reorderTasksSchema.parse(req.body);
      await taskService.reorderTasks(tasks);
      sendSuccess(res, null, 200, 'Tasks reordered');
    } catch (e) { next(e); }
  },

  delete: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await taskService.deleteTask(req.params.id, req.userId!);
      sendSuccess(res, null, 200, 'Task deleted');
    } catch (e) { next(e); }
  },

  duplicate: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const task = await taskService.duplicateTask(req.params.id, req.userId!);
      sendSuccess(res, task, 201);
    } catch (e) { next(e); }
  },

  // Subtasks
  getSubtasks: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subtasks = await taskService.getSubtasks(req.params.id);
      sendSuccess(res, subtasks);
    } catch (e) { next(e); }
  },

  createSubtask: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { title } = createSubtaskSchema.parse(req.body);
      const subtask = await taskService.createSubtask(req.params.id, title);
      sendSuccess(res, subtask, 201);
    } catch (e) { next(e); }
  },

  updateSubtask: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = updateSubtaskSchema.parse(req.body);
      const subtask = await taskService.updateSubtask(req.params.subtaskId, data);
      sendSuccess(res, subtask);
    } catch (e) { next(e); }
  },

  deleteSubtask: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await taskService.deleteSubtask(req.params.subtaskId);
      sendSuccess(res, null, 200, 'Subtask deleted');
    } catch (e) { next(e); }
  },

  // Attachments
  uploadAttachment: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) throw new Error('No file uploaded');
      const attachment = await taskService.uploadAttachment(req.params.id, req.userId!, req.file);
      sendSuccess(res, attachment, 201);
    } catch (e) { next(e); }
  },

  deleteAttachment: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await taskService.deleteAttachment(req.params.attachmentId, req.userId!);
      sendSuccess(res, null, 200, 'Attachment deleted');
    } catch (e) { next(e); }
  },

  // Time entries
  addTimeEntry: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = createTimeEntrySchema.parse(req.body);
      const entry = await taskService.addTimeEntry(req.params.id, req.userId!, data);
      sendSuccess(res, entry, 201);
    } catch (e) { next(e); }
  },

  getTimeEntries: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const entries = await taskService.getTimeEntries(req.params.id);
      sendSuccess(res, entries);
    } catch (e) { next(e); }
  },

  getCalendar: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
      const end = endDate ? new Date(endDate) : new Date(new Date().setMonth(new Date().getMonth() + 1));
      const tasks = await taskService.getCalendarTasks(req.params.projectId, start, end);
      sendSuccess(res, tasks);
    } catch (e) { next(e); }
  },
};
