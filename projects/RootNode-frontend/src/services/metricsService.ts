const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface Metrics {
  total_spent_algo: number
  budget_algo: number
  services_purchased: number
  unique_categories: number
  policy_rejections: number
  escrow_refunds: number
  per_call_limit_algo: number
  estimated_calls_remaining: number
}

export async function fetchMetrics(): Promise<Metrics> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/metrics`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch metrics:', error)
    return {
      total_spent_algo: 0,
      budget_algo: 0.5,
      services_purchased: 0,
      unique_categories: 0,
      policy_rejections: 0,
      escrow_refunds: 0,
      per_call_limit_algo: 0.01,
      estimated_calls_remaining: 50,
    }
  }
}
