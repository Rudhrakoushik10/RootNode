const algosdk = require('algosdk');

const KMD_TOKEN = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const KMD_SERVER = 'http://localhost:4002';

async function main() {
  const kmd = new algosdk.Kmd(KMD_TOKEN, KMD_SERVER, '4002');
  const wallets = await kmd.listWallets();
  console.log('Available wallets:', wallets.wallets.map(w => w.name));
  
  for (const wallet of wallets.wallets) {
    console.log('\n=== Wallet:', wallet.name, '===');
    try {
      const handle = await kmd.initWalletHandle(wallet.id, '');
      const keys = await kmd.listKeys(handle.wallet_handle_token);
      console.log('Addresses:', keys.addresses);
    } catch (e) {
      console.log('Error:', e.message);
    }
  }
}

main().catch(console.error);