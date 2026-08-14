import { addDays } from 'date-fns';
import { projectRepository } from '../repositories/project.repository';
import { userRepository } from '../repositories/user.repository';
import { createError } from '../middleware/error';
import { createActivity } from '../utils/activity';
import { sendEmail, emailTemplates } from '../utils/email';
import { eventEmitter, AppEvents } from '../events/emitter';
import { delCache, CACHE_KEYS } from '../lib/redis';
import { env } from '../lib/env';
import prisma from '../lib/prisma';
import type { CreateProjectInput, UpdateProjectInput } from '../validators/project.validator';
import type { ProjectRole } from '@prisma/client';

export const projectService = {
  getUserProjects: (userId: string) => projectRepository.findUserProjects(userId),

  getProject: async (projectId: string, userId: string) => {
    const project = await projectRepository.findById(projectId);
    if (!project) throw createError('Project not found', 404, 'NOT_FOUND');

    const member = await projectRepository.getMember(projectId, userId);
    if (!member) throw createError('Access denied', 403, 'FORBIDDEN');

    return project;
  },

  getBoard: async (projectId: string, userId: string) => {
    const member = await projectRepository.getMember(projectId, userId);
    if (!member) throw createError('Access denied', 403, 'FORBIDDEN');

    const project = await projectRepository.findByIdWithBoard(projectId);
    if (!project) throw createError('Project not found', 404, 'NOT_FOUND');

    // Auto-create board if missing
    if (!project.board) {
      await projectService.createDefaultBoard(projectId);
      return projectRepository.findByIdWithBoard(projectId);
    }

    return project;
  },

  createProject: async (userId: string, input: CreateProjectInput) => {
    const project = await projectRepository.create({
      name: input.name,
      description: input.description,
      color: input.color,
      icon: input.icon,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      owner: { connect: { id: userId } },
      members: {
        create: { userId, role: 'OWNER' },
      },
    });

    // Create default board + columns
    await projectService.createDefaultBoard(project.id);

    // Create default labels
    await prisma.label.createMany({
      data: [
        { name: 'Bug', color: '#ef4444', projectId: project.id },
        { name: 'Feature', color: '#22c55e', projectId: project.id },
        { name: 'Documentation', color: '#3b82f6', projectId: project.id },
        { name: 'Urgent', color: '#f97316', projectId: project.id },
      ],
    });

    await createActivity({
      action: 'PROJECT_CREATED',
      description: `Created project "${project.name}"`,
      userId,
      projectId: project.id,
    });

    return project;
  },

  createDefaultBoard: async (projectId: string) => {
    const board = await prisma.board.create({
      data: { projectId },
    });

    const defaultColumns = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];
    await prisma.column.createMany({
      data: defaultColumns.map((name, order) => ({ name, order, boardId: board.id })),
    });

    return board;
  },

  updateProject: async (projectId: string, userId: string, input: UpdateProjectInput) => {
    const project = await projectRepository.update(projectId, {
      ...input,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    });

    await createActivity({
      action: 'PROJECT_UPDATED',
      description: `Updated project settings`,
      userId,
      projectId,
    });

    return project;
  },

  deleteProject: async (projectId: string) => {
    await projectRepository.delete(projectId);
  },

  // Columns
  createColumn: async (boardId: string, name: string, color?: string) => {
    const maxOrder = await prisma.column.aggregate({
      where: { boardId },
      _max: { order: true },
    });
    return prisma.column.create({
      data: { name, color, boardId, order: (maxOrder._max.order ?? -1) + 1 },
    });
  },

  updateColumn: async (columnId: string, data: { name?: string; color?: string | null }) => {
    return prisma.column.update({ where: { id: columnId }, data });
  },

  deleteColumn: async (columnId: string) => {
    return prisma.column.delete({ where: { id: columnId } });
  },

  reorderColumns: async (boardId: string, columnIds: string[]) => {
    await prisma.$transaction(
      columnIds.map((id, order) =>
        prisma.column.update({ where: { id, boardId }, data: { order } })
      )
    );
  },

  // Members
  getMembers: (projectId: string) => projectRepository.getMembers(projectId),

  inviteMember: async (
    projectId: string,
    inviterId: string,
    email: string,
    role: ProjectRole
  ) => {
    const project = await projectRepository.findById(projectId);
    if (!project) throw createError('Project not found', 404, 'NOT_FOUND');

    const inviter = await userRepository.findById(inviterId);
    if (!inviter) throw createError('Inviter not found', 404, 'NOT_FOUND');

    // Check if already a member
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      const existing = await projectRepository.getMember(projectId, existingUser.id);
      if (existing) throw createError('User is already a project member', 409, 'ALREADY_MEMBER');
    }

    const expiresAt = addDays(new Date(), 7);
    const invitation = await projectRepository.createInvitation({
      email,
      role,
      expiresAt,
      project: { connect: { id: projectId } },
      invitedBy: { connect: { id: inviterId } },
    });

    const inviteLink = `${env.FRONTEND_URL}/invitations/${invitation.token}`;
    const emailContent = emailTemplates.projectInvite(inviter.name, project.name, inviteLink);
    await sendEmail({ to: email, ...emailContent });

    return invitation;
  },

  updateMemberRole: async (
    projectId: string,
    targetUserId: string,
    newRole: ProjectRole
  ) => {
    const member = await projectRepository.getMember(projectId, targetUserId);
    if (!member) throw createError('Member not found', 404, 'NOT_FOUND');
    if (member.role === 'OWNER') throw createError('Cannot change owner role', 403, 'FORBIDDEN');

    await projectRepository.updateMemberRole(projectId, targetUserId, newRole);
    await delCache(CACHE_KEYS.projectMembers(projectId));
  },

  removeMember: async (projectId: string, targetUserId: string, requesterId: string) => {
    const member = await projectRepository.getMember(projectId, targetUserId);
    if (!member) throw createError('Member not found', 404, 'NOT_FOUND');
    if (member.role === 'OWNER') throw createError('Cannot remove project owner', 403, 'FORBIDDEN');

    await projectRepository.removeMember(projectId, targetUserId);
    await delCache(CACHE_KEYS.projectMembers(projectId));

    await createActivity({
      action: 'MEMBER_REMOVED',
      description: `Removed member from project`,
      userId: requesterId,
      projectId,
      metadata: { removedUserId: targetUserId },
    });

    eventEmitter.emit(AppEvents.MEMBER_REMOVED, { projectId, userId: targetUserId });
  },

  // Labels
  getLabels: (projectId: string) => projectRepository.getLabels(projectId),

  createLabel: (projectId: string, name: string, color: string) =>
    projectRepository.createLabel({ name, color, project: { connect: { id: projectId } } }),

  updateLabel: (id: string, data: { name?: string; color?: string }) =>
    projectRepository.updateLabel(id, data),

  deleteLabel: (id: string) => projectRepository.deleteLabel(id),

  // Stats
  getStats: (projectId: string) => projectRepository.getProjectStats(projectId),

  // Activity
  getActivity: (projectId: string, page: number, limit: number) =>
    projectRepository.getProjectActivity(projectId, page, limit),
};
