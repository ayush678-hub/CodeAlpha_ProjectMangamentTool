import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { sendError } from '../utils/response';
import prisma from '../lib/prisma';
import { User } from '@prisma/client';

// Extend Express Request with authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: string;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      sendError(res, 'No token provided', 401, 'UNAUTHORIZED');
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || user.status === 'SUSPENDED') {
      sendError(res, 'User not found or suspended', 401, 'UNAUTHORIZED');
      return;
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch {
    sendError(res, 'Invalid or expired token', 401, 'TOKEN_INVALID');
  }
};

// Optional auth — attaches user if token present but doesn't block
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (user) {
        req.user = user;
        req.userId = user.id;
      }
    }
  } catch {
    // Ignore auth errors for optional auth
  }
  next();
};
