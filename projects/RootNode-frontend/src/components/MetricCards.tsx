import React from 'react';
import { usePolling } from '../hooks/usePolling';
import { getMetrics } from '../api/client';

interface Metrics {
  total_spent_algo: number;
  budget_algo: number;
  remaining_algo: number;
  services_purchased: number;
  policy_rejections: number;
  escrow_refunds: number;
  categories_used: number;
}

const mockMetrics: Metrics = {
  total_spent_algo: 0.042,
  budget_algo: 0.5,
  remaining_algo: 0.458,
  services_purchased: 7,
  policy_rejections: 2,
  escrow_refunds: 1,
  categories_used: 3,
};

export default function MetricCards() {
  const { data: metrics, loading, isOffline, error } = usePolling(getMetrics, 5000, mockMetrics) as { 
    data: Metrics | null; 
    loading: boolean; 
    isOffline: boolean;
    error: string | null;
  };

  const Card = ({ label, value, subtext, subtextColor, info, valueColor }: {
    label: string;
    value: string;
    subtext?: string;
    subtextColor?: string;
    info?: string;
    valueColor?: string;
  }) => (
    <div className="bg-[#1a1d27] border border-[#2d3148] rounded-[10px] p-4 flex flex-col gap-1">
      <span className="text-[11px] text-[#64748b] uppercase tracking-[0.05em]">{label}</span>
      {loading ? (
        <div className="h-8 w-24 bg-[#2d3148] animate-pulse rounded mt-1" />
      ) : (
        <>
          <span className={`text-[22px] font-medium ${valueColor || 'text-[#e2e8f0]'}`}>{value}</span>
          {subtext && <span className={`text-[11px] ${subtextColor || 'text-[#94a3b8]'}`}>{subtext}</span>}
          {info && <span className="text-[10px] text-[#334155] italic mt-1">{info}</span>}
        </>
      )}
    </div>
  );

  return (
    <div className="relative">
      {isOffline && (
        <div className="absolute top-0 left-0 right-0 bg-[#450a0a] border border-[#ef4444] rounded-[8px] px-3 py-2 mb-2 text-[12px] text-[#f87171] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
          Backend offline — showing mock data
        </div>
      )}
      <div className="grid grid-cols-4 gap-3">
        <Card
          label="Total spent"
          value={`${metrics?.total_spent_algo?.toFixed(3) || '0.000'} ALGO`}
          subtext={`${metrics?.remaining_algo?.toFixed(3) || '0.000'} ALGO remaining`}
          subtextColor={isOffline ? "text-[#fb923c]" : "text-[#22c55e]"}
          info={`of ${metrics?.budget_algo || 0.5} ALGO budget`}
        />
        <Card
          label="Services purchased"
          value={String(metrics?.services_purchased || 0)}
          subtext={`${metrics?.categories_used || 0} categories`}
        />
        <Card
          label="Policy rejections"
          value={String(metrics?.policy_rejections || 0)}
          valueColor="text-[#ef4444]"
          subtext="blocked by contract"
          info="Smart contract enforcement"
        />
        <Card
          label="Escrow refunds"
          value={String(metrics?.escrow_refunds || 0)}
          valueColor="text-[#fb923c]"
          subtext="API failed — auto refunded"
          info="Escrow contract protection"
        />
      </div>
    </div>
  );
}
