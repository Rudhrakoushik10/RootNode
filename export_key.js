import algosdk from 'algosdk';

const KMD_TOKEN = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const KMD_SERVER = 'http://localhost:4002';
const ADDRESS = 'TW7OBZKTB5DPNSXODKJMSA5RGNCGFG4YXZVRI2CLND5IZQRTAOZDUQ67Z4';

async function exportKey() {
  const kmd = new algosdk.Kmd(KMD_TOKEN, KMD_SERVER, '4002');
  
  const wallets = await kmd.listWallets();
  console.log('Available wallets:', wallets.wallets.map(w => w.name));
  
  for (const wallet of wallets.wallets) {
    console.log(`\nTrying wallet: ${wallet.name}`);
    try {
      // Try with empty password
      const handle = await kmd.initWalletHandle(wallet.id, '');
      
      // First list keys in this wallet
      const keys = await kmd.listKeys(handle.wallet_handle_token);
      console.log('  Keys in wallet:', keys.addresses);
      
      // Check if our address exists
      if (keys.addresses.includes(ADDRESS)) {
        const key = await kmd.exportKey(handle.wallet_handle_token, '', ADDRESS);
        const privateKey = Buffer.from(key.private_key);
        console.log('  Found! Exporting...');
        console.log('MNEMONIC=' + algosdk.secretKeyToMnemonic(privateKey));
        console.log('PRIVATE_KEY_BASE64=' + privateKey.toString('base64'));
        return;
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
  
  console.log('\nAddress not found in any wallet');
}

exportKey().catch(console.error);