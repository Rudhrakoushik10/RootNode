import type { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler.js';

const MAX_TASK_LENGTH = 500;
const MIN_TASK_LENGTH = 3;

export function validateTaskInput(req: Request, res: Response, next: NextFunction): void {
  const { task } = req.body;

  if (!task) {
    throw createError(400, 'Task is required', 'MISSING_TASK');
  }

  if (typeof task !== 'string') {
    throw createError(400, 'Task must be a string', 'INVALID_TASK_TYPE');
  }

  const trimmedTask = task.trim();

  if (trimmedTask.length < MIN_TASK_LENGTH) {
    throw createError(400, `Task must be at least ${MIN_TASK_LENGTH} characters`, 'TASK_TOO_SHORT');
  }

  if (trimmedTask.length > MAX_TASK_LENGTH) {
    throw createError(400, `Task must not exceed ${MAX_TASK_LENGTH} characters`, 'TASK_TOO_LONG');
  }

  req.body.task = trimmedTask;
  next();
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .substring(0, MAX_TASK_LENGTH);
}

export function validateServiceInput(req: Request, res: Response, next: NextFunction): void {
  const { name, provider, price_algo, category, endpoint } = req.body;

  const required = ['name', 'provider', 'price_algo', 'category', 'endpoint'];
  const missing = required.filter(field => !req.body[field]);

  if (missing.length > 0) {
    throw createError(400, `Missing required fields: ${missing.join(', ')}`, 'MISSING_FIELDS');
  }

  if (typeof price_algo !== 'number' || price_algo <= 0) {
    throw createError(400, 'Price must be a positive number', 'INVALID_PRICE');
  }

  if (price_algo > 1) {
    throw createError(400, 'Price cannot exceed 1 ALGO', 'PRICE_TOO_HIGH');
  }

  if (!/^https?:\/\/.+/.test(endpoint)) {
    throw createError(400, 'Endpoint must be a valid HTTP(S) URL', 'INVALID_ENDPOINT');
  }

  next();
}
