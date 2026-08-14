import { Request, Response, NextFunction } from 'express';
import { ProjectRole } from '@prisma/client';
import prisma from '../lib/prisma';
import { sendError } from '../utils/response';
import { getCache, setCache, CACHE_KEYS } from '../lib/redis';

const ROLE_HIERARCHY: Record<ProjectRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1,
};

export const requireProjectRole = (minimumRole: ProjectRole) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const projectId = req.params.projectId || req.params.id;

      if (!projectId) {
        sendError(res, 'Project ID is required', 400, 'MISSING_PROJECT_ID');
        return;
      }

      // Check cache first
      const cacheKey = CACHE_KEYS.projectMembers(projectId);
      let members = await getCache<Array<{ userId: string; role: ProjectRole }>>(cacheKey);

      if (!members) {
        const dbMembers = await prisma.projectMember.findMany({
          where: { projectId },
          select: { userId: true, role: true },
        });
        members = dbMembers;
        await setCache(cacheKey, members, 300);
      }

      const member = members.find((m) => m.userId === userId);

      if (!member) {
        sendError(res, 'You are not a member of this project', 403, 'FORBIDDEN');
        return;
      }

      if (ROLE_HIERARCHY[member.role] < ROLE_HIERARCHY[minimumRole]) {
        sendError(
          res,
          `This action requires ${minimumRole} role or higher`,
          403,
          'INSUFFICIENT_ROLE'
        );
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Attach member role to request for use downstream
export const attachProjectRole = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const projectId = req.params.projectId || req.params.id;

    if (userId && projectId) {
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
        select: { role: true },
      });
      (req as Request & { projectRole?: ProjectRole }).projectRole = member?.role;
    }
    next();
  } catch {
    next();
  }
};
