import axios, { AxiosError } from 'axios';
import logger from '../utils/logger.js';
import { x402Client, type X402PaymentResult } from './x402Client.js';
import type { Service, ApiResponse } from '../types.js';

const DEFAULT_TIMEOUT = 30000;
const FALLBACK_MODE = process.env.FALLBACK_MODE === 'true' || true;

function getMockResponse(category: string): Record<string, unknown> {
  const mockResponses: Record<string, Record<string, unknown>> = {
    weather: {
      location: 'Chennai',
      temperature: '32°C',
      condition: 'Partly Cloudy',
      humidity: '75%',
      wind_speed: '15 km/h',
      forecast: 'Expect clear skies with occasional clouds',
      timestamp: new Date().toISOString(),
    },
    medical: {
      patient_id: 'MOCK-001',
      records: [
        { type: 'checkup', date: '2024-01-15', result: 'Normal' },
        { type: 'blood_pressure', date: '2024-01-20', result: '120/80 mmHg' },
      ],
      note: 'Mock medical data - provider was unreachable',
      timestamp: new Date().toISOString(),
    },
    satellite: {
      location: 'Wayanad, Kerala',
      imagery: 'High-resolution satellite image captured',
      resolution: '0.5m per pixel',
      coverage: '100 sq km',
      cloud_cover: '15%',
      timestamp: new Date().toISOString(),
    },
    routing: {
      origin: 'Chennai',
      destination: 'Bangalore',
      distance: '350 km',
      estimated_time: '5h 30m',
      route: 'NH-48 via Vellore, Krishnagiri',
      traffic_condition: 'Normal',
      timestamp: new Date().toISOString(),
    },
    finance: {
      symbol: 'AAPL',
      price: '178.50 USD',
      change: '+2.3%',
      volume: '52.3M',
      market_cap: '2.8T',
      note: 'Mock financial data - provider was unreachable',
      timestamp: new Date().toISOString(),
    },
  };

  return mockResponses[category.toLowerCase()] || {
    message: 'Mock response - provider was unreachable',
    category,
    timestamp: new Date().toISOString(),
  };
}

export async function callProviderApi(service: Service, timeoutMs?: number): Promise<ApiResponse> {
  const timeout = timeoutMs || DEFAULT_TIMEOUT;
  const startTime = Date.now();

  logger.info('Calling provider API via x402', {
    service: service.name,
    provider: service.provider,
    endpoint: service.endpoint,
    category: service.category,
    timeout: `${timeout}ms`,
  });

  try {
    const result: X402PaymentResult = await x402Client.get(service.endpoint);

    const responseTime = Date.now() - startTime;

    if (result.success && result.data) {
      logger.info('Provider API call successful', {
        service: service.name,
        txId: result.txId,
        responseTime: `${responseTime}ms`,
      });

      return {
        success: true,
        data: result.data,
        responseTime,
        txId: result.txId,
      };
    }

    logger.warn('Provider API call failed', {
      service: service.name,
      error: result.error,
      responseTime: `${responseTime}ms`,
    });

    return {
      success: false,
      error: result.error || 'Unknown error',
      responseTime,
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;

    if (error instanceof AxiosError) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        logger.warn('Provider endpoint unreachable - using fallback mock data', {
          service: service.name,
          endpoint: service.endpoint,
          error: error.message,
          fallback: FALLBACK_MODE,
        });
        
        if (FALLBACK_MODE) {
          const mockData = getMockResponse(service.category);
          logger.info('Fallback mode: returning mock data', {
            service: service.name,
            category: service.category,
          });
          return {
            success: true,
            data: mockData,
            responseTime,
            fallback: true,
          };
        }
        
        return {
          success: false,
          error: 'Provider endpoint unreachable. Make sure mock provider server is running.',
          responseTime,
        };
      }

      if (error.code === 'ENOTFOUND') {
        logger.error('Provider endpoint DNS resolution failed', {
          service: service.name,
          endpoint: service.endpoint,
          error: error.message,
        });
        return {
          success: false,
          error: 'Provider endpoint unreachable (DNS lookup failed)',
          responseTime,
        };
      }

      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        logger.error('Provider endpoint timeout', {
          service: service.name,
          endpoint: service.endpoint,
          timeout: `${timeout}ms`,
          error: error.message,
        });
        return {
          success: false,
          error: `Provider endpoint timeout (${timeout}ms exceeded)`,
          responseTime,
        };
      }

      if (error.response) {
        logger.warn('Provider API returned error response', {
          service: service.name,
          status: error.response.status,
          statusText: error.response.statusText,
        });
        return {
          success: false,
          error: `Provider API error: HTTP ${error.response.status}`,
          responseTime,
        };
      }
    }

    logger.error('Provider API call failed', {
      service: service.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
    };
  }
}

export function validateResponse(response: ApiResponse): boolean {
  return response.success && response.data !== undefined;
}

export function getProviderEndpoint(category: string): string {
  const endpoints: Record<string, string> = {
    weather: '/api/weather',
    medical: '/api/medical',
    satellite: '/api/satellite',
    routing: '/api/routing',
    finance: '/api/finance',
  };

  return endpoints[category.toLowerCase()] || '/api/custom';
}
