const algosdk = require('algosdk');
const fs = require('fs');
const path = require('path');

const KMD_TOKEN = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const KMD_SERVER = 'http://localhost:4002';
const ALGOD_TOKEN = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const ALGOD_SERVER = 'http://localhost:4001';

const CONTRACT_CONFIG_PATH = path.join(__dirname, '..', '.contract-config.json');

async function getAccount() {
  const kmd = new algosdk.Kmd(KMD_TOKEN, KMD_SERVER, '4002');
  const wallets = await kmd.listWallets();
  
  const dw = wallets.wallets.find(x => x.name === 'DEPLOYER');
  if (!dw) throw new Error('DEPLOYER wallet not found');
  
  const handle = await kmd.initWalletHandle(dw.id, '');
  const keys = await kmd.listKeys(handle.wallet_handle_token);
  
  const accountAddr = keys.addresses.find(a => a.startsWith('HZBVD'));
  if (!accountAddr) throw new Error('HZBVD account not found in DEPLOYER wallet');
  
  const keyData = await kmd.exportKey(handle.wallet_handle_token, '', accountAddr);
  return { addr: accountAddr, sk: new Uint8Array(keyData.private_key) };
}

function createAccountSigner(account) {
  return algosdk.makeBasicAccountTransactionSigner(account);
}

async function callContract(action, params) {
  const config = JSON.parse(fs.readFileSync(CONTRACT_CONFIG_PATH, 'utf-8'));
  const client = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, '4001');
  const account = await getAccount();
  const signer = createAccountSigner(account);
  const txParams = await client.getTransactionParams().do();
  
  let method, methodArgs, appId;
  
  if (action === 'recordSpend') {
    method = new algosdk.ABIMethod({
      name: 'recordSpend',
      args: [
        { type: 'address', name: 'agent' },
        { type: 'string', name: 'serviceId' },
        { type: 'uint64', name: 'amount' }
      ],
      returns: { type: 'void' }
    });
    methodArgs = [params.agentAddress, params.serviceId, parseInt(params.amountMicroAlgos)];
    appId = config.spendTrackerContract.appId;
  } else if (action === 'anchorReceipt') {
    method = new algosdk.ABIMethod({
      name: 'anchorReceipt',
      args: [
        { type: 'byte[]', name: 'receiptHash' },
        { type: 'string', name: 'serviceId' }
      ],
      returns: { type: 'uint64' }
    });
    methodArgs = [Buffer.from(params.receiptHash, 'hex'), params.serviceId];
    appId = config.receiptAnchorContract.appId;
  } else {
    throw new Error(`Unknown action: ${action}`);
  }
  
  const atc = new algosdk.AtomicTransactionComposer();
  
  atc.addMethodCall({
    sender: account.addr,
    appID: appId,
    method: method,
    methodArgs: methodArgs,
    signer: signer,
    suggestedParams: txParams
  });
  
  const result = await atc.submit(client);
  const txId = result[0];
  
  // Wait for confirmation
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const pending = await client.pendingTransactionInformation(txId).do();
      if (pending.confirmedRound) {
        return { success: true, txId, confirmedRound: pending.confirmedRound };
      }
    } catch {}
  }
  
  return { success: true, txId, confirmedRound: null };
}

async function main() {
  const action = process.argv[2];
  const paramsStr = process.argv.slice(3).join(' ');
  
  if (!action) {
    console.error('Usage: node callContract.cjs <action> <params_json>');
    process.exit(1);
  }
  
  console.error('Action:', action);
  console.error('ParamsStr:', paramsStr);
  
  let params;
  try {
    params = JSON.parse(paramsStr);
  } catch (e) {
    console.error('Invalid JSON params:', e.message);
    process.exit(1);
  }
  
  try {
    const result = await callContract(action, params);
    console.log(JSON.stringify(result, (key, value) => typeof value === 'bigint' ? value.toString() : value));
  } catch (e) {
    console.error(JSON.stringify({ success: false, error: e.message || String(e) }));
    process.exit(1);
  }
}

// Export for use as module
module.exports = { callContract, getAccount };

// Run main if called directly
if (require.main === module) {
  main();
}
