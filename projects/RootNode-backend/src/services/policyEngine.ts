import { validatePolicyOnChain, getPolicyStatus } from './contractService.js';
import { getBackendAccount } from './walletService.js';

export interface PolicyCheck {
  approved: boolean;
  max_per_call_algo: number;
  current_spent_algo: number;
  budget_algo: number;
  message?: string;
}

export async function validatePolicy(
  servicePrice: number,
  category: string
): Promise<PolicyCheck> {
  console.log('[Policy Engine] Validating:', { servicePrice, category });

  const servicePriceMicroAlgos = BigInt(Math.round(servicePrice * 1_000_000));

  try {
    const onChainResult = await validatePolicyOnChain(servicePriceMicroAlgos, category);
    
    if (!onChainResult.approved) {
      return {
        approved: false,
        max_per_call_algo: 0.00001,
        current_spent_algo: 0,
        budget_algo: 0.0005,
        message: onChainResult.message || 'Policy check failed - category not allowed or exceeded limits',
      };
    }

    return {
      approved: true,
      max_per_call_algo: 0.00001,
      current_spent_algo: 0,
      budget_algo: 0.0005,
      message: 'Policy check passed (on-chain validation)',
    };

  } catch (error) {
    console.warn('[Policy Engine] On-chain validation failed, falling back to local validation', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      approved: false,
      max_per_call_algo: 0.00001,
      current_spent_algo: 0,
      budget_algo: 0.0005,
      message: 'Could not connect to blockchain for policy validation',
    };
  }
}

export async function getPolicyStatusFromChain(): Promise<{
  maxPerCall: number;
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  rejections: number;
} | null> {
  try {
    const status = await getPolicyStatus();
    
    if (!status) {
      return null;
    }

    return {
      maxPerCall: Number(status.maxPerCall) / 1_000_000,
      totalBudget: Number(status.totalBudget) / 1_000_000,
      totalSpent: Number(status.totalSpent) / 1_000_000,
      remaining: Number(status.remaining) / 1_000_000,
      rejections: Number(status.rejections),
    };
  } catch (error) {
    console.error('[Policy Engine] Failed to get policy status from chain', { error });
    return null;
  }
}

export async function addCategory(category: string): Promise<boolean> {
  try {
    const { addCategoryToPolicy } = await import('./contractService.js');
    return await addCategoryToPolicy(category);
  } catch (error) {
    console.error('[Policy Engine] Failed to add category', { error });
    return false;
  }
}
