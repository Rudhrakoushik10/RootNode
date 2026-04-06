const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface Receipt {
  id: number
  service_name: string
  amount_algo: number
  txid: string
  receipt_hash: string
  hash_on_chain: boolean
  provider: string
  timestamp: string
}

export async function fetchReceipts(): Promise<Receipt[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/receipts`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch receipts:', error)
    return []
  }
}

export function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }
  return `${Math.floor(diffHour / 24)}d ago`
}

export function formatHash(hash: string): string {
  if (hash.length <= 16) return hash
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`
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
