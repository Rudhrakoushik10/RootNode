export interface Service {
  id: string
  name: string
  endpoint: string
  pricePerCall: number
  priceUnit: 'microAlgo' | 'usdc'
  trustScore: number
  avgLatencyMs: number
  description: string
  capabilities: string[]
  provider: Provider
}

export interface Provider {
  id: string
  name: string
  address: string
  reputation: number
  supportedServices: string[]
}

export interface ServiceRequest {
  taskDescription: string
  parameters: Record<string, unknown>
  maxBudget: number
  preferredProviders?: string[]
}

export interface ServiceSelection {
  service: Service
  provider: Provider
  estimatedCost: number
  estimatedLatency: number
  confidence: number
}

export interface ExecutionResult {
  success: boolean
  receiptId: string
  receiptHash: string
  data?: unknown
  error?: string
  actualCost: number
  timestamp: number
}

export interface EscrowInfo {
  escrowAddress: string
  escrowId: number
  amount: number
  status: 'pending' | 'completed' | 'refunded' | 'expired'
  agent: string
  provider: string
  serviceId: string
}

export interface PolicyCheckResult {
  allowed: boolean
  reason?: string
  maxSpend: number
  dailySpent: number
  dailyLimit: number
  serviceWhitelisted: boolean
}

export interface Receipt {
  id: string
  timestamp: number
  serviceId: string
  agentAddress: string
  providerAddress: string
  amount: number
  resultHash: string
  requestParams: Record<string, unknown>
  responseData?: unknown
}
