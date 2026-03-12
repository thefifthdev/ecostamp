'use client';

/**
 * useX402 -- React hook for x402 pay-per-access content fetching
 *
 * Phase 5 mainnet upgrade:
 *   confirmPayment now uses real viem signTypedData (EIP-712) to sign a
 *   USDC TransferWithAuthorization permit. This replaces the Phase 2-4
 *   randomHex demo signatures with real on-chain payments.
 *
 * DEMO_MODE (process.env.NEXT_PUBLIC_DEMO_MODE === 'true'):
 *   Falls back to randomHex signatures so the UI works without an EVM wallet.
 *   Set NEXT_PUBLIC_DEMO_MODE=true in .env for local development.
 *
 * EIP-712 domain for USDC TransferWithAuthorization:
 *   mainnet:      chainId 8453,  contract 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
 *   base-sepolia: chainId 84532, contract 0x036CbD53842c5426634e7929541eC2318f3dCF7e
 */

import { useState, useCallback, useRef } from 'react';
import { addActivity } from '@/lib/activity';

export type X402State =
  | { status: 'idle' }
  | { status: 'fetching' }
  | { status: 'payment_required'; price: string; description: string; network: string }
  | { status: 'paying' }
  | { status: 'success'; data: any; paidAt: string }
  | { status: 'error'; message: string };

interface UseX402Options {
  walletAddress: string | null; // optional for x402; used for stamp-holder discount + demo fallback
  stampToken?:   string | null;
  evmAddress?:   string | null;  // Phase 5: connected EVM wallet address (0x...)
}

// ── Network config ────────────────────────────────────────────────────────────

const NETWORK_CONFIG = {
  'base': {
    chainId:      8453,
    usdcContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
    name:         'Base',
  },
  'base-sepolia': {
    chainId:      84532,
    usdcContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
    name:         'Base Sepolia',
  },
} as const;

// ── Demo helpers (kept for DEMO_MODE) ─────────────────────────────────────────

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return '0x' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function demoEvmAddress(stacksAddr: string | null): string {
  if (stacksAddr) {
    const seed = stacksAddr.replace(/[^a-fA-F0-9]/g, '').slice(0, 40).padEnd(40, '0');
    return '0x' + seed;
  }
  return '0xDeADBeeF00000000000000000000000000000001';
}

// ── EIP-712 USDC TransferWithAuthorization signing ────────────────────────────

async function signUSDCPermit(
  payTo:      string,
  value:      string,
  network:    keyof typeof NETWORK_CONFIG,
): Promise<{ from: `0x${string}`; signature: `0x${string}`; nonce: `0x${string}`; validAfter: string; validBefore: string }> {
  const cfg    = NETWORK_CONFIG[network] ?? NETWORK_CONFIG['base-sepolia'];
  const nonce  = randomHex(32) as `0x${string}`;
  const now    = Math.floor(Date.now() / 1000);
  const validAfter  = '0x' + (now - 60).toString(16).padStart(64, '0');
  const validBefore = '0x' + (now + 300).toString(16).padStart(64, '0');

  // Dynamic import of viem -- only loaded when needed (keeps bundle lean)
  const { createWalletClient, custom } = await import('viem');
  const chainModule = network === 'base'
    ? await import('viem/chains').then(m => m.base)
    : await import('viem/chains').then(m => m.baseSepolia);

  if (!window.ethereum) throw new Error('No EVM wallet detected. Install MetaMask or Coinbase Wallet.');

  const client = createWalletClient({
    chain:     chainModule,
    transport: custom(window?.ethereum),
  });

  const accounts = await client.requestAddresses();
  if (!accounts.length) throw new Error('No EVM accounts found. Connect your EVM wallet.');
  const from = accounts[0] as `0x${string}`;

  const signature = await client.signTypedData({
    account: from,
    domain: {
      name:              'USD Coin',
      version:           '2',
      chainId:           BigInt(cfg.chainId),
      verifyingContract: cfg.usdcContract,
    },
    types: {
      TransferWithAuthorization: [
        { name: 'from',        type: 'address' },
        { name: 'to',          type: 'address'  },
        { name: 'value',       type: 'uint256'  },
        { name: 'validAfter',  type: 'uint256'  },
        { name: 'validBefore', type: 'uint256'  },
        { name: 'nonce',       type: 'bytes32'  },
      ],
    },
    primaryType: 'TransferWithAuthorization',
    message: {
      from,
      to:          payTo as `0x${string}`,
      value:       BigInt(value),
      validAfter:  BigInt(validAfter),
      validBefore: BigInt(validBefore),
      nonce:       nonce as `0x${string}`,
    },
  });

  return { from, signature, nonce, validAfter, validBefore };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useX402({ walletAddress, stampToken }: UseX402Options) {
  const [state, setState] = useState<X402State>({ status: 'idle' });
  const paymentReqRef     = useRef<any>(null);

  const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  const fetchContent = useCallback(async (path: string) => {
    setState({ status: 'fetching' });

    try {
      const res = await fetch('/api/x402', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: path, stampToken }),
      });

      if (res.status === 402) {
        const paymentReq = await res.json();
        paymentReqRef.current = { path, paymentReq };

        const accepts   = paymentReq.payment?.accepts?.[0] ?? paymentReq.accepts?.[0];
        const rawAmount = accepts?.maxAmountRequired ?? '1000';
        const price     = rawAmount.toString().startsWith('$')
          ? rawAmount
          : `$${(Number(rawAmount) / 1_000_000).toFixed(4)}`;

        setState({
          status:      'payment_required',
          price,
          description: paymentReq.payment?.description ?? accepts?.description ?? 'Premium eco content',
          network:     accepts?.network ?? 'base-sepolia',
        });
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setState({ status: 'error', message: err.error || `Request failed (${res.status})` });
        return;
      }

      const data = await res.json();
      setState({ status: 'success', data, paidAt: data.paidAt ?? new Date().toISOString() });

    } catch (err: any) {
      setState({ status: 'error', message: err.message ?? 'Network error' });
    }
  }, [walletAddress, stampToken]);

  const confirmPayment = useCallback(async () => {
    const ref = paymentReqRef.current;
    if (!ref) return;

    setState({ status: 'paying' });

    const accepts = ref.paymentReq?.payment?.accepts?.[0] ?? ref.paymentReq?.accepts?.[0] ?? {};
    const payTo   = String(accepts.payTo ?? process.env.NEXT_PUBLIC_X402_WALLET ?? '0x0000000000000000000000000000000000000000').slice(0, 42);
    const value   = String(accepts.maxAmountRequired ?? '1000');
    const network = (accepts.network ?? process.env.NEXT_PUBLIC_X402_NETWORK ?? 'base-sepolia') as keyof typeof NETWORK_CONFIG;

    let paymentPayload: object;

    if (DEMO_MODE) {
      // ── Demo mode: randomHex signatures (no EVM wallet needed) ────────────
      await new Promise(r => setTimeout(r, 1600));

      const now = Math.floor(Date.now() / 1000);
      const from = demoEvmAddress(walletAddress) as `0x${string}`;
      paymentPayload = {
        x402Version: 1,
        scheme:      accepts.scheme ?? 'exact',
        network,
        payload: {
          signature: randomHex(65),
          authorization: {
            from,
            to:          payTo,
            value,
            validAfter:  '0',
            validBefore: String(now + 300),
            nonce:       randomHex(32),
          },
        },
      };
    } else {
      // ── Production mode: real EIP-712 viem signing ────────────────────────
      if (!window?.ethereum) {
        setState({ status: 'error', message: 'No EVM wallet detected. Install MetaMask or Coinbase Wallet to pay.' });
        return;
      }
      try {
        const { from, signature, nonce, validAfter, validBefore } = await signUSDCPermit(
          payTo,
          value,
          network,
        );
        paymentPayload = {
          x402Version: 1,
          scheme:      accepts.scheme ?? 'exact',
          network,
          payload: {
            signature,
            authorization: {
              from,
              to:          payTo,
              value,
              validAfter,
              validBefore,
              nonce,
            },
          },
        };
      } catch (err: any) {
        setState({ status: 'error', message: err.message ?? 'Wallet signing failed' });
        return;
      }
    }

    const encoded = btoa(JSON.stringify(paymentPayload));

    try {
      const res = await fetch('/api/x402', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: ref.path, stampToken, paymentHeader: encoded }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setState({ status: 'error', message: err.error || `Payment failed (${res.status})` });
        return;
      }

      const data = await res.json();
      const paidAt = data.paidAt ?? new Date().toISOString();
      setState({ status: 'success', data, paidAt });

      // Persist receipt for "My Activity"
      const raw = String(accepts.maxAmountRequired ?? value);
      const usd = raw.startsWith('$') ? raw : `$${(Number(raw) / 1_000_000).toFixed(4)}`;
      addActivity({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        kind: 'x402',
        title: 'x402 purchase',
        detail: `${ref.path} · ${usd} USDC`,
        timestamp: paidAt,
        txId: data.paymentReceipt || undefined,
        network: String(network),
      });

    } catch (err: any) {
      setState({ status: 'error', message: err.message ?? 'Payment failed' });
    }
  }, [walletAddress, stampToken, DEMO_MODE]);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
    paymentReqRef.current = null;
  }, []);

  return { state, fetchContent, confirmPayment, reset };
}
