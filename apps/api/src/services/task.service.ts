import { taskRepository, TaskFilters } from '../repositories/task.repository';
import { projectRepository } from '../repositories/project.repository';
import { createError } from '../middleware/error';
import { createActivity } from '../utils/activity';
import { eventEmitter, AppEvents } from '../events/emitter';
import { uploadToCloudinary, deleteFromCloudinary } from '../middleware/upload';
import type { CreateTaskInput, UpdateTaskInput } from '../validators/task.validator';

export const taskService = {
  getProjectTasks: async (
    projectId: string,
    filters: TaskFilters,
    page: number,
    limit: number
  ) => {
    const [tasks, total] = await taskRepository.findProjectTasks(projectId, filters, page, limit);
    return { tasks, total, page, limit };
  },

  getTask: async (taskId: string, userId: string) => {
    const task = await taskRepository.findByIdWithComments(taskId);
    if (!task) throw createError('Task not found', 404, 'NOT_FOUND');

    // Verify access via project membership
    const member = await projectRepository.getMember(task.projectId, userId);
    if (!member) throw createError('Access denied', 403, 'FORBIDDEN');

    return task;
  },

  createTask: async (projectId: string, userId: string, input: CreateTaskInput) => {
    const maxOrder = await taskRepository.getMaxOrder(input.columnId);

    const task = await taskRepository.create({
      title: input.title,
      description: input.description,
      priority: input.priority,
      order: maxOrder + 1,
      column: { connect: { id: input.columnId } },
      project: { connect: { id: projectId } },
      reporter: { connect: { id: userId } },
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      estimatedHours: input.estimatedHours,
    });

    // Set assignees + labels
    if (input.assigneeIds.length) {
      await taskRepository.setAssignees(task.id, input.assigneeIds);
    }
    if (input.labelIds.length) {
      await taskRepository.setLabels(task.id, input.labelIds);
    }

    await createActivity({
      action: 'TASK_CREATED',
      description: `Created task "${task.title}"`,
      userId,
      projectId,
      taskId: task.id,
    });

    // Emit for WebSocket broadcast
    const updatedTask = await taskRepository.findById(task.id);
    eventEmitter.emit(AppEvents.TASK_CREATED, { projectId, task: updatedTask, userId });

    // Emit notification for each assignee
    if (input.assigneeIds.length) {
      eventEmitter.emit(AppEvents.TASK_ASSIGNED, {
        projectId,
        taskId: task.id,
        taskTitle: task.title,
        assigneeIds: input.assigneeIds,
        actorId: userId,
      });
    }

    return updatedTask;
  },

  updateTask: async (taskId: string, userId: string, input: UpdateTaskInput) => {
    const existing = await taskRepository.findById(taskId);
    if (!existing) throw createError('Task not found', 404, 'NOT_FOUND');

    const previousStatus = existing.status;

    const task = await taskRepository.update(taskId, {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.startDate !== undefined && {
        startDate: input.startDate ? new Date(input.startDate) : null,
      }),
      ...(input.dueDate !== undefined && {
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      }),
      ...(input.estimatedHours !== undefined && { estimatedHours: input.estimatedHours }),
      ...(input.archived !== undefined && { archived: input.archived }),
      ...(input.status === 'DONE' && { completedAt: new Date() }),
      ...(input.status && input.status !== 'DONE' && { completedAt: null }),
    });

    if (input.assigneeIds !== undefined) {
      await taskRepository.setAssignees(taskId, input.assigneeIds);
    }
    if (input.labelIds !== undefined) {
      await taskRepository.setLabels(taskId, input.labelIds);
    }

    const updatedTask = await taskRepository.findById(taskId);

    await createActivity({
      action: 'TASK_UPDATED',
      description: `Updated task "${task.title}"`,
      userId,
      projectId: task.projectId,
      taskId: task.id,
      metadata: { changes: input },
    });

    eventEmitter.emit(AppEvents.TASK_UPDATED, {
      projectId: task.projectId,
      task: updatedTask,
      userId,
    });

    if (input.status && input.status !== previousStatus) {
      eventEmitter.emit(AppEvents.TASK_STATUS_CHANGED, {
        projectId: task.projectId,
        taskId: task.id,
        taskTitle: task.title,
        oldStatus: previousStatus,
        newStatus: input.status,
        actorId: userId,
        assigneeIds: existing.assignees.map((a) => a.userId),
      });
    }

    if (input.assigneeIds) {
      const newAssignees = input.assigneeIds.filter(
        (id) => !existing.assignees.some((a) => a.userId === id)
      );
      if (newAssignees.length) {
        eventEmitter.emit(AppEvents.TASK_ASSIGNED, {
          projectId: task.projectId,
          taskId: task.id,
          taskTitle: task.title,
          assigneeIds: newAssignees,
          actorId: userId,
        });
      }
    }

    return updatedTask;
  },

  moveTask: async (
    taskId: string,
    userId: string,
    columnId: string,
    order: number
  ) => {
    const existing = await taskRepository.findById(taskId);
    if (!existing) throw createError('Task not found', 404, 'NOT_FOUND');

    const task = await taskRepository.update(taskId, { columnId, order } as Parameters<typeof taskRepository.update>[1]);

    await createActivity({
      action: 'TASK_MOVED',
      description: `Moved task "${existing.title}"`,
      userId,
      projectId: existing.projectId,
      taskId,
      metadata: { fromColumn: existing.columnId, toColumn: columnId },
    });

    eventEmitter.emit(AppEvents.TASK_MOVED, {
      projectId: existing.projectId,
      task,
      userId,
      fromColumnId: existing.columnId,
      toColumnId: columnId,
    });

    return task;
  },

  reorderTasks: async (tasks: Array<{ id: string; order: number; columnId: string }>) => {
    await taskRepository.updateOrder(tasks);
  },

  deleteTask: async (taskId: string, userId: string) => {
    const task = await taskRepository.findById(taskId);
    if (!task) throw createError('Task not found', 404, 'NOT_FOUND');

    await taskRepository.delete(taskId);

    await createActivity({
      action: 'TASK_DELETED',
      description: `Deleted task "${task.title}"`,
      userId,
      projectId: task.projectId,
    });

    eventEmitter.emit(AppEvents.TASK_DELETED, {
      projectId: task.projectId,
      taskId,
      userId,
    });
  },

  duplicateTask: async (taskId: string, userId: string) => {
    const task = await taskRepository.findByIdWithComments(taskId);
    if (!task) throw createError('Task not found', 404, 'NOT_FOUND');

    const maxOrder = await taskRepository.getMaxOrder(task.columnId);

    const newTask = await taskRepository.create({
      title: `${task.title} (Copy)`,
      description: task.description,
      priority: task.priority,
      order: maxOrder + 1,
      column: { connect: { id: task.columnId } },
      project: { connect: { id: task.projectId } },
      reporter: { connect: { id: userId } },
      startDate: task.startDate,
      dueDate: task.dueDate,
      estimatedHours: task.estimatedHours,
    });

    if (task.assignees.length) {
      await taskRepository.setAssignees(newTask.id, task.assignees.map((a) => a.userId));
    }
    if (task.labels.length) {
      await taskRepository.setLabels(newTask.id, task.labels.map((l) => l.labelId));
    }

    eventEmitter.emit(AppEvents.TASK_CREATED, {
      projectId: task.projectId,
      task: newTask,
      userId,
    });

    return newTask;
  },

  // Subtasks
  getSubtasks: (taskId: string) => taskRepository.getSubtasks(taskId),

  createSubtask: async (taskId: string, title: string) => {
    const task = await taskRepository.findById(taskId);
    if (!task) throw createError('Task not found', 404, 'NOT_FOUND');

    const subtasks = await taskRepository.getSubtasks(taskId);
    return taskRepository.createSubtask({
      title,
      order: subtasks.length,
      task: { connect: { id: taskId } },
    });
  },

  updateSubtask: (id: string, data: { title?: string; completed?: boolean }) =>
    taskRepository.updateSubtask(id, data),

  deleteSubtask: (id: string) => taskRepository.deleteSubtask(id),

  // File attachments
  uploadAttachment: async (
    taskId: string,
    userId: string,
    file: Express.Multer.File
  ) => {
    const task = await taskRepository.findById(taskId);
    if (!task) throw createError('Task not found', 404, 'NOT_FOUND');

    const result = await uploadToCloudinary(file.buffer, `collabo/tasks/${taskId}`);

    return taskRepository.createAttachment({
      name: file.originalname,
      url: result.url,
      publicId: result.publicId,
      mimeType: file.mimetype,
      size: file.size,
      task: { connect: { id: taskId } },
      uploadedBy: { connect: { id: userId } },
    });
  },

  deleteAttachment: async (attachmentId: string, userId: string) => {
    const attachment = await taskRepository.findAttachment(attachmentId);
    if (!attachment) throw createError('Attachment not found', 404, 'NOT_FOUND');
    if (attachment.uploadedById !== userId)
      throw createError('Cannot delete another user\'s attachment', 403, 'FORBIDDEN');

    if (attachment.publicId) {
      await deleteFromCloudinary(attachment.publicId);
    }
    await taskRepository.deleteAttachment(attachmentId);
  },

  // Time tracking
  addTimeEntry: async (
    taskId: string,
    userId: string,
    data: { hours: number; description?: string; date?: string }
  ) => {
    const task = await taskRepository.findById(taskId);
    if (!task) throw createError('Task not found', 404, 'NOT_FOUND');

    return taskRepository.createTimeEntry({
      hours: data.hours,
      description: data.description,
      date: data.date ? new Date(data.date) : new Date(),
      task: { connect: { id: taskId } },
      user: { connect: { id: userId } },
    });
  },

  getTimeEntries: (taskId: string) => taskRepository.getTimeEntries(taskId),

  getCalendarTasks: (projectId: string, startDate: Date, endDate: Date) =>
    taskRepository.getTasksByDateRange(projectId, startDate, endDate),
};
