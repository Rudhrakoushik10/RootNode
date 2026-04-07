import React from 'react';
import { usePolling } from '../hooks/usePolling';
import { getContractStatus } from '../api/client';

interface ContractStatusProps {
  isDark?: boolean;
}

interface ContractData {
  policy_contract: { app_id: number; status: string; blocks_count: number };
  escrow_contract: { app_id: number; status: string; refunds_count: number };
  receipt_anchor: { app_id: number; status: string; hashes_count: number };
  multisig_recovery: { app_id: number; status: string; activations: number };
}

const mockContracts: ContractData = {
  policy_contract: { app_id: 123, status: "active", blocks_count: 2 },
  escrow_contract: { app_id: 124, status: "active", refunds_count: 1 },
  receipt_anchor: { app_id: 125, status: "active", hashes_count: 7 },
  multisig_recovery: { app_id: 126, status: "standby", activations: 0 },
};

export default function ContractStatus({ isDark = false }: ContractStatusProps) {
  const { data: contracts } = usePolling(getContractStatus, 10000, mockContracts) as { data: ContractData | null };

  const cardBg = isDark ? 'bg-[#0f1117]' : 'bg-beige-50';
  const cardBorder = isDark ? 'border-[#2d3148]' : 'border-beige-200';
  const containerBg = isDark ? 'bg-[#1a1d27]' : 'bg-white';
  const containerBorder = isDark ? 'border-[#2d3148]' : 'border-beige-200';
  const headingText = isDark ? 'text-[#e2e8f0]' : 'text-olive-dark';
  const subText = isDark ? 'text-[#475569]' : 'text-olive/50';
  const descText = isDark ? 'text-[#64748b]' : 'text-olive/70';

  const ContractCard = ({ title, appId, description, status, statLabel, statValue, statColor }: {
    title: string;
    appId: number;
    description: string;
    status: string;
    statLabel: string;
    statValue: number;
    statColor?: string;
  }) => (
    <div className={`${cardBg} border ${cardBorder} rounded-[8px] p-4 flex flex-col gap-2`}>
      <div className="flex justify-between items-start">
        <div className={`px-1.5 py-0.5 rounded-[3px] text-[10px] font-medium ${
          isDark 
            ? (status === 'active' ? 'bg-[#14532d] text-[#22c55e]' : 'bg-[#1c1917] text-[#fb923c]')
            : (status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')
        }`}>
          {status.toUpperCase()}
        </div>
      </div>
      
      <div className="flex flex-col gap-1">
        <h4 className={`text-[12px] font-medium ${headingText}`}>{title}</h4>
        <span className={`text-[10px] font-mono ${subText}`}>App ID: {appId}</span>
      </div>

      <p className={`text-[11px] ${descText} leading-[1.5] mt-1`}>
        {description}
      </p>

      <div className="mt-auto pt-2 flex items-center gap-1.5">
        <span className={`text-[10px] ${statColor || subText}`}>{statValue} {statLabel}</span>
      </div>
    </div>
  );

  return (
    <div className={`${containerBg} border ${containerBorder} rounded-[10px] p-4 flex flex-col`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className={`text-[13px] font-medium ${headingText}`}>Algorand smart contracts</h3>
        <span className={`text-[11px] ${subText} italic`}>Final authority — always enforcing</span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <ContractCard
          title="Policy contract"
          appId={contracts?.policy_contract?.app_id || 123}
          status={contracts?.policy_contract?.status || "active"}
          description="Enforces max spend per call and whitelisted provider addresses. Rejects non-compliant transactions."
          statLabel="transactions blocked"
          statValue={contracts?.policy_contract?.blocks_count || 0}
          statColor={isDark ? "text-[#ef4444]" : "text-red-600"}
        />
        <ContractCard
          title="Escrow contract"
          appId={contracts?.escrow_contract?.app_id || 124}
          status={contracts?.escrow_contract?.status || "active"}
          description="Locks ALGO before API call. Releases to provider on success. Auto-refunds on API failure."
          statLabel="auto-refund issued"
          statValue={contracts?.escrow_contract?.refunds_count || 0}
          statColor={isDark ? "text-[#fb923c]" : "text-amber-600"}
        />
        <ContractCard
          title="Receipt anchor"
          appId={contracts?.receipt_anchor?.app_id || 125}
          status={contracts?.receipt_anchor?.status || "active"}
          description="Stores SHA-256 receipt hashes permanently on-chain. Immutable audit trail for every purchase."
          statLabel="hashes anchored"
          statValue={contracts?.receipt_anchor?.hashes_count || 0}
          statColor={isDark ? "text-[#3b82f6]" : "text-olive"}
        />
        <ContractCard
          title="Multisig recovery"
          appId={contracts?.multisig_recovery?.app_id || 126}
          status={contracts?.multisig_recovery?.status || "standby"}
          description="Emergency restart requires 2-of-3 trusted validator signatures. Activated only on system failure."
          statLabel="never activated"
          statValue={contracts?.multisig_recovery?.activations || 0}
          statColor={isDark ? "text-[#22c55e]" : "text-green-600"}
        />
      </div>

      <div className={`mt-3 rounded-[6px] px-3 py-2 ${
        isDark ? 'bg-[#0c1a35]' : 'bg-olive/5'
      }`}>
        <p className={`text-[11px] ${isDark ? 'text-[#3b82f6]' : 'text-olive'}`}>
          Smart contracts are always running on Algorand LocalNet — independent of all off-chain processes. Even if every server crashes, the contracts continue enforcing rules.
        </p>
      </div>
    </div>
  );
}