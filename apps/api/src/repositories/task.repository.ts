import prisma from '../lib/prisma';
import { Prisma, TaskStatus, TaskPriority } from '@prisma/client';

const TASK_INCLUDE = {
  reporter: { select: { id: true, name: true, username: true, avatar: true } },
  assignees: {
    include: {
      user: { select: { id: true, name: true, username: true, avatar: true } },
    },
  },
  labels: { include: { label: true } },
  subtasks: { orderBy: { order: 'asc' as const } },
  attachments: {
    include: {
      uploadedBy: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  _count: { select: { comments: true, subtasks: true, attachments: true } },
};

export interface TaskFilters {
  assigneeIds?: string[];
  priorities?: TaskPriority[];
  statuses?: TaskStatus[];
  labelIds?: string[];
  dueDateFrom?: Date;
  dueDateTo?: Date;
  search?: string;
  archived?: boolean;
}

export const taskRepository = {
  findById: (id: string) =>
    prisma.task.findUnique({ where: { id }, include: TASK_INCLUDE }),

  findByIdWithComments: (id: string) =>
    prisma.task.findUnique({
      where: { id },
      include: {
        ...TASK_INCLUDE,
        activities: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    }),

  findProjectTasks: (projectId: string, filters: TaskFilters, page: number, limit: number) => {
    const where: Prisma.TaskWhereInput = {
      projectId,
      archived: filters.archived ?? false,
      ...(filters.priorities?.length && { priority: { in: filters.priorities } }),
      ...(filters.statuses?.length && { status: { in: filters.statuses } }),
      ...(filters.assigneeIds?.length && {
        assignees: { some: { userId: { in: filters.assigneeIds } } },
      }),
      ...(filters.labelIds?.length && {
        labels: { some: { labelId: { in: filters.labelIds } } },
      }),
      ...(filters.dueDateFrom && { dueDate: { gte: filters.dueDateFrom } }),
      ...(filters.dueDateTo && { dueDate: { lte: filters.dueDateTo } }),
      ...(filters.search && {
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    return Promise.all([
      prisma.task.findMany({
        where,
        include: TASK_INCLUDE,
        orderBy: [{ columnId: 'asc' }, { order: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);
  },

  create: (data: Prisma.TaskCreateInput) =>
    prisma.task.create({ data, include: TASK_INCLUDE }),

  update: (id: string, data: Prisma.TaskUpdateInput) =>
    prisma.task.update({ where: { id }, data, include: TASK_INCLUDE }),

  delete: (id: string) => prisma.task.delete({ where: { id } }),

  getMaxOrder: async (columnId: string): Promise<number> => {
    const result = await prisma.task.aggregate({
      where: { columnId },
      _max: { order: true },
    });
    return result._max.order ?? -1;
  },

  updateOrder: async (
    tasks: Array<{ id: string; order: number; columnId: string }>
  ): Promise<void> => {
    await prisma.$transaction(
      tasks.map((t) =>
        prisma.task.update({
          where: { id: t.id },
          data: { order: t.order, columnId: t.columnId },
        })
      )
    );
  },

  setAssignees: async (taskId: string, userIds: string[]): Promise<void> => {
    await prisma.$transaction([
      prisma.taskAssignee.deleteMany({ where: { taskId } }),
      ...userIds.map((userId) =>
        prisma.taskAssignee.create({ data: { taskId, userId } })
      ),
    ]);
  },

  setLabels: async (taskId: string, labelIds: string[]): Promise<void> => {
    await prisma.$transaction([
      prisma.taskLabel.deleteMany({ where: { taskId } }),
      ...labelIds.map((labelId) =>
        prisma.taskLabel.create({ data: { taskId, labelId } })
      ),
    ]);
  },

  // Subtasks
  getSubtasks: (taskId: string) =>
    prisma.subtask.findMany({ where: { taskId }, orderBy: { order: 'asc' } }),

  createSubtask: (data: Prisma.SubtaskCreateInput) => prisma.subtask.create({ data }),

  updateSubtask: (id: string, data: Prisma.SubtaskUpdateInput) =>
    prisma.subtask.update({ where: { id }, data }),

  deleteSubtask: (id: string) => prisma.subtask.delete({ where: { id } }),

  // Attachments
  createAttachment: (data: Prisma.AttachmentCreateInput) =>
    prisma.attachment.create({
      data,
      include: { uploadedBy: { select: { id: true, name: true, avatar: true } } },
    }),

  deleteAttachment: (id: string) => prisma.attachment.delete({ where: { id } }),

  findAttachment: (id: string) => prisma.attachment.findUnique({ where: { id } }),

  // Time entries
  createTimeEntry: (data: Prisma.TimeEntryCreateInput) =>
    prisma.timeEntry.create({
      data,
      include: { user: { select: { id: true, name: true, avatar: true } } },
    }),

  getTimeEntries: (taskId: string) =>
    prisma.timeEntry.findMany({
      where: { taskId },
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { date: 'desc' },
    }),

  // Calendar: tasks by due date range
  getTasksByDateRange: (projectId: string, startDate: Date, endDate: Date) =>
    prisma.task.findMany({
      where: {
        projectId,
        archived: false,
        OR: [
          { dueDate: { gte: startDate, lte: endDate } },
          { startDate: { gte: startDate, lte: endDate } },
        ],
      },
      include: TASK_INCLUDE,
      orderBy: { dueDate: 'asc' },
    }),
};
