import React from 'react';
import { usePolling } from '../hooks/usePolling';
import { getTransactions } from '../api/client';

interface Transaction {
  id: number;
  service_name: string;
  status: string;
  amount_algo: number;
  txid: string | null;
  timestamp: string;
  note?: string;
  reason?: string;
}

const mockTransactions: Transaction[] = [
  { id: 1, service_name: "weather-forecast-india", status: "success", amount_algo: 0.002, txid: "TXMOCK12345678", timestamp: new Date(Date.now() - 60000).toISOString(), note: "escrow released to provider" },
  { id: 2, service_name: "radiology-scan-api", status: "rejected", amount_algo: 0, txid: null, timestamp: new Date(Date.now() - 300000).toISOString(), reason: "blocked by contract" },
  { id: 3, service_name: "satellite-imagery-wayanad", status: "refunded", amount_algo: 0.003, txid: "TXMOCK87654321", timestamp: new Date(Date.now() - 600000).toISOString(), note: "API failed - auto refunded" },
];

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

export default function TransactionFeed() {
  const { data, loading, isOffline } = usePolling(getTransactions, 3000, mockTransactions) as { 
    data: Transaction[] | null; 
    loading: boolean;
    isOffline: boolean;
  };
  const transactions = Array.isArray(data) ? data : mockTransactions;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'success':
        return { bg: '#14532d', text: '#4ade80', label: 'OK' };
      case 'rejected':
        return { bg: '#450a0a', text: '#f87171', label: 'NO' };
      case 'refunded':
        return { bg: '#431407', text: '#fb923c', label: 'REF' };
      default:
        return { bg: '#1c1917', text: '#fb923c', label: '...' };
    }
  };

  return (
    <div className="bg-[#1a1d27] border border-[#2d3148] rounded-[10px] p-4 flex flex-col h-full relative">
      {isOffline && (
        <div className="absolute top-0 left-0 right-0 bg-[#450a0a] border border-[#ef4444] rounded-[8px] px-3 py-2 mb-2 text-[12px] text-[#f87171] flex items-center gap-2 z-10">
          <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
          Backend offline — showing mock data
        </div>
      )}
      
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse-slow" />
          <h3 className="text-[13px] font-medium text-[#e2e8f0]">Live transactions</h3>
        </div>
        <span className="text-[11px] text-[#475569]">Updates every 3s</span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[420px] pr-1">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-10">
            <p className="text-[#475569] text-[13px]">Loading...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-10">
            <p className="text-[#475569] text-[13px]">No transactions yet</p>
            <p className="text-[#475569] text-[12px]">Send a task to the agent to start</p>
          </div>
        ) : (
          transactions.map((tx) => {
            const config = getStatusConfig(tx.status);
            return (
              <div key={tx.id} className="flex items-start gap-2.5 py-2.5 border-b border-[#1e293b] last:border-0 relative">
                <div 
                  className="w-7 h-7 rounded-[6px] flex-shrink-0 mt-0.5 flex items-center justify-center text-[11px] font-medium"
                  style={{ backgroundColor: config.bg, color: config.text }}
                >
                  {config.label}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[#cbd5e1] truncate">{tx.service_name}</p>
                  <p className="text-[11px] text-[#475569] mt-0.5">{tx.note || tx.reason}</p>
                  {tx.status === 'success' && (
                    <p className="text-[10px] text-[#334155] mt-0.5">Escrow released · Provider paid</p>
                  )}
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <span className={`text-[12px] font-medium ${tx.status === 'rejected' ? 'text-[#f87171]' : tx.status === 'refunded' ? 'text-[#fb923c]' : 'text-[#e2e8f0]'}`}>
                    {tx.status === 'rejected' ? 'blocked' : `${tx.amount_algo} ALGO`}
                  </span>
                  {tx.txid ? (
                    <a 
                      href={`http://localhost:5173/explorer/transaction/${tx.txid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono text-[#334155] hover:text-[#3b82f6] transition-colors mt-0.5"
                    >
                      {tx.txid.substring(0, 6)}...{tx.txid.substring(tx.txid.length - 4)}
                    </a>
                  ) : (
                    <span className="text-[10px] text-[#334155] mt-0.5">no txid</span>
                  )}
                </div>

                <span className="absolute bottom-1 right-0 text-[10px] text-[#334155]">
                  {formatTime(tx.timestamp)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
