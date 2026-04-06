import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import config from '../config.js';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const taskRateLimitStore = new Map<string, RateLimitEntry>();

function cleanup(): void {
  const now = Date.now();
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
  
  for (const [key, entry] of taskRateLimitStore.entries()) {
    if (entry.resetTime < now) {
      taskRateLimitStore.delete(key);
    }
  }
}

setInterval(cleanup, 60000);

function checkRateLimit(
  ip: string,
  store: Map<string, RateLimitEntry>,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || entry.resetTime < now) {
    store.set(ip, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1, reset: windowMs };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      reset: entry.resetTime - now,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    reset: entry.resetTime - now,
  };
}

export function globalRateLimit() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || 'unknown';
    const { allowed, remaining, reset } = checkRateLimit(
      ip,
      rateLimitStore,
      config.rateLimit.maxRequests,
      config.rateLimit.windowMs
    );

    res.setHeader('X-RateLimit-Limit', config.rateLimit.maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil((Date.now() + reset) / 1000));

    if (!allowed) {
      logger.warn('Rate limit exceeded', { ip, path: req.path });
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(reset / 1000),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}

export function taskRateLimit() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || 'unknown';
    const { allowed, remaining, reset } = checkRateLimit(
      ip,
      taskRateLimitStore,
      config.rateLimit.maxTaskRequests,
      config.rateLimit.windowMs
    );

    res.setHeader('X-TaskRateLimit-Limit', config.rateLimit.maxTaskRequests);
    res.setHeader('X-TaskRateLimit-Remaining', remaining);
    res.setHeader('X-TaskRateLimit-Reset', Math.ceil((Date.now() + reset) / 1000));

    if (!allowed) {
      logger.warn('Task rate limit exceeded', { ip });
      res.status(429).json({
        error: {
          code: 'TASK_RATE_LIMIT_EXCEEDED',
          message: 'Too many task submissions. Please slow down.',
          retryAfter: Math.ceil(reset / 1000),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}
