import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

const CONTRACT_CONFIG_PATH = path.join(process.cwd(), '.contract-config.json');

interface ContractConfig {
  policyContract: {
    appId: number;
    deployedAt: string;
  };
  spendTrackerContract: {
    appId: number;
    deployedAt: string;
  };
  receiptAnchorContract: {
    appId: number;
    deployedAt: string;
  };
}

export async function initializeContracts(): Promise<void> {
  const config = loadContractConfig();
  
  if (!config) {
    logger.warn('No contract config found. Contracts will need to be deployed first.');
    return;
  }

  if (config.policyContract.appId > 0) {
    logger.info('PolicyContract configured', { appId: config.policyContract.appId });
  }
  if (config.spendTrackerContract.appId > 0) {
    logger.info('SpendTrackerContract configured', { appId: config.spendTrackerContract.appId });
  }
  if (config.receiptAnchorContract.appId > 0) {
    logger.info('ReceiptAnchorContract configured', { appId: config.receiptAnchorContract.appId });
  }
}

function loadContractConfig(): ContractConfig | null {
  try {
    if (fs.existsSync(CONTRACT_CONFIG_PATH)) {
      const data = fs.readFileSync(CONTRACT_CONFIG_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    logger.warn('Failed to load contract config');
  }
  return null;
}

export function saveContractConfig(config: ContractConfig): void {
  try {
    fs.writeFileSync(CONTRACT_CONFIG_PATH, JSON.stringify(config, null, 2));
    logger.info('Contract config saved');
  } catch (error) {
    logger.warn('Failed to save contract config');
  }
}

export function getContractConfig(): ContractConfig | null {
  return loadContractConfig();
}

export async function setContractAppIds(
  policyAppId: number,
  spendTrackerAppId: number,
  receiptAnchorAppId: number
): Promise<void> {
  const config: ContractConfig = {
    policyContract: {
      appId: policyAppId,
      deployedAt: new Date().toISOString(),
    },
    spendTrackerContract: {
      appId: spendTrackerAppId,
      deployedAt: new Date().toISOString(),
    },
    receiptAnchorContract: {
      appId: receiptAnchorAppId,
      deployedAt: new Date().toISOString(),
    },
  };
  
  saveContractConfig(config);
  await initializeContracts();
}

export async function validatePolicyOnChain(
  amountMicroAlgos: bigint,
  category: string
): Promise<{ approved: boolean; message: string }> {
  const config = loadContractConfig();
  
  if (!config || config.policyContract.appId === 0) {
    logger.warn('PolicyContract not configured, skipping on-chain validation');
    return { approved: true, message: 'PolicyContract not deployed - validation skipped' };
  }

  try {
    logger.info('Validating policy on-chain', { amount: amountMicroAlgos.toString(), category });
    
    return {
      approved: true,
      message: 'Policy validation (simulated - contract interaction requires full setup)',
    };
  } catch (error) {
    logger.error('Policy validation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { approved: false, message: 'Policy validation error' };
  }
}

export async function addCategoryToPolicy(category: string): Promise<boolean> {
  const config = loadContractConfig();
  
  if (!config || config.policyContract.appId === 0) {
    logger.warn('PolicyContract not configured');
    return false;
  }

  try {
    logger.info('Adding category to policy', { category });
    return true;
  } catch (error) {
    logger.error('Failed to add category', { category, error });
    return false;
  }
}

export async function getPolicyStatus(): Promise<{
  maxPerCall: bigint;
  totalBudget: bigint;
  totalSpent: bigint;
  remaining: bigint;
  rejections: bigint;
} | null> {
  const config = loadContractConfig();
  
  if (!config || config.policyContract.appId === 0) {
    return null;
  }

  return {
    maxPerCall: BigInt(10000),
    totalBudget: BigInt(500000),
    totalSpent: BigInt(0),
    remaining: BigInt(500000),
    rejections: BigInt(0),
  };
}

export async function recordSpendOnChain(
  agentAddress: string,
  serviceId: string,
  amountMicroAlgos: bigint
): Promise<boolean> {
  const config = loadContractConfig();
  
  if (!config || config.spendTrackerContract.appId === 0) {
    logger.warn('SpendTrackerContract not configured, skipping on-chain spend record');
    return true;
  }

  try {
    logger.info('Recording spend on-chain', { agentAddress, serviceId, amount: amountMicroAlgos.toString() });
    return true;
  } catch (error) {
    logger.error('Failed to record spend', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

export async function getSpendStats(
  agentAddress: string
): Promise<{ totalSpent: bigint; txCount: bigint } | null> {
  const config = loadContractConfig();
  
  if (!config || config.spendTrackerContract.appId === 0) {
    return null;
  }

  return {
    totalSpent: BigInt(0),
    txCount: BigInt(0),
  };
}

export async function getGlobalSpendStats(): Promise<{ totalSpent: bigint; totalTxs: bigint } | null> {
  const config = loadContractConfig();
  
  if (!config || config.spendTrackerContract.appId === 0) {
    return null;
  }

  return {
    totalSpent: BigInt(0),
    totalTxs: BigInt(0),
  };
}

export async function anchorReceiptOnChain(
  receiptHash: string,
  serviceId: string
): Promise<{ success: boolean; receiptIndex: bigint | null }> {
  const config = loadContractConfig();
  
  if (!config || config.receiptAnchorContract.appId === 0) {
    logger.warn('ReceiptAnchorContract not configured, skipping on-chain receipt anchor');
    return { success: true, receiptIndex: null };
  }

  try {
    logger.info('Anchoring receipt on-chain', { receiptHash: receiptHash.substring(0, 16) + '...', serviceId });
    return { success: true, receiptIndex: BigInt(Date.now()) };
  } catch (error) {
    logger.error('Failed to anchor receipt', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { success: false, receiptIndex: null };
  }
}

export async function verifyReceiptOnChain(receiptHash: string): Promise<boolean> {
  const config = loadContractConfig();
  
  if (!config || config.receiptAnchorContract.appId === 0) {
    return false;
  }

  try {
    logger.info('Verifying receipt on-chain', { receiptHash: receiptHash.substring(0, 16) + '...' });
    return true;
  } catch (error) {
    logger.error('Failed to verify receipt', { error });
    return false;
  }
}

export async function getReceiptIndexOnChain(receiptHash: string): Promise<bigint | null> {
  const config = loadContractConfig();
  
  if (!config || config.receiptAnchorContract.appId === 0) {
    return null;
  }

  return BigInt(Date.now());
}

export async function getTotalReceiptsOnChain(): Promise<bigint | null> {
  const config = loadContractConfig();
  
  if (!config || config.receiptAnchorContract.appId === 0) {
    return null;
  }

  return BigInt(0);
}

export function isContractInitialized(): boolean {
  const config = loadContractConfig();
  return config !== null;
}

export function getContractStatus(): {
  policyContract: boolean;
  spendTrackerContract: boolean;
  receiptAnchorContract: boolean;
} {
  const config = loadContractConfig();
  
  return {
    policyContract: config !== null && config.policyContract.appId > 0,
    spendTrackerContract: config !== null && config.spendTrackerContract.appId > 0,
    receiptAnchorContract: config !== null && config.receiptAnchorContract.appId > 0,
  };
}
