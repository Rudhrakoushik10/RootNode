import { ServiceRequest } from '../agent/types'

interface ParsedIntent {
  intent: string
  parameters: Record<string, unknown>
  requiredCapabilities: string[]
  estimatedComplexity: 'low' | 'medium' | 'high'
}

export class TaskInterpreter {
  private intentPatterns: Map<RegExp, { intent: string; capabilities: string[]; complexity: 'low' | 'medium' | 'high' }> = new Map([
    [/chat|conversation|talk|message|ask/i, { intent: 'chat', capabilities: ['chat'], complexity: 'low' }],
    [/image|picture|photo|art|generate.*image|create.*image/i, { intent: 'image-generation', capabilities: ['image-generation'], complexity: 'high' }],
    [/translate|language/i, { intent: 'translation', capabilities: ['translation'], complexity: 'low' }],
    [/sentiment|emotion|feeling|analyze.*text/i, { intent: 'text-analysis', capabilities: ['text-analysis'], complexity: 'medium' }],
  ])

  parseTask(taskDescription: string): ParsedIntent {
    let detectedIntent = 'general'
    let requiredCapabilities: string[] = []
    let complexity: 'low' | 'medium' | 'high' = 'low'

    for (const [pattern, config] of this.intentPatterns) {
      if (pattern.test(taskDescription)) {
        detectedIntent = config.intent
        requiredCapabilities = config.capabilities
        complexity = config.complexity
        break
      }
    }

    return { intent: detectedIntent, parameters: {}, requiredCapabilities, estimatedComplexity: complexity }
  }

  interpretToServiceRequest(taskDescription: string): ServiceRequest {
    const parsed = this.parseTask(taskDescription)
    return { taskDescription, parameters: parsed.parameters, maxBudget: 100000 }
  }
}

export const taskInterpreter = new TaskInterpreter()
