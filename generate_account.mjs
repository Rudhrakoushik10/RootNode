import algosdk from 'algosdk';

const KMD_TOKEN = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const KMD_SERVER = 'http://localhost:4002';

async function generateAndSave() {
  const kmd = new algosdk.Kmd(KMD_TOKEN, KMD_SERVER, '4002');
  
  // Get the DEPLOYER wallet
  const wallets = await kmd.listWallets();
  const deployer = wallets.wallets.find(w => w.name === 'DEPLOYER');
  
  if (!deployer) {
    console.log('DEPLOYER wallet not found');
    return;
  }
  
  const handle = await kmd.initWalletHandle(deployer.id, '');
  
  // Generate a new key in this wallet
  const newKey = await kmd.generateKey(handle.wallet_handle_token);
  console.log('Generated key for:', newKey.address);
  
  // Export it
  const keyData = await kmd.exportKey(handle.wallet_handle_token, '', newKey.address);
  const sk = Buffer.from(keyData.private_key);
  const mnemonic = algosdk.secretKeyToMnemonic(sk);
  
  console.log('Mnemonic:', mnemonic);
  console.log('Word count:', mnemonic.split(' ').length);
  
  // Verify
  const recovered = algosdk.mnemonicToSecretKey(mnemonic);
  console.log('Verified address:', recovered.addr);
}

generateAndSave().catch(console.error);