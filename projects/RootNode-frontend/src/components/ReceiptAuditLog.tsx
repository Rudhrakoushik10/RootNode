import React, { useState, useEffect } from 'react'
import {
  fetchReceipts,
  Receipt,
  formatTime,
  formatHash,
  getExplorerUrl,
} from '../services/receiptsService'

export const ReceiptAuditLog: React.FC = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([])

  useEffect(() => {
    const loadReceipts = async () => {
      const data = await fetchReceipts()
      setReceipts(data)
    }
    loadReceipts()
    const interval = setInterval(loadReceipts, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="card bg-base-200 shadow-xl max-h-[460px] flex flex-col">
      <div className="card-body p-4 flex-1 overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <h3 className="card-title text-lg">Receipt Audit Log</h3>
          <span className="text-xs text-gray-400">Hashes anchored on Algorand</span>
        </div>

        <div className="overflow-y-auto flex-1 space-y-2 pr-1">
          {receipts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <p className="text-gray-400">No receipts yet</p>
              <p className="text-gray-500 text-sm">Completed purchases will appear here with on-chain proof</p>
            </div>
          ) : (
            receipts.map((receipt) => (
              <div
                key={receipt.id}
                className="p-3 bg-base-300 rounded-lg hover:bg-base-300/80 transition-colors space-y-1"
              >
                {/* Top Line */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-100 truncate">
                    {receipt.service_name}
                  </span>
                  <span className="text-sm font-medium text-gray-100 ml-2">
                    {receipt.amount_algo.toFixed(4)} ALGO
                  </span>
                </div>

                {/* Second Line */}
                <div className="flex justify-between items-center">
                  <a
                    href={getExplorerUrl(receipt.txid)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-gray-500 hover:text-blue-400 truncate max-w-[140px]"
                    title={receipt.txid}
                  >
                    {receipt.txid.slice(0, 12)}...
                  </a>
                  {receipt.hash_on_chain ? (
                    <span className="badge badge-sm badge-info">Hash Anchored On-Chain</span>
                  ) : (
                    <span className="badge badge-sm badge-ghost">Pending Anchor</span>
                  )}
                </div>

                {/* Third Line - Hash */}
                <p className="text-xs font-mono text-gray-600">
                  sha256: {formatHash(receipt.receipt_hash)}
                </p>

                {/* Fourth Line */}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{receipt.provider}</span>
                  <span className="text-xs text-gray-500">{formatTime(receipt.timestamp)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sticky Footer */}
        <div className="mt-3 pt-3 border-t border-gray-600">
          <p className="text-xs text-blue-900 text-center">
            Full receipts stored in PostgreSQL · Hashes permanently on Algorand
          </p>
        </div>
      </div>
    </div>
  )
}
