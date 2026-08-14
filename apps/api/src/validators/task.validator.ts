import { z } from 'zod';
import { TaskPriority, TaskStatus } from '@prisma/client';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(10000).optional(),
  columnId: z.string().min(1, 'Column ID is required'),
  priority: z.nativeEnum(TaskPriority).default('MEDIUM'),
  assigneeIds: z.array(z.string()).default([]),
  labelIds: z.array(z.string()).default([]),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().min(0).max(9999).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeIds: z.array(z.string()).optional(),
  labelIds: z.array(z.string()).optional(),
  startDate: z.string().datetime().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  estimatedHours: z.number().min(0).max(9999).optional().nullable(),
  archived: z.boolean().optional(),
});

export const moveTaskSchema = z.object({
  columnId: z.string().min(1, 'Target column ID is required'),
  order: z.number().int().min(0),
});

export const reorderTasksSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string(),
      order: z.number().int().min(0),
      columnId: z.string(),
    })
  ),
});

export const createSubtaskSchema = z.object({
  title: z.string().min(1, 'Subtask title is required').max(500),
});

export const updateSubtaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  completed: z.boolean().optional(),
});

export const createTimeEntrySchema = z.object({
  hours: z.number().min(0.1, 'Minimum 0.1 hours').max(24),
  description: z.string().max(500).optional(),
  date: z.string().datetime().optional(),
});

export const taskFilterSchema = z.object({
  assigneeIds: z.string().optional(),
  priorities: z.string().optional(),
  statuses: z.string().optional(),
  labelIds: z.string().optional(),
  dueDateFrom: z.string().optional(),
  dueDateTo: z.string().optional(),
  search: z.string().optional(),
  archived: z.string().optional(),
  page: z.string().default('1').transform(Number),
  limit: z.string().default('50').transform(Number),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
