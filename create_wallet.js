import algosdk from 'algosdk';
import fs from 'fs';

const KMD_TOKEN = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const KMD_SERVER = 'http://localhost:4002';
const WALLET_NAME = 'unencrypted-default-wallet';
const WALLET_PASSWORD = '';
const WALLET_CONFIG_PATH = 'projects/RootNode-backend/.wallet-config.json';

async function createAndExport() {
  const kmd = new algosdk.Kmd(KMD_TOKEN, KMD_SERVER, '4002');
  
  // Find the default wallet
  const wallets = await kmd.listWallets();
  const wallet = wallets.wallets.find(w => w.name === WALLET_NAME);
  
  if (!wallet) {
    console.error('Wallet not found');
    return;
  }
  
  const handle = await kmd.initWalletHandle(wallet.id, WALLET_PASSWORD);
  
  // Generate a new account in the wallet
  console.log('Generating new key...');
  const genResult = await kmd.generateKey(handle.wallet_handle_token);
  const address = genResult.address;
  
  console.log('New address:', address);
  
  // Export the private key
  const key = await kmd.exportKey(handle.wallet_handle_token, WALLET_PASSWORD, address);
  const privateKey = Buffer.from(key.private_key);
  
  // Generate mnemonic
  const mnemonic = algosdk.secretKeyToMnemonic(privateKey);
  console.log('Mnemonic:', mnemonic);
  
  // Save config
  const config = {
    address: address,
    mnemonic: mnemonic,
    createdAt: new Date().toISOString()
  };
  
  fs.writeFileSync(WALLET_CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log('Wallet config saved to:', WALLET_CONFIG_PATH);
  
  // Also export as base64 for direct use
  const privateKeyBase64 = privateKey.toString('base64');
  console.log('PRIVATE_KEY_BASE64=' + privateKeyBase64);
}

createAndExport().catch(console.error);