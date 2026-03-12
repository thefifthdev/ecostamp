import { StacksMainnet, StacksTestnet } from '@stacks/network';
import type { StacksNetwork } from '@stacks/network';

let cached: StacksNetwork | null = null;

export function stacksNetwork(): StacksNetwork {
  if (cached) return cached;
  const n = (process.env.NEXT_PUBLIC_STACKS_NETWORK || 'testnet').toLowerCase();
  cached = n === 'mainnet' ? new StacksMainnet() : new StacksTestnet();
  return cached;
}

