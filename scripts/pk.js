import { generateWallet, generateSecretKey } from '@stacks/wallet-sdk';

async function setupWallet() {
  // Use existing seed phrase or generate new one
  const seedPhrase = "";
  
  const wallet = await generateWallet({
    secretKey: seedPhrase,
    password: '',
  });
  
  // Access the first account
  const account = wallet.accounts[0];
  console.log(account)
  console.log('STX address:', account.address);
  console.log('STX private key:', account.stxPrivateKey);
  console.log('Data private key:', account.dataPrivateKey);
  
  return wallet;
}

setupWallet();
