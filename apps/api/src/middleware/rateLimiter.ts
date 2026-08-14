import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/response';
import { Request, Response } from 'express';

const createLimiter = (windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
      sendError(res, message, 429, 'RATE_LIMIT_EXCEEDED');
    },
  });

// Auth endpoints — strict
export const authLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  20,
  'Too many authentication attempts. Please try again in 15 minutes.'
);

// Password reset — very strict
export const passwordResetLimiter = createLimiter(
  60 * 60 * 1000, // 1 hour
  5,
  'Too many password reset attempts. Please try again in 1 hour.'
);

// General API — relaxed
export const apiLimiter = createLimiter(
  15 * 60 * 1000,
  500,
  'Too many requests. Please slow down.'
);

// Upload — moderate
export const uploadLimiter = createLimiter(
  60 * 60 * 1000,
  50,
  'Too many file uploads. Please try again later.'
);
