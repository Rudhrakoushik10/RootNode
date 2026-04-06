import type { Request, Response } from 'express';
import type { LogEntry } from '../types.js';

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type LogLevel = typeof LOG_LEVELS[number];

class Logger {
  private minLevel: number;
  private context: Record<string, unknown> = {};

  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() || 'info';
    this.minLevel = LOG_LEVELS.indexOf(envLevel as LogLevel);
    if (this.minLevel === -1) this.minLevel = 1;
  }

  setContext(context: Record<string, unknown>): void {
    this.context = { ...this.context, ...context };
  }

  private formatLog(level: LogLevel, message: string, data?: unknown): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };
    
    if (data !== undefined) {
      entry.data = data;
    }
    
    if (Object.keys(this.context).length > 0) {
      Object.assign(entry, this.context);
    }
    
    return entry;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS.indexOf(level) >= this.minLevel;
  }

  private output(entry: LogEntry): void {
    const output = JSON.stringify(entry);
    
    switch (entry.level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }

  debug(message: string, data?: unknown): void {
    if (this.shouldLog('debug')) {
      this.output(this.formatLog('debug', message, data));
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog('info')) {
      this.output(this.formatLog('info', message, data));
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog('warn')) {
      this.output(this.formatLog('warn', message, data));
    }
  }

  error(message: string, data?: unknown): void {
    if (this.shouldLog('error')) {
      const entry = this.formatLog('error', message, data);
      if (data instanceof Error) {
        entry.data = {
          name: data.name,
          message: data.message,
          stack: data.stack,
        };
      }
      this.output(entry);
    }
  }

  request(method: string, path: string, statusCode: number, duration: number, extraData?: Record<string, unknown>): void {
    const requestData: Record<string, unknown> = {
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
    };
    
    if (extraData) {
      Object.assign(requestData, extraData);
    }
    
    this.info('HTTP Request', requestData);
  }
}

const logger = new Logger();

export default logger;

export function createRequestLogger() {
  return (req: Request, res: Response, next: () => void) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.request(req.method, req.path, res.statusCode, duration, {
        ip: req.ip,
      });
    });
    
    next();
  };
}
