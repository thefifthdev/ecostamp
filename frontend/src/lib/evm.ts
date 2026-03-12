'use client';

type X402Network = 'base' | 'base-sepolia';

const CHAINS: Record<X402Network, {
  chainId: number;
  chainIdHex: `0x${string}`;
  chainName: string;
  rpcUrls: string[];
  blockExplorerUrls: string[];
  nativeCurrency: { name: string; symbol: string; decimals: number };
}> = {
  'base': {
    chainId: 8453,
    chainIdHex: '0x2105',
    chainName: 'Base',
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  'base-sepolia': {
    chainId: 84532,
    chainIdHex: '0x14a34',
    chainName: 'Base Sepolia',
    rpcUrls: ['https://sepolia.base.org'],
    blockExplorerUrls: ['https://sepolia.basescan.org'],
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
};

function toInt(chainIdHex: string): number {
  try {
    return Number.parseInt(chainIdHex, 16);
  } catch {
    return NaN;
  }
}

export function evmChainLabel(network: X402Network): string {
  return CHAINS[network]?.chainName ?? network;
}

export function evmChainId(network: X402Network): number {
  return CHAINS[network]?.chainId ?? 0;
}

export async function ensureEvmChain(network: X402Network): Promise<void> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No EVM wallet detected. Install MetaMask or Coinbase Wallet.');
  }

  const target = CHAINS[network] ?? CHAINS['base-sepolia'];

  const currentHex = await window.ethereum.request({ method: 'eth_chainId' }) as string;
  const currentId = toInt(currentHex);
  if (currentId === target.chainId) return;

  // Attempt auto-switch. Many wallets require a direct user gesture; if this
  // fails, we surface a clear instruction rather than a generic viem error.
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: target.chainIdHex }],
    });
  } catch (err: any) {
    // MetaMask: 4902 = unknown chain
    if (err?.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: target.chainIdHex,
          chainName: target.chainName,
          rpcUrls: target.rpcUrls,
          blockExplorerUrls: target.blockExplorerUrls,
          nativeCurrency: target.nativeCurrency,
        }],
      });
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: target.chainIdHex }],
      });
      return;
    }

    const wanted = `${target.chainName} (chainId ${target.chainId})`;
    throw new Error(`Switch your EVM wallet network to ${wanted} and try again.`);
  }
}

