import React from 'react';
import { usePolling } from '../hooks/usePolling';
import { getContractStatus } from '../api/client';

interface ContractStatus {
  policy_contract: { app_id: number; status: string; blocks_count: number };
  escrow_contract: { app_id: number; status: string; refunds_count: number };
  receipt_anchor: { app_id: number; status: string; hashes_count: number };
  multisig_recovery: { app_id: number; status: string; activations: number };
}

const mockContracts: ContractStatus = {
  policy_contract: { app_id: 123, status: "active", blocks_count: 2 },
  escrow_contract: { app_id: 124, status: "active", refunds_count: 1 },
  receipt_anchor: { app_id: 125, status: "active", hashes_count: 7 },
  multisig_recovery: { app_id: 126, status: "standby", activations: 0 },
};

export default function ContractStatus() {
  const { data: contracts } = usePolling(getContractStatus, 10000, mockContracts) as { data: ContractStatus | null };

  const ContractCard = ({ title, appId, description, status, statLabel, statValue, statColor }: {
    title: string;
    appId: number;
    description: string;
    status: string;
    statLabel: string;
    statValue: number;
    statColor?: string;
  }) => (
    <div className="bg-[#0f1117] border border-[#2d3148] rounded-[8px] p-4 flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <div className={`px-1.5 py-0.5 rounded-[3px] text-[10px] font-medium ${
          status === 'active' ? 'bg-[#14532d] text-[#22c55e]' : 'bg-[#1c1917] text-[#fb923c]'
        }`}>
          {status.toUpperCase()}
        </div>
      </div>
      
      <div className="flex flex-col gap-1">
        <h4 className="text-[12px] font-medium text-[#e2e8f0]">{title}</h4>
        <span className="text-[10px] font-mono text-[#475569]">App ID: {appId}</span>
      </div>

      <p className="text-[11px] text-[#64748b] leading-[1.5] mt-1">
        {description}
      </p>

      <div className="mt-auto pt-2 flex items-center gap-1.5">
        <span className={`text-[10px] ${statColor || 'text-[#475569]'}`}>{statValue} {statLabel}</span>
      </div>
    </div>
  );

  return (
    <div className="bg-[#1a1d27] border border-[#2d3148] rounded-[10px] p-4 flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-[13px] font-medium text-[#e2e8f0]">Algorand smart contracts</h3>
        <span className="text-[11px] text-[#475569] italic">Final authority — always enforcing</span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <ContractCard
          title="Policy contract"
          appId={contracts?.policy_contract?.app_id || 123}
          status={contracts?.policy_contract?.status || "active"}
          description="Enforces max spend per call and whitelisted provider addresses. Rejects non-compliant transactions."
          statLabel="transactions blocked"
          statValue={contracts?.policy_contract?.blocks_count || 0}
          statColor="text-[#ef4444]"
        />
        <ContractCard
          title="Escrow contract"
          appId={contracts?.escrow_contract?.app_id || 124}
          status={contracts?.escrow_contract?.status || "active"}
          description="Locks ALGO before API call. Releases to provider on success. Auto-refunds on API failure."
          statLabel="auto-refund issued"
          statValue={contracts?.escrow_contract?.refunds_count || 0}
          statColor="text-[#fb923c]"
        />
        <ContractCard
          title="Receipt anchor"
          appId={contracts?.receipt_anchor?.app_id || 125}
          status={contracts?.receipt_anchor?.status || "active"}
          description="Stores SHA-256 receipt hashes permanently on-chain. Immutable audit trail for every purchase."
          statLabel="hashes anchored"
          statValue={contracts?.receipt_anchor?.hashes_count || 0}
          statColor="text-[#3b82f6]"
        />
        <ContractCard
          title="Multisig recovery"
          appId={contracts?.multisig_recovery?.app_id || 126}
          status={contracts?.multisig_recovery?.status || "standby"}
          description="Emergency restart requires 2-of-3 trusted validator signatures. Activated only on system failure."
          statLabel="never activated"
          statValue={contracts?.multisig_recovery?.activations || 0}
          statColor="text-[#22c55e]"
        />
      </div>

      <div className="mt-3 bg-[#0c1a35] rounded-[6px] px-3 py-2">
        <p className="text-[11px] text-[#3b82f6]">
          Smart contracts are always running on Algorand LocalNet — independent of all off-chain processes. Even if every server crashes, the contracts continue enforcing rules.
        </p>
      </div>
    </div>
  );
}
