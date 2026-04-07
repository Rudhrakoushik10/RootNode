import algosdk from 'algosdk';

const ADDRESS = 'TW7OBZKTB5DPNSXODKJMSA5RGNCGFG4YXZVRI2CLND5IZQRTAOZDUQ67Z4';

const KMD_TOKEN = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const KMD_SERVER = 'http://localhost:4002';

async function findMnemonic() {
  const kmd = new algosdk.Kmd(KMD_TOKEN, KMD_SERVER, '4002');
  
  const wallets = await kmd.listWallets();
  console.log('Wallets:', wallets.wallets.map(w => w.name));
  
  for (const wallet of wallets.wallets) {
    try {
      const handle = await kmd.initWalletHandle(wallet.id, '');
      const keys = await kmd.listKeys(handle.wallet_handle_token);
      
      if (keys.addresses.includes(ADDRESS)) {
        console.log('Found in wallet:', wallet.name);
        const key = await kmd.exportKey(handle.wallet_handle_token, '', ADDRESS);
        const sk = Buffer.from(key.private_key);
        const mnemonic = algosdk.secretKeyToMnemonic(sk);
        console.log('Correct mnemonic:', mnemonic);
        console.log('Word count:', mnemonic.split(' ').length);
        return;
      }
    } catch (e) {
      console.log('Error with wallet', wallet.name, ':', e.message);
    }
  }
  console.log('Address not found in any wallet');
}

findMnemonic().catch(console.error);