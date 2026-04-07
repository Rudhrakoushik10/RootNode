export interface Service {
  id: number;
  name: string;
  provider: string;
  provider_wallet: string;
  price_algo: number;
  category: string;
  endpoint: string;
  description: string;
  rating: number;
  avg_response_time_ms: number;
}

export interface Transaction {
  id: number;
  service_name: string;
  status: 'success' | 'rejected' | 'pending' | 'refunded';
  amount_algo: number;
  txid: string | null;
  timestamp: string;
  note: string | null;
  reason: string | null;
  provider: string;
}

export interface Receipt {
  id: number;
  service_name: string;
  amount_algo: number;
  txid: string;
  receipt_hash: string;
  timestamp: string;
  hash_on_chain: boolean;
  provider: string;
}

export interface Metrics {
  total_spent_algo: number;
  budget_algo: number;
  remaining_algo: number;
  services_purchased: number;
  policy_rejections: number;
  escrow_refunds: number;
  categories_used: number;
}

export interface InterpretedTask {
  intent: string;
  category: string;
  parameters: Record<string, unknown>;
  raw_request: string;
}

export interface ServiceSelection {
  service: Service;
  score: number;
  reasons: string[];
}

export interface PolicyCheck {
  approved: boolean;
  max_per_call_algo: number;
  current_spent_algo: number;
  budget_algo: number;
  message?: string;
}

export interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  responseTime: number;
  txId?: string | null;
  fallback?: boolean;
}

export interface ReceiptData {
  service_name: string;
  provider: string;
  provider_wallet: string;
  amount_algo: number;
  timestamp: string;
  api_response: unknown;
  txid?: string;
}

export interface TaskResult {
  status: 'success' | 'rejected' | 'refunded' | 'error';
  service_name?: string;
  provider?: string;
  amount_algo?: number;
  txid?: string | null;
  receipt_hash?: string | null;
  message?: string;
  blockchain_txids?: {
    spendTracker?: string | null;
    receiptAnchor?: string | null;
  };
  is_fallback?: boolean;
}

export interface ContractState {
  app_id: number;
  status: string;
  blocks_count?: number;
  refunds_count?: number;
  hashes_count?: number;
  transactions_count?: number;
}

export interface Contracts {
  policy_contract: ContractState;
  escrow_contract: ContractState;
  receipt_anchor: ContractState;
  spend_tracker: ContractState;
}

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: unknown;
  requestId?: string;
  duration?: number;
}
