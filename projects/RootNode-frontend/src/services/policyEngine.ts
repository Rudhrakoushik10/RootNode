import { PolicyCheckResult, Service } from '../agent/types'

export class PolicyEngine {
  private maxSpendPerTx: number = 1_000_000
  private maxSpendDaily: number = 10_000_000
  private dailySpent: number = 0
  private whitelist: Set<string> = new Set()

  constructor() {
    this.whitelist.add('https://api.gpt4.example.com/chat')
    this.whitelist.add('https://api.claude.example.com/messages')
    this.whitelist.add('https://api.stablediffusion.example.com/generate')
  }

  async checkPolicy(service: Service, amount: number): Promise<PolicyCheckResult> {
    if (amount > this.maxSpendPerTx) {
      return { allowed: false, reason: `Amount exceeds per-tx limit`, maxSpend: this.maxSpendPerTx, dailySpent: this.dailySpent, dailyLimit: this.maxSpendDaily, serviceWhitelisted: this.whitelist.has(service.endpoint) }
    }

    if (this.dailySpent + amount > this.maxSpendDaily) {
      return { allowed: false, reason: `Would exceed daily limit`, maxSpend: this.maxSpendPerTx, dailySpent: this.dailySpent, dailyLimit: this.maxSpendDaily, serviceWhitelisted: this.whitelist.has(service.endpoint) }
    }

    if (!this.whitelist.has(service.endpoint)) {
      return { allowed: false, reason: `Service not whitelisted`, maxSpend: this.maxSpendPerTx, dailySpent: this.dailySpent, dailyLimit: this.maxSpendDaily, serviceWhitelisted: false }
    }

    return { allowed: true, maxSpend: this.maxSpendPerTx, dailySpent: this.dailySpent, dailyLimit: this.maxSpendDaily, serviceWhitelisted: true }
  }

  recordSpend(amount: number): void {
    this.dailySpent += amount
  }

  getStatus() {
    return { dailySpent: this.dailySpent, dailyLimit: this.maxSpendDaily, perTxLimit: this.maxSpendPerTx }
  }
}

export const policyEngine = new PolicyEngine()
