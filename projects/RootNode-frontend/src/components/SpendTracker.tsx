import React from 'react';
import { usePolling } from '../hooks/usePolling';
import { getMetrics } from '../api/client';

interface Metrics {
  total_spent_algo: number;
  budget_algo: number;
}

interface SpendTrackerProps {
  isDark?: boolean;
}

const mockMetrics: Metrics = {
  total_spent_algo: 0.042,
  budget_algo: 0.5,
};

export default function SpendTracker({ isDark = false }: SpendTrackerProps) {
  const { data: metrics } = usePolling(getMetrics, 5000, mockMetrics) as { data: Metrics | null };

  const totalSpent = metrics?.total_spent_algo || 0;
  const budget = metrics?.budget_algo || 0.5;
  const percentage = Math.min((totalSpent / budget) * 100, 100);

  const cardBg = isDark ? 'bg-[#1a1d27]' : 'bg-white';
  const cardBorder = isDark ? 'border-[#2d3148]' : 'border-beige-200';
  const headingText = isDark ? 'text-[#e2e8f0]' : 'text-olive-dark';
  const subText = isDark ? 'text-[#94a3b8]' : 'text-olive/70';
  const barBg = isDark ? 'bg-[#1e293b]' : 'bg-beige-100';
  const labelColor = isDark ? 'text-[#475569]' : 'text-olive/50';
  
  const getBarColor = () => {
    if (percentage < 60) return isDark ? '#3b82f6' : '#556B2F';
    if (percentage < 80) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className={`${cardBg} border ${cardBorder} rounded-[10px] p-4 flex flex-col}`}>
      <div className="flex justify-between items-center">
        <span className={`text-[13px] font-medium ${headingText}`}>Budget consumption</span>
        <span className={`text-[13px] ${subText}`}>{totalSpent.toFixed(3)} / {budget} ALGO</span>
      </div>

      <div className="relative mt-3 h-3 bg-beige-100 rounded-full overflow-visible">
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
        <span className={`text-[11px] ${labelColor}`}>0 ALGO</span>
        {percentage > 80 && (
          <span className="text-[11px] text-[#f59e0b]">Warning: approaching limit</span>
        )}
        <span className={`text-[11px] ${isDark ? 'text-[#ef4444]' : 'text-red-600'}`}>Hard cap: {budget} ALGO</span>
      </div>

      <div className="mt-4">
        {percentage < 80 ? (
          <p className={`text-[13px] ${isDark ? 'text-[#22c55e]' : 'text-green-600'}`}>Spending within policy limits</p>
        ) : percentage < 100 ? (
          <p className="text-[13px] text-[#f59e0b]">Warning — approaching spend cap</p>
        ) : (
          <div className={`border border-red-500 rounded-[4px] p-2`}>
            <p className={`text-[13px] ${isDark ? 'text-[#ef4444]' : 'text-red-600'}`}>Spending locked — PolicyEnforcementContract has blocked all further transactions</p>
          </div>
        )}
      </div>

      <div className={`mt-2 text-[11px] ${labelColor}`}>
        Per-call limit: 0.01 ALGO · Remaining calls possible: ~{Math.max(0, Math.floor((budget - totalSpent) / 0.01))}
      </div>
    </div>
  );
}