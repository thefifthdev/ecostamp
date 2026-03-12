export type StacksChain = 'testnet' | 'mainnet';

export function stacksChain(): StacksChain {
  const n = (process.env.NEXT_PUBLIC_STACKS_NETWORK || 'testnet').toLowerCase();
  return n === 'mainnet' ? 'mainnet' : 'testnet';
}

export function hiroTxUrl(txid: string): string {
  return `https://explorer.hiro.so/txid/${txid}?chain=${stacksChain()}`;
}

export function hiroAddressUrl(address: string): string {
  return `https://explorer.hiro.so/address/${address}?chain=${stacksChain()}`;
}

