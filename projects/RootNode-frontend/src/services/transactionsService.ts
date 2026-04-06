const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface Transaction {
  id: number
  service_name: string
  status: 'success' | 'rejected' | 'pending' | 'refunded'
  amount_algo: number
  txid: string | null
  note: string
  provider: string
  timestamp: string
}

export async function fetchTransactions(): Promise<Transaction[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/transactions`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch transactions:', error)
    return []
  }
}

export function getStatusCode(status: Transaction['status']): { code: string; color: string; bgColor: string } {
  switch (status) {
    case 'success':
      return { code: 'OK', color: 'text-green-400', bgColor: 'bg-green-600' }
    case 'rejected':
      return { code: 'NO', color: 'text-red-400', bgColor: 'bg-red-600' }
    case 'pending':
      return { code: '...', color: 'text-orange-400', bgColor: 'bg-orange-600' }
    case 'refunded':
      return { code: 'REF', color: 'text-orange-400', bgColor: 'bg-orange-500' }
  }
}

export function getNote(status: Transaction['status']): string {
  switch (status) {
    case 'success':
      return 'Escrow released — provider paid'
    case 'rejected':
      return 'PolicyEnforcementContract — over per-call limit'
    case 'pending':
      return 'Escrow locked — awaiting API response'
    case 'refunded':
      return 'EscrowContract — API invalid, refund issued'
  }
}

export function formatRelativeTime(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  return `${Math.floor(diffHour / 24)}d ago`
}

export function getExplorerUrl(txid: string): string {
  const network = import.meta.env.VITE_ALGOD_NETWORK || 'testnet'
  if (network === 'localnet') {
    return `#`
  }
  if (network === 'testnet' || !network) {
    return `https://testnet.algoscan.io/tx/${txid}`
  }
  return `https://algoscan.io/tx/${txid}`
}
