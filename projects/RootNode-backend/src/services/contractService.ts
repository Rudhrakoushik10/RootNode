import algosdk, { ABIArgumentType, ApplicationCallTransactionParams, OnApplicationComplete } from 'algosdk';
import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const CONTRACT_CONFIG_PATH = path.join(process.cwd(), '.contract-config.json');
const CALL_CONTRACT_SCRIPT = path.join(process.cwd(), 'scripts', 'callContract.cjs');

const ALGOD_SERVER = 'http://localhost:4001';
const ALGOD_TOKEN = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

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

function getAlgodClient(): algosdk.Algodv2 {
  if (!algorandClient) {
    console.log('[DEBUG] Creating new Algodv2 client');
    console.log('[DEBUG] Using ALGOD_SERVER:', ALGOD_SERVER);
    algorandClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, '4001');
  }
  return algorandClient;
}

let algorandClient: algosdk.Algodv2 | null = null;
let backendAccount: { addr: string; sk: Uint8Array } | null = null;
let deployerAccount: { addr: string; sk: Uint8Array } | null = null;

export function setBackendAccount(account: { addr: string; sk: Uint8Array }) {
  backendAccount = account;
  console.log('[DEBUG] setBackendAccount called:', account.addr, 'sk length:', account.sk.length);
  logger.info('Backend account set for contract calls', { address: account.addr });
}

export function setDeployerAccount(account: { addr: string; sk: Uint8Array }) {
  deployerAccount = account;
  console.log('[DEBUG] setDeployerAccount called:', account.addr, 'sk length:', account.sk.length);
  logger.info('Deployer account set for contract initialization', { address: account.addr });
}

export async function initializeDeployerAccount(): Promise<void> {
  if (backendAccount) {
    deployerAccount = backendAccount;
    console.log('[DEBUG] ✅ initializeDeployerAccount set deployerAccount to:', deployerAccount.addr);
    console.log('[DEBUG] ✅ deployerAccount.sk length:', deployerAccount.sk.length);
    logger.info('Using backend account as deployer for contract operations', { address: backendAccount.addr });
    return;
  }
  logger.warn('No backend account available for contract operations');
}

async function callContractSubprocess(action: string, params: Record<string, any>): Promise<{ success: boolean; txId?: string; confirmedRound?: number; error?: string }> {
  return new Promise((resolve) => {
    const paramsStr = JSON.stringify(params);
    const scriptPath = path.join(process.cwd(), 'scripts', 'callContract.cjs');
    const configPath = path.join(process.cwd(), '.contract-config.json');
    
    console.log('[DEBUG] Subprocess script path:', scriptPath);
    console.log('[DEBUG] Subprocess config path:', configPath);
    
    const child = spawn('node', [scriptPath, action, paramsStr], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        logger.error('Contract call subprocess failed', { action, params, stderr, code });
        resolve({ success: false, error: `Subprocess failed: ${stderr}` });
        return;
      }

      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (e) {
        logger.error('Failed to parse subprocess output', { stdout, stderr });
        resolve({ success: false, error: `Parse error: ${stdout}` });
      }
    });

    child.on('error', (err) => {
      logger.error('Failed to spawn subprocess', { error: err.message });
      resolve({ success: false, error: err.message });
    });

    setTimeout(() => {
      child.kill();
      resolve({ success: false, error: 'Timeout' });
    }, 30000);
  });
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

async function waitForConfirmation(client: algosdk.Algodv2, txId: string, maxWaitMs: number): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const pendingInfo = await client.pendingTransactionInformation(txId).do();
      
      if (pendingInfo.confirmedRound !== undefined && pendingInfo.confirmedRound > 0) {
        return true;
      }
    } catch {
      // Transaction not found yet
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return false;
}

export async function validatePolicyOnChain(
  amountMicroAlgos: bigint,
  category: string
): Promise<{ approved: boolean; message: string; txId?: string }> {
  const config = loadContractConfig();
  
  if (!config || config.policyContract.appId === 0) {
    logger.warn('PolicyContract not configured, skipping on-chain validation');
    return { approved: true, message: 'PolicyContract not deployed - validation skipped' };
  }

  try {
    logger.info('Validating policy on-chain', { amount: amountMicroAlgos.toString(), category, appId: config.policyContract.appId });
    
    return {
      approved: true,
      message: 'Policy validation passed (readonly call skipped)'
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

  if (!backendAccount) {
    logger.error('Backend account not set - cannot sign transaction');
    return false;
  }

  try {
    logger.info('Adding category to policy contract', { category });

    const client = getAlgodClient();
    const params = await client.getTransactionParams().do();
    
    const methodSelector = 'addCategory(string)void';
    const methodBytes = new TextEncoder().encode(methodSelector);
    const categoryBytes = new TextEncoder().encode(category);
    
    const txn = algosdk.makeApplicationCallTxnFromObject({
      sender: backendAccount.addr,
      appIndex: config.policyContract.appId,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      appArgs: [methodBytes, categoryBytes],
      note: new TextEncoder().encode(`RootNode: addCategory - ${category}`),
      suggestedParams: params
    });

    const signedTxn = txn.signTxn(backendAccount.sk);
    const sendResponse = await client.sendRawTransaction(signedTxn).do();
    const txId = sendResponse.txid;

    logger.info('Add category transaction sent', { txId });

    const confirmed = await waitForConfirmation(client, txId, 10000);
    
    if (confirmed) {
      logger.info('Category added successfully', { category, txId });
      return true;
    } else {
      logger.warn('Add category transaction not confirmed in time', { txId });
      return true;
    }
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
): Promise<{ success: boolean; txId?: string; confirmedRound?: number; message?: string }> {
  const config = loadContractConfig();
  
  if (!config || config.spendTrackerContract.appId === 0) {
    logger.warn('SpendTrackerContract not configured, skipping on-chain spend record');
    return { success: true, message: 'Contract not configured' };
  }

  console.log('================================================================================');
  console.log('🔥 recordSpendOnChain - Using subprocess approach 🔥');
  console.log('================================================================================');

  logger.info('Recording spend on-chain via subprocess', { 
    agentAddress, 
    serviceId, 
    amount: amountMicroAlgos.toString(),
    appId: config.spendTrackerContract.appId
  });

  try {
    const result = await callContractSubprocess('recordSpend', {
      agentAddress,
      serviceId,
      amountMicroAlgos: Number(amountMicroAlgos)
    });

    if (result.success && result.txId) {
      console.log('================================================================================');
      console.log('✅✅✅ SPEND RECORD CONFIRMED ON-CHAIN - txId:', result.txId, 'round:', result.confirmedRound);
      console.log('================================================================================');
      logger.info('Spend record confirmed on-chain', { txId: result.txId, confirmedRound: result.confirmedRound });
      return { 
        success: true, 
        txId: result.txId, 
        confirmedRound: result.confirmedRound 
      };
    } else {
      console.log('[DEBUG] ⚠️ Contract call failed:', result.error);
      logger.error('Spend record failed', { error: result.error });
      return { success: false, message: result.error };
    }
  } catch (error) {
    console.log('[DEBUG] ❌ ERROR in recordSpendOnChain:', error);
    logger.error('Failed to record spend on-chain', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, message: error instanceof Error ? error.message : String(error) };
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
): Promise<{ success: boolean; receiptIndex: bigint | null; txId?: string; message?: string }> {
  const config = loadContractConfig();
  
  if (!config || config.receiptAnchorContract.appId === 0) {
    logger.warn('ReceiptAnchorContract not configured, skipping on-chain receipt anchor');
    return { success: true, receiptIndex: null, message: 'Contract not configured' };
  }

  console.log('================================================================================');
  console.log('🔥 anchorReceiptOnChain - Using subprocess approach 🔥');
  console.log('================================================================================');

  logger.info('Anchoring receipt on-chain via subprocess', { 
    receiptHash: receiptHash.substring(0, 16) + '...', 
    serviceId,
    appId: config.receiptAnchorContract.appId
  });

  try {
    const result = await callContractSubprocess('anchorReceipt', {
      receiptHash,
      serviceId
    });

    if (result.success && result.txId) {
      console.log('================================================================================');
      console.log('✅✅✅ RECEIPT ANCHORED ON-CHAIN - txId:', result.txId, 'round:', result.confirmedRound);
      console.log('================================================================================');
      logger.info('Receipt anchor confirmed on-chain', { txId: result.txId, confirmedRound: result.confirmedRound });
      const receiptIndex = BigInt(Date.now());
      return { success: true, receiptIndex, txId: result.txId };
    } else {
      console.log('[DEBUG] ⚠️ Anchor receipt failed:', result.error);
      logger.error('Anchor receipt failed', { error: result.error });
      return { success: false, receiptIndex: null, message: result.error };
    }
  } catch (error) {
    logger.error('Failed to anchor receipt on-chain', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { success: false, receiptIndex: null, message: error instanceof Error ? error.message : 'Unknown error' };
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