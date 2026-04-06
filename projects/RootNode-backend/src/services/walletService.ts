import 'dotenv/config';
import algosdk from 'algosdk';
import fs from 'fs';
import path from 'path';

const WALLET_CONFIG_PATH = path.join(process.cwd(), '.wallet-config.json');

interface WalletConfig {
  address: string;
  mnemonic?: string;
  createdAt: string;
}

interface BackendAccount {
  addr: string;
  sk: Uint8Array;
}

let backendAccount: BackendAccount | null = null;

const ALGOD_SERVER = 'http://localhost:4001';
const KMD_SERVER = 'http://localhost:4002';

function log(...args: any[]) {
  console.log('[WALLET]', new Date().toISOString(), ...args);
}

export async function initializeWallet(): Promise<BackendAccount> {
  if (backendAccount) {
    log('Using cached account:', backendAccount.addr);
    return backendAccount;
  }

  log('=== Starting Wallet Initialization ===');
  log('Current working directory:', process.cwd());
  log('Wallet config path:', WALLET_CONFIG_PATH);
  log('Algod server:', ALGOD_SERVER);
  log('Algod token from env:', process.env.ALGOD_TOKEN ? 'SET (' + process.env.ALGOD_TOKEN.substring(0, 10) + '...)' : 'NOT SET');
  log('KMD token from env:', process.env.KMD_TOKEN ? 'SET' : 'NOT SET');

  // Test Algod connection first
  log('Testing Algod connection...');
  try {
    const testClient = new algosdk.Algodv2(
      process.env.ALGOD_TOKEN || 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      ALGOD_SERVER,
      '4001'
    );
    const status = await testClient.status().do();
    log('Algod connection SUCCESS! Round:', status.lastRound.toString());
  } catch (error: any) {
    log('Algod connection FAILED:', error.message);
    throw new Error('Cannot connect to Algod: ' + error.message);
  }

  // Try to load from saved config with mnemonic
  log('=== Step 1: Load from wallet config ===');
  const savedConfig = getWalletConfig();
  
  if (savedConfig) {
    log('Config file exists');
    if (savedConfig.mnemonic) {
      log('Config has mnemonic, trying to recover...');
      try {
        const account = algosdk.mnemonicToSecretKey(savedConfig.mnemonic);
        const address = typeof account.addr === 'string' ? account.addr : account.addr.toString();
        backendAccount = {
          addr: address,
          sk: account.sk,
        };
        log('Wallet recovered successfully!');
        log('Recovered address:', backendAccount.addr);
        log('Config address:', savedConfig.address);
        log('Match:', backendAccount.addr === savedConfig.address ? 'YES' : 'NO - Config may be outdated');
      } catch (error: any) {
        log('Failed to recover from mnemonic:', error.message);
        log('This is expected if mnemonic is invalid');
      }
    } else {
      log('Config has NO mnemonic, skipping');
    }
  } else {
    log('No config file found at:', WALLET_CONFIG_PATH);
  }

  // If mnemonic recovery failed, try KMD
  if (!backendAccount) {
    log('=== Step 2: Try KMD ===');
    try {
      const kmdToken = process.env.KMD_TOKEN || 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      log('Creating KMD client with token:', kmdToken.substring(0, 10) + '...');
      
      const kmd = new algosdk.Kmd(kmdToken, KMD_SERVER, '4002');
      
      log('Listing wallets...');
      const walletsResponse = await kmd.listWallets();
      log('Found', walletsResponse.wallets.length, 'wallets');
      log('Wallets:', walletsResponse.wallets.map((w: any) => w.name).join(', '));

      for (const wallet of walletsResponse.wallets) {
        if (wallet.name.includes('unencrypted')) {
          log('Trying wallet:', wallet.name);
          try {
            const handleResponse = await kmd.initWalletHandle(wallet.id, '');
            const walletHandle = handleResponse.wallet_handle_token;
            
            log('Listing accounts...');
            // Use listKeys instead of listAccounts
            const keysResponse = await kmd.listKeys(walletHandle);
            log('Found', keysResponse.addresses.length, 'keys');
            
            if (keysResponse.addresses.length > 0) {
              const address = keysResponse.addresses[0];
              log('Using first account:', address);
              
              try {
                const keyResponse = await kmd.exportKey(walletHandle, '', address);
                backendAccount = {
                  addr: address,
                  sk: Buffer.from(keyResponse.private_key) as unknown as Uint8Array,
                };
                log('Exported private key successfully');
              } catch (keyError: any) {
                log('Failed to export key:', keyError.message);
                backendAccount = {
                  addr: address,
                  sk: new Uint8Array(),
                };
              }
              break;
            }
          } catch (walletError: any) {
            log('Failed with wallet', wallet.name + ':', walletError.message);
          }
        }
      }
    } catch (error: any) {
      log('KMD error:', error.message);
    }
  }

  // If still no account, create new one
  if (!backendAccount) {
    log('=== Step 3: Creating new account ===');
    log('Creating fresh account...');
    const account = algosdk.generateAccount();
    
    backendAccount = {
      addr: typeof account.addr === 'string' ? account.addr : account.addr.toString(),
      sk: account.sk,
    };
    
    const mnemonic = algosdk.secretKeyToMnemonic(account.sk);
    saveWalletConfig({ 
      address: backendAccount.addr, 
      mnemonic,
      createdAt: new Date().toISOString() 
    });
    log('New account created:', backendAccount.addr);
    log('Mnemonic saved to:', WALLET_CONFIG_PATH);
  }

  // Verify the account works
  log('=== Step 4: Verify Account ===');
  log('Final account address:', backendAccount!.addr);
  
  try {
    const client = new algosdk.Algodv2(
      process.env.ALGOD_TOKEN || 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      ALGOD_SERVER,
      '4001'
    );
    const info = await client.accountInformation(backendAccount!.addr).do();
    const balance = Number(info.amount) / 1_000_000;
    log('Account verified! Balance:', balance, 'Algos');
  } catch (error: any) {
    log('Failed to verify account:', error.message);
  }

  log('=== Wallet Initialization Complete ===\n');
  return backendAccount!;
}

function saveWalletConfig(config: WalletConfig): void {
  try {
    fs.writeFileSync(WALLET_CONFIG_PATH, JSON.stringify(config, null, 2));
    log('Config saved to:', WALLET_CONFIG_PATH);
  } catch (error: any) {
    log('Failed to save config:', error.message);
  }
}

export function getWalletConfig(): WalletConfig | null {
  try {
    if (fs.existsSync(WALLET_CONFIG_PATH)) {
      log('Config file exists at:', WALLET_CONFIG_PATH);
      const data = fs.readFileSync(WALLET_CONFIG_PATH, 'utf-8');
      const config = JSON.parse(data);
      log('Config parsed, address:', config.address);
      return config;
    } else {
      log('Config file NOT found at:', WALLET_CONFIG_PATH);
    }
  } catch (error: any) {
    log('Failed to load wallet config:', error.message);
  }
  return null;
}

function getAlgodClient(): algosdk.Algodv2 {
  const token = process.env.ALGOD_TOKEN || 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  return new algosdk.Algodv2(token, ALGOD_SERVER, '4001');
}

export async function checkBalance(address: string): Promise<number> {
  try {
    const client = getAlgodClient();
    const accountInfo = await client.accountInformation(address).do();
    const balance = Number(accountInfo.amount) / 1_000_000;
    log('Balance check:', balance, 'Algos');
    return balance;
  } catch (error: any) {
    log('Balance check failed:', error.message);
    return 0;
  }
}

export async function checkBalanceMicroAlgos(address: string): Promise<bigint> {
  try {
    const client = getAlgodClient();
    const accountInfo = await client.accountInformation(address).do();
    return BigInt(accountInfo.amount);
  } catch (error: any) {
    log('Balance check (microAlgos) failed:', error.message);
    return BigInt(0);
  }
}

export function getBackendAccount(): BackendAccount | null {
  return backendAccount;
}

export async function getAccountInfo(address: string) {
  try {
    const client = getAlgodClient();
    return await client.accountInformation(address).do();
  } catch (error: any) {
    log('Get account info failed:', error.message);
    return null;
  }
}

export async function sendPayment(
  from: BackendAccount,
  to: string,
  amount: bigint
): Promise<string | null> {
  try {
    const client = getAlgodClient();
    const params = await client.getTransactionParams().do();
    
    log('Sending payment:', from.addr, '->', to, 'amount:', amount.toString());

    const txn = (algosdk as any).makePaymentTxnWithSuggestedParams(
      from.addr,
      to,
      amount,
      undefined,
      new Uint8Array(Buffer.from('RootNode x402 payment')),
      params
    );

    const signedTxn = txn.signTxn(from.sk);
    const sendResponse = await client.sendRawTransaction(signedTxn).do();
    const txId = sendResponse.txid;

    log('Payment sent! TxId:', txId);
    return txId;

  } catch (error: any) {
    log('Payment failed:', error.message);
    return null;
  }
}

export async function waitForTransaction(txId: string, maxWaitMs: number = 10000): Promise<boolean> {
  try {
    const client = getAlgodClient();
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const pendingInfo = await client.pendingTransactionInformation(txId).do();
        
        if (pendingInfo.confirmedRound !== undefined && pendingInfo.confirmedRound > 0) {
          log('Transaction confirmed:', txId, 'round:', pendingInfo.confirmedRound.toString());
          return true;
        }
      } catch {
        // Transaction not found yet, wait
      }
      await new Promise(res => setTimeout(res, 500));
    }

    log('Transaction wait timeout:', txId);
    return false;
  } catch (error: any) {
    log('Wait for transaction error:', error.message);
    return false;
  }
}

export async function verifyTransaction(txId: string): Promise<boolean> {
  try {
    const client = getAlgodClient();
    const pendingInfo = await client.pendingTransactionInformation(txId).do();
    return pendingInfo.confirmedRound !== undefined && pendingInfo.confirmedRound > 0;
  } catch (error: any) {
    log('Verify transaction failed:', error.message);
    return false;
  }
}
