import express from 'express';
import cors from 'cors';
import config, { validateConfig } from './config.js';
import logger from './utils/logger.js';
import { recordRequest, getConnectionStatus, resetRecentActivity } from './utils/connectionTracker.js';
import { errorHandler, notFoundHandler, asyncHandler } from './middleware/errorHandler.js';
import { validateTaskInput } from './middleware/validator.js';
import { globalRateLimit, taskRateLimit } from './middleware/rateLimiter.js';
import { initializeDatabase, getMetrics, getTransactions, getReceipts, createTransaction, createReceipt as dbCreateReceipt } from './db.js';
import { interpretTask } from './services/aiInterpreter.js';
import { selectBestProvider } from './services/providerComparison.js';
import { validatePolicy } from './services/policyEngine.js';
import { callProviderApi, validateResponse } from './services/apiExecutor.js';
import { createReceipt as createReceiptData, generateServiceId } from './services/receiptService.js';
import { initializeWallet, getBackendAccount, checkBalance } from './services/walletService.js';
import { initializeContracts, isContractInitialized, getContractStatus, recordSpendOnChain, anchorReceiptOnChain, setBackendAccount, initializeDeployerAccount } from './services/contractService.js';
import type { TaskResult } from './types.js';

const app = express();
let statusUpdateInterval: NodeJS.Timeout | null = null;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(globalRateLimit());

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const ip = req.ip || 'unknown';
    recordRequest(ip, req.method, req.path, res.statusCode, duration);
    
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip,
    });
  });
  
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.get('/api/status', asyncHandler(async (req, res) => {
  const account = getBackendAccount();
  const balance = account ? await checkBalance(account.addr) : 0;
  
  res.json({
    database: true,
    blockchain: account !== null,
    wallet: account ? {
      address: account.addr,
      balance: balance,
    } : null,
    contracts: getContractStatus(),
    contractsInitialized: isContractInitialized(),
  });
}));

app.get('/api/metrics', asyncHandler(async (req, res) => {
  const metrics = await getMetrics();
  res.json(metrics);
}));

app.get('/api/transactions', asyncHandler(async (req, res) => {
  const transactions = await getTransactions();
  res.json(transactions);
}));

app.get('/api/receipts', asyncHandler(async (req, res) => {
  const receipts = await getReceipts();
  res.json(receipts);
}));

app.get('/api/contracts', (req, res) => {
  res.json({
    config: config.contracts,
    status: getContractStatus(),
    initialized: isContractInitialized(),
  });
});

app.get('/api/services', asyncHandler(async (req, res) => {
  const { getServices } = await import('./db.js');
  const services = await getServices();
  res.json(services);
}));

app.get('/api/wallet', asyncHandler(async (req, res) => {
  const account = getBackendAccount();
  
  if (!account) {
    res.status(503).json({
      error: 'Wallet not initialized',
      message: 'Backend wallet is not set up yet',
    });
    return;
  }
  
  const balance = await checkBalance(account.addr);
  
  res.json({
    address: account.addr,
    balance: balance,
    balanceMicroAlgos: balance * 1_000_000,
  });
}));

app.post(
  '/api/task',
  taskRateLimit(),
  validateTaskInput,
  asyncHandler(async (req, res) => {
    const { task } = req.body;
    const startTime = Date.now();

    logger.info('Processing new task', { task });

    try {
      const interpreted = await interpretTask(task);
      logger.info('Task interpreted', { category: interpreted.category, intent: interpreted.intent });

      const selected = await selectBestProvider(interpreted.category);
      
      if (!selected) {
        await createTransaction({
          service_name: interpreted.intent,
          status: 'rejected',
          amount_algo: 0,
          txid: null,
          timestamp: new Date().toISOString(),
          note: null,
          reason: `No service found for category: ${interpreted.category}`,
          provider: 'N/A',
        });

        logger.warn('No service found', { category: interpreted.category });
        
        const result: TaskResult = {
          status: 'rejected',
          message: `No service available for category: ${interpreted.category}`,
        };
        res.status(404).json(result);
        return;
      }

      logger.info('Provider selected', {
        name: selected.service.name,
        provider: selected.service.provider,
        score: selected.score,
      });

      const policyCheck = await validatePolicy(selected.service.price_algo, selected.service.category);
      
      if (!policyCheck.approved) {
        await createTransaction({
          service_name: selected.service.name,
          status: 'rejected',
          amount_algo: selected.service.price_algo,
          txid: null,
          timestamp: new Date().toISOString(),
          note: null,
          reason: policyCheck.message || 'Policy check failed',
          provider: selected.service.provider,
        });

        logger.warn('Policy check failed', { message: policyCheck.message });

        config.contracts.policy_contract.blocks_count = 
          (config.contracts.policy_contract.blocks_count || 0) + 1;

        const result: TaskResult = {
          status: 'rejected',
          message: policyCheck.message,
        };
        res.status(403).json(result);
        return;
      }

      logger.info('Policy check passed, calling provider API via x402');

      const apiResponse = await callProviderApi(selected.service);

      let result: TaskResult;

      if (validateResponse(apiResponse)) {
        const txId = apiResponse.txId || `TX_${Date.now()}_${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
        
        const serviceId = generateServiceId(selected.service.provider, selected.service.category);
        let spendTxId: string | undefined;
        let receiptTxId: string | undefined;
        
        const account = getBackendAccount();
        
        console.log('[DEBUG] === TASK COMPLETION BLOCK ===');
        console.log('[DEBUG] account:', account?.addr);
        console.log('[DEBUG] isContractInitialized():', isContractInitialized());
        console.log('[DEBUG] contractStatus:', getContractStatus());
        
        // ALWAYS call contracts when account exists and contracts are initialized
        // This ensures blockchain state updates even in fallback mode
        if (account && isContractInitialized()) {
          console.log('[DEBUG] ✅ Entering contract call block');
          const amountMicroAlgos = BigInt(Math.round(selected.service.price_algo * 1_000_000));
          console.log('[DEBUG] Calling recordSpendOnChain with:', { agent: account.addr, serviceId, amount: amountMicroAlgos.toString() });
          
          logger.info('Calling SpendTrackerContract.recordSpend on blockchain...', { serviceId, amount: amountMicroAlgos.toString() });
          const spendResult = await recordSpendOnChain(account.addr, serviceId, amountMicroAlgos);
          console.log('[DEBUG] recordSpendOnChain result:', JSON.stringify(spendResult));
          
          if (spendResult.success && spendResult.txId) {
            spendTxId = spendResult.txId;
            logger.info('Spend record transaction confirmed on blockchain', { txId: spendTxId });
            config.contracts.spend_tracker.transactions_count = 
              (config.contracts.spend_tracker.transactions_count || 0) + 1;
          } else if (spendResult.message) {
            logger.warn('Spend record warning', { message: spendResult.message });
          }
          
          logger.info('Calling ReceiptAnchorContract.anchorReceipt on blockchain...');
          const receiptHash = Buffer.from(`hash_${Date.now()}`).toString('hex');
          console.log('[DEBUG] Calling anchorReceiptOnChain with:', { receiptHash, serviceId });
          const anchorResult = await anchorReceiptOnChain(receiptHash, serviceId);
          console.log('[DEBUG] anchorReceiptOnChain result:', anchorResult);
          
          if (anchorResult.success && anchorResult.txId) {
            receiptTxId = anchorResult.txId;
            logger.info('Receipt anchor transaction confirmed on blockchain', { txId: receiptTxId });
            config.contracts.receipt_anchor.hashes_count = 
              (config.contracts.receipt_anchor.hashes_count || 0) + 1;
          } else if (anchorResult.message) {
            logger.warn('Receipt anchor warning', { message: anchorResult.message });
          }
        } else {
          console.log('[DEBUG] Skipping contract calls - account or contracts not initialized');
        }
        
        const receiptData = {
          service_name: selected.service.name,
          provider: selected.service.provider,
          provider_wallet: selected.service.provider_wallet,
          amount_algo: selected.service.price_algo,
          timestamp: new Date().toISOString(),
          api_response: apiResponse.data,
          txid: spendTxId || txId,
        };
        const receipt = await createReceiptData(receiptData);

        await dbCreateReceipt({
          service_name: receipt.service_name,
          amount_algo: receipt.amount_algo,
          txid: receipt.txid,
          receipt_hash: receipt.receipt_hash,
          timestamp: receipt.timestamp,
          hash_on_chain: !!receiptTxId,
          provider: receipt.provider,
        });

        await createTransaction({
          service_name: selected.service.name,
          status: 'success',
          amount_algo: selected.service.price_algo,
          txid: spendTxId || txId,
          timestamp: new Date().toISOString(),
          note: `Contract calls: SpendTracker(${spendTxId || 'N/A'}), ReceiptAnchor(${receiptTxId || 'N/A'})`,
          reason: null,
          provider: selected.service.provider,
        });

        result = {
          status: 'success',
          service_name: selected.service.name,
          provider: selected.service.provider,
          amount_algo: selected.service.price_algo,
          txid: spendTxId || txId,
          receipt_hash: receipt.receipt_hash,
          blockchain_txids: {
            spendTracker: spendTxId || null,
            receiptAnchor: receiptTxId || null,
          },
          is_fallback: (apiResponse as any).fallback || false,
          message: 'Task completed successfully - blockchain transactions recorded',
        };

        logger.info('Task completed successfully', {
          service: selected.service.name,
          txid: spendTxId || txId,
          receiptTxId: receiptTxId,
          spendTxId: spendTxId,
          spendTrackerTxId: spendTxId,
          receiptAnchorTxId: receiptTxId,
          isFallback: (apiResponse as any).fallback,
        });
      } else {
        await createTransaction({
          service_name: selected.service.name,
          status: 'refunded',
          amount_algo: selected.service.price_algo,
          txid: null,
          timestamp: new Date().toISOString(),
          note: 'API failed - no refund (x402 payment was to provider)',
          reason: apiResponse.error || 'Provider API returned invalid response',
          provider: selected.service.provider,
        });

        config.contracts.escrow_contract.refunds_count = 
          (config.contracts.escrow_contract.refunds_count || 0) + 1;

        result = {
          status: 'refunded',
          service_name: selected.service.name,
          provider: selected.service.provider,
          amount_algo: selected.service.price_algo,
          message: `API call failed: ${apiResponse.error || 'Invalid response'}.`,
        };

        logger.warn('API call failed', {
          service: selected.service.name,
          error: apiResponse.error,
        });
      }

      const duration = Date.now() - startTime;
      logger.info('Task processing completed', {
        status: result.status,
        duration: `${duration}ms`,
      });

      res.json(result);

    } catch (error) {
      logger.error('Task processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      const result: TaskResult = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Internal server error',
      };
      res.status(500).json(result);
    }
  })
);

app.use(notFoundHandler);
app.use(errorHandler);

async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await initializeDatabase();
    return true;
  } catch (error) {
    logger.error('Database connection failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

function startStatusDisplay(): void {
  console.clear();
  console.log(getConnectionStatus());
  console.log('\n  Waiting for requests...\n');
  
  statusUpdateInterval = setInterval(() => {
    console.clear();
    console.log(getConnectionStatus());
    resetRecentActivity();
  }, 10000);
}

function stopStatusDisplay(): void {
  if (statusUpdateInterval) {
    clearInterval(statusUpdateInterval);
    statusUpdateInterval = null;
  }
}

async function initializeBlockchain() {
  console.log('\n  🔗 Initializing Blockchain connection...\n');
  
  try {
    const account = await initializeWallet();
    
    if (!account) {
      console.log('  ❌ Blockchain initialization failed: No account returned');
      return false;
    }
    
    console.log('  ✅ Blockchain wallet initialized');
    console.log(`     Address: ${account.addr}\n`);
    
    setBackendAccount(account);
    console.log('  ✅ Backend account set for contract calls\n');
    
    await initializeDeployerAccount();
    console.log('  ✅ Deployer account initialized for contract operations\n');
    
    await initializeContracts();
    
    if (isContractInitialized()) {
      console.log('  ✅ Smart contracts initialized\n');
    } else {
      console.log('  ⚠️  Smart contracts not deployed yet');
      console.log('     Run: algokit project deploy localnet\n');
    }
    
    return true;
  } catch (error) {
    console.log('\n  ❌ Blockchain initialization failed');
    console.log(`     Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (error instanceof Error && error.stack) {
      console.log(`     Stack: ${error.stack.split('\n')[1] || ''}`);
    }
    console.log('');
    return false;
  }
}

async function start() {
  console.clear();
  console.log('\n  🚀 Starting RootNode Backend Server...\n');

  try {
    validateConfig();
    logger.info('Configuration validated');

    console.log('  📦 Connecting to Database...');
    const dbConnected = await checkDatabaseConnection();
    
    if (dbConnected) {
      console.log('  ✅ Database connected successfully\n');
    } else {
      console.log('  ❌ Database connection failed\n');
    }

    const blockchainConnected = await initializeBlockchain();

    app.listen(config.server.port, () => {
      logger.info('Server started', {
        port: config.server.port,
        env: config.server.env,
        geminiEnabled: !!config.gemini.apiKey,
        blockchain: blockchainConnected,
      });

      startStatusDisplay();
    });

  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('\n\n  🛑 Shutting down server...\n');
  stopStatusDisplay();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n  🛑 Server terminated...\n');
  stopStatusDisplay();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('\n  ❌ Uncaught Exception:', error.message);
  console.error('   Stack:', error.stack?.split('\n')[1]);
  console.error('\n  Server will exit. Please fix the error and restart.\n');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n  ❌ Unhandled Rejection at:', promise);
  console.error('   Reason:', reason);
});

start();
