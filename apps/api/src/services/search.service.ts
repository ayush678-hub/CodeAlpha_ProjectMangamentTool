import prisma from '../lib/prisma';

export const searchService = {
  globalSearch: async (query: string, userId: string) => {
    if (!query || query.trim().length < 2) {
      return { projects: [], tasks: [], users: [] };
    }

    const q = query.trim();

    // Get user's project IDs
    const memberships = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });
    const projectIds = memberships.map((m) => m.projectId);

    const [projects, tasks, users] = await Promise.all([
      prisma.project.findMany({
        where: {
          id: { in: projectIds },
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: {
          owner: { select: { id: true, name: true, avatar: true } },
          _count: { select: { tasks: true, members: true } },
        },
        take: 5,
      }),

      prisma.task.findMany({
        where: {
          projectId: { in: projectIds },
          archived: false,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: {
          reporter: { select: { id: true, name: true, avatar: true } },
          assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
          labels: { include: { label: true } },
          _count: { select: { comments: true } },
        },
        take: 10,
      }),

      prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { username: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, username: true, email: true, avatar: true, jobTitle: true },
        take: 5,
      }),
    ]);

    return { projects, tasks, users };
  },
};
