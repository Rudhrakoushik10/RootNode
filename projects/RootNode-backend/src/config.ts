import dotenv from 'dotenv';
import type { Contracts } from './types.js';

dotenv.config();

interface Config {
  mysql: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  gemini: {
    apiKey: string;
    model: string;
  };
  server: {
    port: number;
    env: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    maxTaskRequests: number;
  };
  policy: {
    maxPerCallAlgo: number;
    budgetAlgo: number;
    whitelistedCategories: string[];
  };
  contracts: Contracts;
}

function validateRequired(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseIntOrDefault(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

const config: Config = {
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseIntOrDefault(process.env.MYSQL_PORT, 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'admin',
    database: process.env.MYSQL_DATABASE || 'rootnode_db',
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-pro',
  },

  server: {
    port: parseIntOrDefault(process.env.PORT, 3001),
    env: process.env.NODE_ENV || 'development',
  },

  rateLimit: {
    windowMs: parseIntOrDefault(process.env.RATE_LIMIT_WINDOW_MS, 60000),
    maxRequests: parseIntOrDefault(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
    maxTaskRequests: parseIntOrDefault(process.env.RATE_LIMIT_MAX_TASK_REQUESTS, 10),
  },

  policy: {
    maxPerCallAlgo: 0.01,
    budgetAlgo: 0.5,
    whitelistedCategories: ['weather', 'medical', 'satellite', 'routing', 'finance'],
  },

  contracts: {
    policy_contract: {
      app_id: 1008,
      status: 'deployed',
      blocks_count: 0,
    },
    escrow_contract: {
      app_id: 1005,
      status: 'deployed',
      refunds_count: 0,
    },
    receipt_anchor: {
      app_id: 1011,
      status: 'deployed',
      hashes_count: 0,
    },
    spend_tracker: {
      app_id: 1015,
      status: 'deployed',
      transactions_count: 0,
    },
  },
};

export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.mysql.host) errors.push('MYSQL_HOST is required');
  if (!config.mysql.database) errors.push('MYSQL_DATABASE is required');

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}

export default config;
