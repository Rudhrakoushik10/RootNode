import React from 'react';
import { usePolling } from '../hooks/usePolling';
import { getReceipts } from '../api/client';

interface Receipt {
  id: number;
  service_name: string;
  amount_algo: number;
  txid: string;
  receipt_hash: string;
  timestamp: string;
  hash_on_chain: boolean;
  provider: string;
}

interface ReceiptLogProps {
  isDark?: boolean;
}

const mockReceipts: Receipt[] = [
  { id: 1, service_name: "weather-forecast-india", amount_algo: 0.002, txid: "TXMOCK12345678", receipt_hash: "a3f9c2d81b4e3f9a1234567890abcdef", timestamp: new Date(Date.now() - 60000).toISOString(), hash_on_chain: true, provider: "WeatherCo India" },
  { id: 2, service_name: "radiology-scan-api", amount_algo: 0.004, txid: "TXMOCK87654321", receipt_hash: "b4e0d3e82c5f4a0b2345678901bcdef0", timestamp: new Date(Date.now() - 300000).toISOString(), hash_on_chain: true, provider: "HealthData Systems" },
];

export default function ReceiptLog({ isDark = false }: ReceiptLogProps) {
  const { data, loading, isOffline } = usePolling(getReceipts, 3000, mockReceipts) as { 
    data: Receipt[] | null; 
    loading: boolean;
    isOffline: boolean;
  };
  const receipts = Array.isArray(data) ? data : mockReceipts;

  const cardBg = isDark ? 'bg-[#1a1d27]' : 'bg-white';
  const cardBorder = isDark ? 'border-[#2d3148]' : 'border-beige-200';
  const headingText = isDark ? 'text-[#e2e8f0]' : 'text-olive-dark';
  const secondaryText = isDark ? 'text-[#475569]' : 'text-olive/50';
  const borderColor = isDark ? 'border-[#1e293b]' : 'border-beige-100';
  const itemText = isDark ? 'text-[#cbd5e1]' : 'text-olive-dark';
  const monoText = isDark ? 'text-[#334155]' : 'text-olive/40';

  return (
    <div className={`${cardBg} border ${cardBorder} rounded-[10px] p-4 flex flex-col h-full relative`}>
      {isOffline && (
        <div className={`absolute top-0 left-0 right-0 border rounded-[8px] px-3 py-2 mb-2 text-[12px] flex items-center gap-2 z-10 ${
          isDark ? 'bg-[#450a0a] border-[#ef4444] text-[#f87171]' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Backend offline — showing mock data
        </div>
      )}
      
      <div className="flex justify-between items-center mb-3">
        <h3 className={`text-[13px] font-medium ${headingText}`}>Receipt audit log</h3>
        <span className={`text-[11px] ${secondaryText}`}>Full JSON in MySQL</span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[420px] pr-1">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-10">
            <p className={`text-[13px] ${secondaryText}`}>Loading...</p>
          </div>
        ) : receipts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-10">
            <p className={`text-[13px] ${secondaryText}`}>No receipts anchored yet</p>
          </div>
        ) : (
          receipts.map((receipt) => (
            <div key={receipt.id} className={`py-2.5 border-b ${borderColor} last:border-0`}>
              <div className="flex justify-between items-center">
                <span className={`text-[12px] font-medium ${itemText}`}>{receipt.service_name}</span>
                <span className={`text-[12px] ${isDark ? 'text-[#e2e8f0]' : 'text-olive-dark'}`}>{receipt.amount_algo} ALGO</span>
              </div>

              <div className="flex justify-between items-center mt-1">
                <a 
                  href={`https://lora.algokit.io/localnet/transaction/${receipt.txid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-[10px] font-mono ${monoText} hover:text-olive cursor-pointer`}
                  title="View on Lora Explorer (LocalNet)"
                >
                  {receipt.txid}
                </a>
                <div className="flex items-center gap-2">
                  {receipt.hash_on_chain ? (
                    <div className={`border rounded-[3px] px-[7px] py-[2px] text-[10px] ${
                      isDark ? 'bg-[#0c1a35] text-[#3b82f6] border-[#1d4ed8]' : 'bg-olive/10 text-olive border-olive/30'
                    }`}>
                      hash anchored on-chain
                    </div>
                  ) : (
                    <div className={`rounded-[3px] px-[7px] py-[2px] text-[10px] ${
                      isDark ? 'bg-[#1e293b] text-[#475569]' : 'bg-beige-100 text-olive/60'
                    }`}>
                      hash pending
                    </div>
                  )}
                </div>
              </div>

              <div className={`text-[10px] font-mono ${monoText} mt-1`}>
                sha256: {receipt.receipt_hash.substring(0, 12)}...{receipt.receipt_hash.substring(receipt.receipt_hash.length - 6)}
              </div>

              <div className="flex justify-between items-center mt-1">
                <span className={`text-[10px] ${monoText}`}>{new Date(receipt.timestamp).toLocaleString()}</span>
                <span className={`text-[10px] ${secondaryText}`}>{receipt.provider}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={`mt-3 pt-2 border-t ${borderColor} flex items-center justify-between text-[11px] ${monoText}`}>
        <span>Full receipts stored in MySQL · Hashes anchored on Algorand</span>
        <div className={`rounded-[8px] px-2 py-1 ${isDark ? 'bg-[#1e293b]' : 'bg-beige-100'}`}>
          v1.0.4-stable
        </div>
      </div>
    </div>
  );
}