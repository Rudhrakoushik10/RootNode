import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL 
  ? `${import.meta.env.VITE_BACKEND_URL}/api`
  : 'http://localhost:3001/api';
const CONNECTION_TIMEOUT = 5000;

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: CONNECTION_TIMEOUT,
});

interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export const isBackendOffline = (error: unknown): boolean => {
  if (error instanceof AxiosError) {
    if (!error.response) {
      return true;
    }
  }
  return false;
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    if (!error.response) {
      if (error.code === 'ECONNREFUSED') {
        return 'Backend server is offline';
      }
      if (error.code === 'ERR_NETWORK') {
        return 'Network error - cannot reach backend';
      }
      if (error.code === 'ECONNABORTED') {
        return 'Request timeout - backend is slow';
      }
      return 'Backend is not responding';
    }

    if (error.response?.data?.error?.message) {
      return error.response.data.error.message;
    }

    if (error.response?.status === 403) {
      return 'Policy rejected - amount exceeds per-call limit';
    }

    if (error.response?.status === 429) {
      return 'Too many requests - please wait';
    }
  }

  return 'An unexpected error occurred';
};

export const checkBackendConnection = async (): Promise<{
  online: boolean;
  latency?: number;
  error?: string;
}> => {
  const start = Date.now();
  try {
    await client.get('/health', { timeout: 3000 });
    return {
      online: true,
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      online: false,
      error: getErrorMessage(error),
    };
  }
};

export const sendTask = async (taskText: string) => {
  try {
    return await client.post('/task', { task: taskText });
  } catch (error) {
    throw {
      offline: isBackendOffline(error),
      message: getErrorMessage(error),
      original: error,
    };
  }
};

export const getMetrics = async () => {
  try {
    return await client.get('/metrics');
  } catch (error) {
    throw {
      offline: isBackendOffline(error),
      message: getErrorMessage(error),
      original: error,
    };
  }
};

export const getTransactions = async () => {
  try {
    return await client.get('/transactions');
  } catch (error) {
    throw {
      offline: isBackendOffline(error),
      message: getErrorMessage(error),
      original: error,
    };
  }
};

export const getReceipts = async () => {
  try {
    return await client.get('/receipts');
  } catch (error) {
    throw {
      offline: isBackendOffline(error),
      message: getErrorMessage(error),
      original: error,
    };
  }
};

export const getContractStatus = async () => {
  try {
    return await client.get('/contracts');
  } catch (error) {
    throw {
      offline: isBackendOffline(error),
      message: getErrorMessage(error),
      original: error,
    };
  }
};

export default client;
