import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { env } from '../lib/env';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  error: AppError | ZodError | Prisma.PrismaClientKnownRequestError | Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', error);

  // Zod validation error
  if (error instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    error.errors.forEach((e) => {
      const key = e.path.join('.');
      if (!errors[key]) errors[key] = [];
      errors[key].push(e.message);
    });
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors,
    });
    return;
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const fields = (error.meta?.target as string[])?.join(', ') ?? 'field';
      res.status(409).json({
        success: false,
        message: `${fields} already exists`,
        code: 'DUPLICATE_ENTRY',
      });
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'Record not found',
        code: 'NOT_FOUND',
      });
      return;
    }
  }

  // Custom application errors
  const appError = error as AppError;
  if (appError.statusCode) {
    res.status(appError.statusCode).json({
      success: false,
      message: appError.message,
      code: appError.code ?? 'APP_ERROR',
    });
    return;
  }

  // Unknown server error
  res.status(500).json({
    success: false,
    message:
      env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    ...(env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

export const createError = (message: string, statusCode: number, code: string): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    code: 'ROUTE_NOT_FOUND',
  });
};
