import React from 'react';

export default function TopBar({ agentStatus = 'running' }) {
  const getStatusConfig = () => {
    switch (agentStatus) {
      case 'paused':
        return { color: '#f59e0b', text: 'Agent paused' };
      case 'safe_mode':
        return { color: '#ef4444', text: 'Safe mode active' };
      default:
        return { color: '#22c55e', text: 'Agent running' };
    }
  };

  const status = getStatusConfig();

  return (
    <div className="h-[52px] bg-[#1a1d27] border-b border-[#2d3148] flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex flex-col">
        <span className="text-[15px] font-medium text-[#e2e8f0]">Agentic Service Buyer</span>
        <span className="text-[11px] text-[#64748b]">Algorand LocalNet</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full animate-pulse-slow" 
            style={{ backgroundColor: status.color }}
          />
          <span className="text-[12px] text-[#94a3b8]">{status.text}</span>
        </div>

        <div className="bg-[#1e293b] text-[#64748b] border border-[#334155] rounded-[4px] px-2 py-0.5 text-[11px] font-medium">
          LocalNet
        </div>

        <div className="bg-[#0c1a35] text-[#3b82f6] border border-[#1d4ed8] rounded-[4px] px-2 py-0.5 text-[11px] font-medium">
          4 contracts active
        </div>
      </div>
    </div>
  );
}