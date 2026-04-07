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

interface MetricCardsProps {
  isDark?: boolean;
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

export default function MetricCards({ isDark = false }: MetricCardsProps) {
  const { data: metrics, loading, isOffline, error } = usePolling(getMetrics, 5000, mockMetrics) as { 
    data: Metrics | null; 
    loading: boolean; 
    isOffline: boolean;
    error: string | null;
  };

  const cardBg = isDark ? 'bg-[#1a1d27]' : 'bg-white';
  const cardBorder = isDark ? 'border-[#2d3148]' : 'border-beige-200';
  const labelColor = isDark ? 'text-[#64748b]' : 'text-olive/60';
  const valueColor = isDark ? 'text-[#e2e8f0]' : 'text-olive-dark';
  const subtextColor = isDark ? 'text-[#94a3b8]' : 'text-olive/70';
  const infoColor = isDark ? 'text-[#334155]' : 'text-olive/40';

  const Card = ({ label, value, subtext, subtextColorOverride, info, valueColorOverride }: {
    label: string;
    value: string;
    subtext?: string;
    subtextColorOverride?: string;
    info?: string;
    valueColorOverride?: string;
  }) => (
    <div className={`${cardBg} border ${cardBorder} rounded-[10px] p-4 flex flex-col gap-1`}>
      <span className={`text-[11px] ${labelColor} uppercase tracking-[0.05em]`}>{label}</span>
      {loading ? (
        <div className={`h-8 w-24 ${isDark ? 'bg-[#2d3148]' : 'bg-beige-200'} animate-pulse rounded mt-1`} />
      ) : (
        <>
          <span className={`text-[22px] font-medium ${valueColorOverride || valueColor}`}>{value}</span>
          {subtext && <span className={`text-[11px] ${subtextColorOverride || subtextColor}`}>{subtext}</span>}
          {info && <span className={`text-[10px] ${infoColor} italic mt-1`}>{info}</span>}
        </>
      )}
    </div>
  );

  return (
    <div className="relative">
      {isOffline && (
        <div className={`absolute top-0 left-0 right-0 border rounded-[8px] px-3 py-2 mb-2 text-[12px] flex items-center gap-2 ${
          isDark ? 'bg-[#450a0a] border-[#ef4444] text-[#f87171]' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Backend offline — showing mock data
        </div>
      )}
      <div className="grid grid-cols-4 gap-3">
        <Card
          label="Total spent"
          value={`${metrics?.total_spent_algo?.toFixed(3) || '0.000'} ALGO`}
          subtext={`${metrics?.remaining_algo?.toFixed(3) || '0.000'} ALGO remaining`}
          subtextColorOverride={isOffline ? (isDark ? "text-[#fb923c]" : "text-amber-600") : (isDark ? "text-[#22c55e]" : "text-green-600")}
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
          valueColorOverride={isDark ? "text-[#ef4444]" : "text-red-600"}
          subtext="blocked by contract"
          info="Smart contract enforcement"
        />
        <Card
          label="Escrow refunds"
          value={String(metrics?.escrow_refunds || 0)}
          valueColorOverride={isDark ? "text-[#fb923c]" : "text-amber-600"}
          subtext="API failed — auto refunded"
          info="Escrow contract protection"
        />
      </div>
    </div>
  );
}