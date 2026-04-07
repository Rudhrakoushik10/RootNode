import algosdk from 'algosdk';
import fs from 'fs';

const CONTRACT_CONFIG_PATH = 'J:/minisih/RootNode/projects/RootNode-backend/.contract-config.json';

const ALGOD_SERVER = 'http://localhost:4001';
const ALGOD_TOKEN = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

async function main() {
  console.log('=== Direct Contract Test ===');
  
  // Use a fresh mnemonic
  const mnemonic = 'abstract myself route between before tunnel upgrade legend mango about arrow sibling music upgrade hobby blue island repeat senior fire zero element concert absorb volcano';
  
  console.log('Mnemonic:', mnemonic);
  console.log('Mnemonic length:', mnemonic.split(' ').length);
  
  try {
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    console.log('Account recovered:', account.addr);
    console.log('SK length:', account.sk.length);
  } catch (e) {
    console.error('Failed to recover:', e.message);
    return;
  }
  
  // Load config
  const config = JSON.parse(fs.readFileSync(CONTRACT_CONFIG_PATH, 'utf-8'));
  console.log('SpendTracker appId:', config.spendTrackerContract.appId);
  
  // Create client
  const client = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, '4001');
  const params = await client.getTransactionParams().do();
  
  // Build transaction
  const methodSelector = 'recordSpend(address,string,uint64)void';
  const methodBytes = new TextEncoder().encode(methodSelector);
  
  const agentBytes = algosdk.decodeAddress(account.addr).publicKey;
  const serviceIdBytes = new TextEncoder().encode('direct_test_3');
  const amountBytes = algosdk.encodeUint64(1000000);
  
  const appArgs = [methodBytes, agentBytes, serviceIdBytes, amountBytes];
  
  console.log('Building transaction for app:', config.spendTrackerContract.appId);
  
  const txn = algosdk.makeApplicationCallTxnFromObject({
    sender: account.addr,
    appIndex: config.spendTrackerContract.appId,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    appArgs: appArgs,
    note: new TextEncoder().encode('Direct test call'),
    suggestedParams: params
  });
  
  const signedTxn = txn.signTxn(account.sk);
  console.log('Transaction signed, sending...');
  
  const sendResponse = await client.sendRawTransaction(signedTxn).do();
  console.log('Transaction sent!', sendResponse.txid);
  
  // Wait for confirmation
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const pending = await client.pendingTransactionInformation(sendResponse.txid).do();
      if (pending.confirmedRound) {
        console.log('Confirmed at round:', pending.confirmedRound);
        break;
      }
    } catch {}
  }
  
  console.log('Done!');
}

main().catch(console.error);