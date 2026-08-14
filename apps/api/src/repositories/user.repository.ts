import prisma from '../lib/prisma';
import { User, Prisma } from '@prisma/client';

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  avatar: true,
  bio: true,
  jobTitle: true,
  timezone: true,
  status: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
};

export const userRepository = {
  findById: (id: string) =>
    prisma.user.findUnique({ where: { id }, select: USER_PUBLIC_SELECT }),

  findByIdFull: (id: string) =>
    prisma.user.findUnique({ where: { id } }),

  findByEmail: (email: string) =>
    prisma.user.findUnique({ where: { email } }),

  findByUsername: (username: string) =>
    prisma.user.findUnique({ where: { username } }),

  findByVerifyToken: (token: string) =>
    prisma.user.findUnique({ where: { verifyToken: token } }),

  findByResetToken: (token: string) =>
    prisma.user.findUnique({ where: { resetToken: token } }),

  create: (data: Prisma.UserCreateInput) =>
    prisma.user.create({ data, select: USER_PUBLIC_SELECT }),

  update: (id: string, data: Prisma.UserUpdateInput) =>
    prisma.user.update({ where: { id }, data, select: USER_PUBLIC_SELECT }),

  updateFull: (id: string, data: Prisma.UserUpdateInput) =>
    prisma.user.update({ where: { id }, data }),

  delete: (id: string) => prisma.user.delete({ where: { id } }),

  searchUsers: (query: string, excludeIds: string[] = []) =>
    prisma.user.findMany({
      where: {
        AND: [
          { id: { notIn: excludeIds } },
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { username: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: USER_PUBLIC_SELECT,
      take: 10,
    }),

  getNotifPrefs: (userId: string) =>
    prisma.notificationPref.findUnique({ where: { userId } }),

  upsertNotifPrefs: (userId: string, data: Prisma.NotificationPrefUpdateInput) =>
    prisma.notificationPref.upsert({
      where: { userId },
      create: { userId, ...data } as Prisma.NotificationPrefCreateInput,
      update: data,
    }),
};

export type PublicUser = Awaited<ReturnType<typeof userRepository.findById>>;
