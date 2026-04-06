import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import config from '../config.js';

export interface ApiError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;
}

export function createError(statusCode: number, message: string, code?: string, details?: unknown): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code || `ERR_${statusCode}`;
  error.details = details;
  return error;
}

export function errorHandler(
  err: ApiError | Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = 'statusCode' in err ? err.statusCode : 500;
  const code = 'code' in err ? err.code : 'INTERNAL_ERROR';
  const details = 'details' in err ? err.details : undefined;

  logger.error('Request error', {
    path: req.path,
    method: req.method,
    statusCode,
    code,
    message: err.message,
    stack: config.server.env === 'development' ? err.stack : undefined,
    details,
  });

  const errorResponse: Record<string, unknown> = {
    code,
    message: err.message,
  };

  if (config.server.env === 'development' && err.stack) {
    errorResponse.stack = err.stack;
  }

  if (details) {
    errorResponse.details = details;
  }

  res.status(statusCode).json({
    error: errorResponse,
    timestamp: new Date().toISOString(),
    path: req.path,
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    timestamp: new Date().toISOString(),
    path: req.path,
  });
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
