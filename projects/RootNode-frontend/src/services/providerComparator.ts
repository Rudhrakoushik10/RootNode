import { Service, ServiceSelection } from '../agent/types'

export class ProviderComparator {
  private weights = { cost: 0.4, trust: 0.3, speed: 0.3 }

  compareServices(services: Service[]): ServiceSelection[] {
    if (services.length === 0) return []

    const maxCost = Math.max(...services.map((s) => s.pricePerCall))
    const minLatency = Math.min(...services.map((s) => s.avgLatencyMs))
    const maxLatency = Math.max(...services.map((s) => s.avgLatencyMs))

    return services.map((service) => {
      const costScore = maxCost > 0 ? 1 - service.pricePerCall / maxCost : 1
      const trustScore = service.trustScore
      const speedScore =
        maxLatency > minLatency
          ? 1 - (service.avgLatencyMs - minLatency) / (maxLatency - minLatency)
          : 1

      const overallScore = costScore * this.weights.cost + trustScore * this.weights.trust + speedScore * this.weights.speed

      return {
        service,
        provider: service.provider,
        estimatedCost: service.pricePerCall,
        estimatedLatency: service.avgLatencyMs,
        confidence: overallScore,
      }
    }).sort((a, b) => b.confidence - a.confidence)
  }

  selectBest(services: Service[], maxBudget?: number): ServiceSelection | null {
    const candidates = maxBudget !== undefined ? services.filter((s) => s.pricePerCall <= maxBudget) : services
    const selections = this.compareServices(candidates)
    return selections.length > 0 ? selections[0] : null
  }
}

export const providerComparator = new ProviderComparator()
