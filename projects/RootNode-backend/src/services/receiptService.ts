import crypto from 'crypto';
import { anchorReceiptOnChain, verifyReceiptOnChain, getReceiptIndexOnChain } from './contractService.js';

export interface ReceiptData {
  service_name: string;
  provider: string;
  provider_wallet: string;
  amount_algo: number;
  timestamp: string;
  api_response: unknown;
  txid?: string;
}

export interface Receipt {
  service_name: string;
  amount_algo: number;
  txid: string;
  receipt_hash: string;
  timestamp: string;
  hash_on_chain: boolean;
  on_chain_index?: bigint | null;
  provider: string;
}

export function generateReceiptHash(receipt: ReceiptData): string {
  const hashInput = JSON.stringify({
    service_name: receipt.service_name,
    provider: receipt.provider,
    provider_wallet: receipt.provider_wallet,
    amount_algo: receipt.amount_algo,
    timestamp: receipt.timestamp,
    txid: receipt.txid,
  });

  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

export async function createReceipt(data: ReceiptData): Promise<Receipt> {
  const timestamp = new Date().toISOString();
  const hash = generateReceiptHash({
    ...data,
    timestamp,
  });

  let hashOnChain = false;
  let onChainIndex: bigint | null = null;

  try {
    const anchorResult = await anchorReceiptOnChain(hash, data.service_name);
    
    if (anchorResult.success) {
      hashOnChain = true;
      onChainIndex = anchorResult.receiptIndex;
      console.log('[Receipt Service] Receipt anchored on chain', {
        hash,
        index: onChainIndex?.toString(),
      });
    }
  } catch (error) {
    console.warn('[Receipt Service] Failed to anchor receipt on chain', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hash,
    });
  }

  return {
    service_name: data.service_name,
    amount_algo: data.amount_algo,
    txid: data.txid || `TX_LOCAL_${Date.now()}`,
    receipt_hash: hash,
    timestamp,
    hash_on_chain: hashOnChain,
    on_chain_index: onChainIndex,
    provider: data.provider,
  };
}

export async function verifyReceipt(hash: string): Promise<{
  exists: boolean;
  index: bigint | null;
}> {
  try {
    const exists = await verifyReceiptOnChain(hash);
    const index = exists ? await getReceiptIndexOnChain(hash) : null;
    
    return {
      exists,
      index,
    };
  } catch (error) {
    console.error('[Receipt Service] Failed to verify receipt', { error });
    return {
      exists: false,
      index: null,
    };
  }
}

export function generateServiceId(provider: string, category: string): string {
  return `${provider.toLowerCase()}_${category.toLowerCase()}_${Date.now()}`;
}
