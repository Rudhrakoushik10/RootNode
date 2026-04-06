import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import config from '../config.js';
import logger from '../utils/logger.js';

import type { InterpretedTask } from '../types.js';

const mockInterpretations: Record<string, Omit<InterpretedTask, 'raw_request'>> = {
  'weather': {
    intent: 'get_weather_forecast',
    category: 'weather',
    parameters: { location: 'india', forecast_days: 7 },
  },
  'radiology': {
    intent: 'analyze_medical_scan',
    category: 'medical',
    parameters: { scan_type: 'xray', analysis_type: 'standard' },
  },
  'satellite': {
    intent: 'fetch_satellite_imagery',
    category: 'satellite',
    parameters: { region: 'wayanad', resolution: 'high' },
  },
  'routing': {
    intent: 'calculate_emergency_route',
    category: 'routing',
    parameters: { mode: 'disaster_relief' },
  },
  'gst': {
    intent: 'file_gst_return',
    category: 'finance',
    parameters: { return_type: 'GSTR-1' },
  },
};

function classifyByKeywords(taskText: string): string {
  const lowerTask = taskText.toLowerCase();
  
  if (lowerTask.includes('weather') || lowerTask.includes('rain') || lowerTask.includes('forecast')) {
    return 'weather';
  }
  if (lowerTask.includes('radiology') || lowerTask.includes('scan') || lowerTask.includes('medical') || lowerTask.includes('xray')) {
    return 'radiology';
  }
  if (lowerTask.includes('satellite') || lowerTask.includes('imagery') || lowerTask.includes('wayanad') || lowerTask.includes('flood')) {
    return 'satellite';
  }
  if (lowerTask.includes('route') || lowerTask.includes('disaster') || lowerTask.includes('road')) {
    return 'routing';
  }
  if (lowerTask.includes('gst') || lowerTask.includes('tax') || lowerTask.includes('filing')) {
    return 'gst';
  }
  
  return 'weather';
}

async function interpretWithGemini(taskText: string): Promise<InterpretedTask> {
  if (!config.gemini.apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  const model = genAI.getGenerativeModel({
    model: config.gemini.model || 'gemini-2.0-flash',
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ],
  });

  const prompt = `
    Analyze the following task request and extract structured information.
    
    Task: "${taskText}"
    
    Return a JSON object with:
    - intent: The main action being requested
    - category: One of [weather, medical, satellite, routing, finance]
    - parameters: Key-value pairs of relevant parameters extracted from the request
    - raw_request: The original request (unchanged)
    
    Only respond with valid JSON, no markdown or explanation.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanedText);

    return {
      intent: parsed.intent || 'unknown',
      category: parsed.category || 'weather',
      parameters: parsed.parameters || {},
      raw_request: taskText,
    };
  } catch (error) {
    logger.error('Gemini interpretation failed, falling back to keyword matching', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    const category = classifyByKeywords(taskText);
    return {
      ...mockInterpretations[category],
      raw_request: taskText,
    };
  }
}

export async function interpretTask(taskText: string): Promise<InterpretedTask> {
  logger.info('Interpreting task', { task: taskText });

  try {
    if (config.gemini.apiKey) {
      logger.debug('Using Gemini AI for interpretation');
      return await interpretWithGemini(taskText);
    }

    logger.debug('Gemini not configured, using keyword matching');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const category = classifyByKeywords(taskText);
    
    logger.info('Task interpreted', { category, intent: mockInterpretations[category].intent });

    return {
      ...mockInterpretations[category],
      raw_request: taskText,
    };
  } catch (error) {
    logger.error('Task interpretation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    const category = classifyByKeywords(taskText);
    return {
      ...mockInterpretations[category],
      raw_request: taskText,
    };
  }
}
