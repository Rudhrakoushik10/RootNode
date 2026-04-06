import React from 'react';
import { usePolling } from '../hooks/usePolling';
import { getMetrics } from '../api/client';

interface Metrics {
  total_spent_algo: number;
  budget_algo: number;
}

const mockMetrics: Metrics = {
  total_spent_algo: 0.042,
  budget_algo: 0.5,
};

export default function SpendTracker() {
  const { data: metrics } = usePolling(getMetrics, 5000, mockMetrics) as { data: Metrics | null };

  const totalSpent = metrics?.total_spent_algo || 0;
  const budget = metrics?.budget_algo || 0.5;
  const percentage = Math.min((totalSpent / budget) * 100, 100);

  const getBarColor = () => {
    if (percentage < 60) return '#3b82f6';
    if (percentage < 80) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="bg-[#1a1d27] border border-[#2d3148] rounded-[10px] p-4 flex flex-col">
      <div className="flex justify-between items-center">
        <span className="text-[13px] font-medium text-[#e2e8f0]">Budget consumption</span>
        <span className="text-[13px] text-[#94a3b8]">{totalSpent.toFixed(3)} / {budget} ALGO</span>
      </div>

      <div className="relative mt-3 h-3 bg-[#1e293b] rounded-full overflow-visible">
        <div 
          className="h-full rounded-full transition-all duration-600 ease-in-out"
          style={{ width: `${percentage}%`, backgroundColor: getBarColor() }}
        />

        <div className="absolute left-[80%] top-[-14px] flex flex-col items-center">
          <span className="text-[10px] text-[#f59e0b] mb-0.5">80%</span>
          <div className="w-[1px] h-4 bg-[#f59e0b]" />
        </div>

        <div className="absolute left-[100%] top-0 h-3 w-[1px] bg-[#ef4444]" />
      </div>

      <div className="flex justify-between items-center mt-2">
        <span className="text-[11px] text-[#475569]">0 ALGO</span>
        {percentage > 80 && (
          <span className="text-[11px] text-[#f59e0b]">Warning: approaching limit</span>
        )}
        <span className="text-[11px] text-[#ef4444]">Hard cap: {budget} ALGO</span>
      </div>

      <div className="mt-4">
        {percentage < 80 ? (
          <p className="text-[13px] text-[#22c55e]">Spending within policy limits</p>
        ) : percentage < 100 ? (
          <p className="text-[13px] text-[#f59e0b]">Warning — approaching spend cap</p>
        ) : (
          <div className="border border-[#ef4444] rounded-[4px] p-2">
            <p className="text-[13px] text-[#ef4444]">Spending locked — PolicyEnforcementContract has blocked all further transactions</p>
          </div>
        )}
      </div>

      <div className="mt-2 text-[11px] text-[#475569]">
        Per-call limit: 0.01 ALGO · Remaining calls possible: ~{Math.max(0, Math.floor((budget - totalSpent) / 0.01))}
      </div>
    </div>
  );
}
