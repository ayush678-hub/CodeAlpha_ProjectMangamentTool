import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';

const COMMENT_INCLUDE = {
  author: { select: { id: true, name: true, username: true, avatar: true } },
  reactions: {
    include: { user: { select: { id: true, name: true, avatar: true } } },
  },
  mentions: {
    include: { user: { select: { id: true, name: true, username: true } } },
  },
  replies: {
    include: {
      author: { select: { id: true, name: true, username: true, avatar: true } },
      reactions: {
        include: { user: { select: { id: true, name: true, avatar: true } } },
      },
      mentions: {
        include: { user: { select: { id: true, name: true, username: true } } },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

export const commentRepository = {
  findById: (id: string) =>
    prisma.comment.findUnique({ where: { id }, include: COMMENT_INCLUDE }),

  getTaskComments: (taskId: string) =>
    prisma.comment.findMany({
      where: { taskId, parentId: null },
      include: COMMENT_INCLUDE,
      orderBy: { createdAt: 'asc' },
    }),

  create: (data: Prisma.CommentCreateInput) =>
    prisma.comment.create({ data, include: COMMENT_INCLUDE }),

  update: (id: string, data: Prisma.CommentUpdateInput) =>
    prisma.comment.update({ where: { id }, data, include: COMMENT_INCLUDE }),

  delete: (id: string) => prisma.comment.delete({ where: { id } }),

  addMentions: async (commentId: string, userIds: string[]): Promise<void> => {
    if (!userIds.length) return;
    await prisma.commentMention.createMany({
      data: userIds.map((userId) => ({ commentId, userId })),
      skipDuplicates: true,
    });
  },

  addReaction: (commentId: string, userId: string, emoji: string) =>
    prisma.commentReaction.create({ data: { commentId, userId, emoji } }),

  removeReaction: (commentId: string, userId: string, emoji: string) =>
    prisma.commentReaction.delete({
      where: { commentId_userId_emoji: { commentId, userId, emoji } },
    }),

  findReaction: (commentId: string, userId: string, emoji: string) =>
    prisma.commentReaction.findUnique({
      where: { commentId_userId_emoji: { commentId, userId, emoji } },
    }),
};
