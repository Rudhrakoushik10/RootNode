import algosdk from 'algosdk';

const KMD_TOKEN = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const KMD_SERVER = 'http://localhost:4002';

async function createValidAccount() {
  const kmd = new algosdk.Kmd(KMD_TOKEN, KMD_SERVER, '4002');
  
  // Get the unencrypted-default-wallet
  const wallets = await kmd.listWallets();
  const wallet = wallets.wallets.find(w => w.name === 'unencrypted-default-wallet');
  
  if (!wallet) {
    console.log('Wallet not found');
    return;
  }
  
  console.log('Using wallet:', wallet.name);
  const handle = await kmd.initWalletHandle(wallet.id, '');
  
  // Generate a new key
  const result = await kmd.generateKey(handle.wallet_handle_token);
  console.log('New address:', result.address);
  
  // Export with empty password
  const keyData = await kmd.exportKey(handle.wallet_handle_token, '', result.address);
  const sk = Buffer.from(keyData.private_key);
  
  const mnemonic = algosdk.secretKeyToMnemonic(sk);
  console.log('Mnemonic:', mnemonic);
  console.log('Word count:', mnemonic.split(' ').length);
  
  // Verify
  const recovered = algosdk.mnemonicToSecretKey(mnemonic);
  console.log('Verified:', recovered.addr === result.address ? 'YES' : 'NO');
  
  // Save to config
  const fs = await import('fs');
  const config = {
    address: result.address,
    mnemonic: mnemonic,
    createdAt: new Date().toISOString()
  };
  fs.writeFileSync('J:/minisih/RootNode/projects/RootNode-backend/.wallet-config.json', JSON.stringify(config, null, 2));
  console.log('Saved to .wallet-config.json');
  
  // Fund the account
  console.log('Now need to fund this account from dispenser');
}

createValidAccount().catch(console.error);