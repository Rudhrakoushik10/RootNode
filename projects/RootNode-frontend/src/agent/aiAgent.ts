import { serviceRegistry } from '../services/serviceRegistry'
import { providerComparator } from '../services/providerComparator'
import { taskInterpreter } from '../services/taskInterpreter'
import { policyEngine } from '../services/policyEngine'
import { ServiceRequest, ExecutionResult, ServiceSelection, Receipt } from './types'

export interface AgentConfig {
  maxRetries: number
  timeoutMs: number
  enablePolicyCheck: boolean
  enableEscrow: boolean
}

const defaultConfig: AgentConfig = {
  maxRetries: 2,
  timeoutMs: 30000,
  enablePolicyCheck: true,
  enableEscrow: true,
}

export class AIAgent {
  private config: AgentConfig

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
  }

  async processTask(request: ServiceRequest, agentAddress: string): Promise<ExecutionResult> {
    const parsed = taskInterpreter.parseTask(request.taskDescription)
    console.log('Parsed intent:', parsed)

    const matchingServices = serviceRegistry.getServicesForTask(request.taskDescription)
    if (matchingServices.length === 0) {
      return { success: false, receiptId: '', receiptHash: '', error: 'No services found', actualCost: 0, timestamp: Date.now() }
    }

    const selection = providerComparator.selectBest(matchingServices, request.maxBudget)
    if (!selection) {
      return { success: false, receiptId: '', receiptHash: '', error: 'No suitable service found', actualCost: 0, timestamp: Date.now() }
    }

    if (this.config.enablePolicyCheck) {
      const policyResult = await policyEngine.checkPolicy(selection.service, selection.estimatedCost)
      if (!policyResult.allowed) {
        return { success: false, receiptId: '', receiptHash: '', error: `Policy check failed: ${policyResult.reason}`, actualCost: 0, timestamp: Date.now() }
      }
    }

    try {
      const result = await this.callService(selection, request.parameters, this.config.timeoutMs)
      const receiptId = `receipt-${Date.now()}`
      const resultHash = await this.hashData(result)

      policyEngine.recordSpend(selection.estimatedCost)

      return {
        success: true,
        receiptId,
        receiptHash: resultHash,
        data: result,
        actualCost: selection.estimatedCost,
        timestamp: Date.now(),
      }
    } catch (error) {
      return {
        success: false,
        receiptId: '',
        receiptHash: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        actualCost: 0,
        timestamp: Date.now(),
      }
    }
  }

  private async callService(selection: ServiceSelection, params: Record<string, unknown>, timeoutMs: number): Promise<unknown> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(selection.service.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (error) {
      clearTimeout(timeout)
      throw error
    }
  }

  private async hashData(data: unknown): Promise<string> {
    const jsonString = JSON.stringify(data)
    const dataBuffer = new TextEncoder().encode(jsonString)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  getServiceRecommendations(taskDescription: string): ServiceSelection[] {
    const matchingServices = serviceRegistry.getServicesForTask(taskDescription)
    return providerComparator.compareServices(matchingServices)
  }

  getPolicyStatus() {
    return policyEngine.getStatus()
  }
}

export const aiAgent = new AIAgent()
