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
  
  // Check routing FIRST before satellite (because "flood" triggers satellite)
  if (lowerTask.includes('route') || lowerTask.includes('path from') || lowerTask.includes('path to') || 
      lowerTask.includes('direction') || lowerTask.includes('navigat') || lowerTask.includes('avoid') ||
      lowerTask.includes('from ') && lowerTask.includes(' to ')) {
    return 'routing';
  }
  
  if (lowerTask.includes('weather') || lowerTask.includes('rain') || lowerTask.includes('forecast') || 
      lowerTask.includes('temperature') || lowerTask.includes('climate')) {
    return 'weather';
  }
  if (lowerTask.includes('radiology') || lowerTask.includes('scan') || lowerTask.includes('medical') || 
      lowerTask.includes('xray') || lowerTask.includes('health') || lowerTask.includes('patient') || 
      lowerTask.includes('doctor') || lowerTask.includes('drug')) {
    return 'radiology';
  }
  // Satellite ONLY matches explicit satellite/imagery/photo keywords - NOT flood
  if (lowerTask.includes('satellite') || lowerTask.includes('imagery') || lowerTask.includes('photo') || 
      lowerTask.includes('aerial') || lowerTask.includes('geospatial')) {
    return 'satellite';
  }
  if (lowerTask.includes('stock') || lowerTask.includes('price') || lowerTask.includes('share') || 
      lowerTask.includes('market') || lowerTask.includes('trading') || lowerTask.includes('finance') || 
      lowerTask.includes('investment') || lowerTask.includes('gst') || lowerTask.includes('tax') || 
      lowerTask.includes('filing') || lowerTask.includes('reliance')) {
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
    IMPORTANT: You must classify this task and respond with EXACTLY this JSON format.
    
    Task: "${taskText}"
    
    CATEGORIES: weather, medical, routing, satellite, finance
    
    EXAMPLES - follow these EXACTLY:
    - "find route from A to B" → {"intent":"calculate_route","category":"routing","parameters":{},"raw_request":"${taskText}"}
    - "get satellite image" → {"intent":"fetch_imagery","category":"satellite","parameters":{},"raw_request":"${taskText}"}
    - "route avoiding flood" → {"intent":"calculate_route","category":"routing","parameters":{},"raw_request":"${taskText}"}
    
    Return ONLY the JSON. No explanation. No markdown.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanedText);

    let category = (parsed.category || 'weather').toLowerCase();
    
    // ALWAYS check task text for routing keywords - AI can misclassify
    const taskLower = taskText.toLowerCase();
    const isRoutingByKeywords = 
      taskLower.includes('route') || 
      taskLower.includes('best route') ||
      taskLower.includes('path from') ||
      taskLower.includes('path to') ||
      taskLower.includes('from ') && taskLower.includes(' to ') ||
      (taskLower.includes('avoid') && taskLower.includes('flood'));
    
    if (isRoutingByKeywords) {
      category = 'routing';
    }
    
    console.log(`[CATEGORY] "${taskText}" -> ${category}`);

    return {
      intent: parsed.intent || 'unknown',
      category: category,
      parameters: parsed.parameters || {},
      raw_request: taskText,
    };
  } catch (error) {
    console.log(`[FALLBACK] Using keyword matching for: "${taskText}"`);
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
