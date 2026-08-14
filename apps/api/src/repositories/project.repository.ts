import prisma from '../lib/prisma';
import { Prisma, ProjectRole } from '@prisma/client';

const PROJECT_INCLUDE = {
  owner: {
    select: { id: true, name: true, username: true, email: true, avatar: true },
  },
  _count: { select: { tasks: true, members: true } },
};

export const projectRepository = {
  findById: (id: string) =>
    prisma.project.findUnique({ where: { id }, include: PROJECT_INCLUDE }),

  findByIdWithBoard: (id: string) =>
    prisma.project.findUnique({
      where: { id },
      include: {
        ...PROJECT_INCLUDE,
        board: {
          include: {
            columns: {
              orderBy: { order: 'asc' },
              include: {
                tasks: {
                  where: { archived: false },
                  orderBy: { order: 'asc' },
                  include: {
                    assignees: {
                      include: {
                        user: { select: { id: true, name: true, avatar: true } },
                      },
                    },
                    labels: {
                      include: { label: true },
                    },
                    _count: { select: { comments: true, subtasks: true, attachments: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),

  findUserProjects: (userId: string) =>
    prisma.project.findMany({
      where: {
        members: { some: { userId } },
      },
      include: PROJECT_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    }),

  create: (data: Prisma.ProjectCreateInput) =>
    prisma.project.create({ data, include: PROJECT_INCLUDE }),

  update: (id: string, data: Prisma.ProjectUpdateInput) =>
    prisma.project.update({ where: { id }, data, include: PROJECT_INCLUDE }),

  delete: (id: string) => prisma.project.delete({ where: { id } }),

  getMembers: (projectId: string) =>
    prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true, username: true, email: true, avatar: true, jobTitle: true } },
      },
      orderBy: { joinedAt: 'asc' },
    }),

  getMember: (projectId: string, userId: string) =>
    prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    }),

  addMember: (projectId: string, userId: string, role: ProjectRole) =>
    prisma.projectMember.create({
      data: { projectId, userId, role },
      include: {
        user: { select: { id: true, name: true, username: true, email: true, avatar: true } },
      },
    }),

  updateMemberRole: (projectId: string, userId: string, role: ProjectRole) =>
    prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { role },
    }),

  removeMember: (projectId: string, userId: string) =>
    prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    }),

  getLabels: (projectId: string) =>
    prisma.label.findMany({ where: { projectId }, orderBy: { name: 'asc' } }),

  createLabel: (data: Prisma.LabelCreateInput) => prisma.label.create({ data }),

  updateLabel: (id: string, data: Prisma.LabelUpdateInput) =>
    prisma.label.update({ where: { id }, data }),

  deleteLabel: (id: string) => prisma.label.delete({ where: { id } }),

  createInvitation: (data: Prisma.InvitationCreateInput) =>
    prisma.invitation.create({ data, include: { project: true, invitedBy: true } }),

  findInvitationByToken: (token: string) =>
    prisma.invitation.findUnique({
      where: { token },
      include: { project: true, invitedBy: true },
    }),

  updateInvitation: (id: string, data: Prisma.InvitationUpdateInput) =>
    prisma.invitation.update({ where: { id }, data }),

  getProjectActivity: (projectId: string, page: number, limit: number) =>
    prisma.activity.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),

  getProjectStats: async (projectId: string) => {
    const [total, completed, overdue, byPriority, byStatus] = await Promise.all([
      prisma.task.count({ where: { projectId, archived: false } }),
      prisma.task.count({ where: { projectId, status: 'DONE', archived: false } }),
      prisma.task.count({
        where: {
          projectId,
          archived: false,
          status: { notIn: ['DONE', 'CANCELLED'] },
          dueDate: { lt: new Date() },
        },
      }),
      prisma.task.groupBy({
        by: ['priority'],
        where: { projectId, archived: false },
        _count: true,
      }),
      prisma.task.groupBy({
        by: ['status'],
        where: { projectId, archived: false },
        _count: true,
      }),
    ]);
    return { total, completed, overdue, byPriority, byStatus };
  },
};
