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

interface TransactionFeedProps {
  isDark?: boolean;
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

export default function TransactionFeed({ isDark = false }: TransactionFeedProps) {
  const { data, loading, isOffline } = usePolling(getTransactions, 3000, mockTransactions) as { 
    data: Transaction[] | null; 
    loading: boolean;
    isOffline: boolean;
  };
  const transactions = Array.isArray(data) ? data : mockTransactions;

  const cardBg = isDark ? 'bg-[#1a1d27]' : 'bg-white';
  const cardBorder = isDark ? 'border-[#2d3148]' : 'border-beige-200';
  const headingText = isDark ? 'text-[#e2e8f0]' : 'text-olive-dark';
  const subText = isDark ? 'text-[#475569]' : 'text-olive/50';
  const borderColor = isDark ? 'border-[#1e293b]' : 'border-beige-100';
  const itemText = isDark ? 'text-[#cbd5e1]' : 'text-olive-dark';
  const secondaryText = isDark ? 'text-[#475569]' : 'text-olive/60';

  const getStatusConfig = (status: string) => {
    if (isDark) {
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
    } else {
      switch (status) {
        case 'success':
          return { bg: '#E8F5E9', text: '#2E7D32', label: 'OK' };
        case 'rejected':
          return { bg: '#FFEBEE', text: '#C62828', label: 'NO' };
        case 'refunded':
          return { bg: '#FFF3E0', text: '#E65100', label: 'REF' };
        default:
          return { bg: '#FFF8E1', text: '#F57C00', label: '...' };
      }
    }
  };

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
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-slow" />
          <h3 className={`text-[13px] font-medium ${headingText}`}>Live transactions</h3>
        </div>
        <span className={`text-[11px] ${secondaryText}`}>Updates every 3s</span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[420px] pr-1">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-10">
            <p className={`text-[13px] ${secondaryText}`}>Loading...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-10">
            <p className={`text-[13px] ${secondaryText}`}>No transactions yet</p>
            <p className={`text-[12px] ${secondaryText}`}>Send a task to the agent to start</p>
          </div>
        ) : (
          transactions.map((tx) => {
            const config = getStatusConfig(tx.status);
            return (
              <div key={tx.id} className={`flex items-start gap-2.5 py-2.5 border-b ${borderColor} last:border-0 relative`}>
                <div 
                  className="w-7 h-7 rounded-[6px] flex-shrink-0 mt-0.5 flex items-center justify-center text-[11px] font-medium"
                  style={{ backgroundColor: config.bg, color: config.text }}
                >
                  {config.label}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] font-medium ${itemText} truncate`}>{tx.service_name}</p>
                  <p className={`text-[11px] ${secondaryText} mt-0.5`}>{tx.note || tx.reason}</p>
                  {tx.status === 'success' && (
                    <p className={`text-[10px] ${isDark ? 'text-[#334155]' : 'text-olive/40'} mt-0.5`}>Escrow released · Provider paid</p>
                  )}
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <span className={`text-[12px] font-medium ${
                    tx.status === 'rejected' ? (isDark ? 'text-[#f87171]' : 'text-red-600') : 
                    tx.status === 'refunded' ? (isDark ? 'text-[#fb923c]' : 'text-amber-600') : 
                    (isDark ? 'text-[#e2e8f0]' : 'text-olive-dark')
                  }`}>
                    {tx.status === 'rejected' ? 'blocked' : `${tx.amount_algo} ALGO`}
                  </span>
                  {tx.txid ? (
                    <a 
                      href={`https://lora.algokit.io/localnet/transaction/${tx.txid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-[10px] font-mono ${isDark ? 'text-[#334155]' : 'text-olive/40'} hover:text-olive transition-colors mt-0.5`}
                      title="View on Lora Explorer (LocalNet)"
                    >
                      {tx.txid.substring(0, 6)}...{tx.txid.substring(tx.txid.length - 4)}
                    </a>
                  ) : (
                    <span className={`text-[10px] ${isDark ? 'text-[#334155]' : 'text-olive/40'} mt-0.5`}>no txid</span>
                  )}
                </div>

                <span className={`absolute bottom-1 right-0 text-[10px] ${isDark ? 'text-[#334155]' : 'text-olive/40'}`}>
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