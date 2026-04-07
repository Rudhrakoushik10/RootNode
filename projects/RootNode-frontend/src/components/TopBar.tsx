import React from 'react';
import ThemeToggle from './ThemeToggle';

interface TopBarProps {
  agentStatus?: string;
  isDark?: boolean;
  onThemeToggle?: () => void;
}

export default function TopBar({ agentStatus = 'running', isDark = false, onThemeToggle }: TopBarProps) {
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
    <div className={`
      h-[52px] border-b flex items-center justify-between px-6 sticky top-0 z-50 theme-transition
      ${isDark ? 'bg-[#1a1d27] border-[#2d3148]' : 'bg-white border-beige-200'}
    `}>
      <div className="flex flex-col">
        <span className={`text-[15px] font-medium ${isDark ? 'text-[#e2e8f0]' : 'text-olive-dark'}`}>
          Agentic Service Buyer
        </span>
        <span className={`text-[11px] ${isDark ? 'text-[#64748b]' : 'text-olive/70'}`}>
          Algorand LocalNet
        </span>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle isDark={isDark} onToggle={onThemeToggle || (() => {})} />
        
        <div className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full animate-pulse-slow" 
            style={{ backgroundColor: status.color }}
          />
          <span className={`text-[12px] ${isDark ? 'text-[#94a3b8]' : 'text-olive/70'}`}>
            {status.text}
          </span>
        </div>

        <div className={`
          border rounded-[4px] px-2 py-0.5 text-[11px] font-medium
          ${isDark ? 'bg-[#1e293b] text-[#64748b] border-[#334155]' : 'bg-beige-100 text-olive border-beige-200'}
        `}>
          LocalNet
        </div>

        <div className={`
          border rounded-[4px] px-2 py-0.5 text-[11px] font-medium
          ${isDark ? 'bg-[#0c1a35] text-[#3b82f6] border-[#1d4ed8]' : 'bg-olive/10 text-olive border-olive/30'}
        `}>
          4 contracts active
        </div>
      </div>
    </div>
  );
}