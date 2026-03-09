'use client';

/**
 * useX402 -- React hook for x402 pay-per-access content fetching
 *
 * Handles the full HTTP 402 flow:
 *   1. Attempt fetch via /api/x402 proxy
 *   2. On 402: extract payment requirements, prompt wallet signing
 *   3. Retry with X-PAYMENT header containing a structurally-valid demo payload
 *   4. Return content on success
 */

import { useState, useCallback, useRef } from 'react';

export type X402State =
  | { status: 'idle' }
  | { status: 'fetching' }
  | { status: 'payment_required'; price: string; description: string; network: string }
  | { status: 'paying' }
  | { status: 'success'; data: any; paidAt: string }
  | { status: 'error'; message: string };

interface UseX402Options {
  walletAddress: string | null;
  stampToken?: string | null;
}

/**
 * Generate a random hex string of `bytes` bytes, 0x-prefixed.
 * Uses crypto.getRandomValues -- available in all modern browsers and Node 18+.
 */
function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return '0x' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Derive a valid-looking EVM address from a Stacks address for demo purposes */
function demoEvmAddress(stacksAddr: string | null): string {
  if (stacksAddr) {
    const seed = stacksAddr.replace(/[^a-fA-F0-9]/g, '').slice(0, 40).padEnd(40, '0');
    return '0x' + seed;
  }
  return '0xDeADBeeF00000000000000000000000000000001';
}

export function useX402({ walletAddress, stampToken }: UseX402Options) {
  const [state, setState] = useState<X402State>({ status: 'idle' });
  const paymentReqRef = useRef<any>(null);

  const fetchContent = useCallback(async (path: string) => {
    if (!walletAddress) {
      setState({ status: 'error', message: 'Connect your wallet to access premium content.' });
      return;
    }

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

        const accepts = paymentReq.payment?.accepts?.[0] ?? paymentReq.accepts?.[0];
        const rawAmount = accepts?.maxAmountRequired ?? '1000';
        const price = rawAmount.toString().startsWith('$')
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

  /**
   * Build a structurally-valid x402 payment payload satisfying the Zod schema
   * in x402-express without requiring a real wallet or USDC balance.
   *
   * Zod field requirements (from x402/dist/esm/chunk-SQV4BQTM.mjs):
   *   signature           -- 0x + 130 hex chars  (65 bytes: r+s+v EIP-712)
   *   authorization.from  -- 0x + 40 hex chars   (20 byte EVM address)
   *   authorization.nonce -- 0x + 64 hex chars   (32 bytes, unique per payment)
   *   authorization.to    -- 0x + 40 hex chars   (payTo from 402 response)
   *
   * Content server DEMO_MODE=true skips facilitator /verify so the fake
   * signature is never submitted on-chain.
   */
  const confirmPayment = useCallback(async () => {
    const ref = paymentReqRef.current;
    if (!ref) return;

    setState({ status: 'paying' });
    await new Promise(r => setTimeout(r, 1600));

    const accepts = ref.paymentReq?.payment?.accepts?.[0]
                 ?? ref.paymentReq?.accepts?.[0]
                 ?? {};

    const payTo = String(accepts.payTo ?? '0x0000000000000000000000000000000000000000')
                    .padEnd(42, '0').slice(0, 42);
    const value = String(accepts.maxAmountRequired ?? '1000');
    const now   = Math.floor(Date.now() / 1000);

    const payload = {
      x402Version: 1,
      scheme:      accepts.scheme  ?? 'exact',
      network:     accepts.network ?? 'base-sepolia',
      payload: {
        signature: randomHex(65),           // 65 bytes = 130 hex chars
        authorization: {
          from:        demoEvmAddress(walletAddress),
          to:          payTo,
          value,
          validAfter:  '0',
          validBefore: String(now + 300),
          nonce:       randomHex(32),        // 32 bytes = 64 hex chars
        },
      },
    };

    const encoded = btoa(JSON.stringify(payload));

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
      setState({ status: 'success', data, paidAt: data.paidAt ?? new Date().toISOString() });

    } catch (err: any) {
      setState({ status: 'error', message: err.message ?? 'Payment failed' });
    }
  }, [walletAddress, stampToken]);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
    paymentReqRef.current = null;
  }, []);

  return { state, fetchContent, confirmPayment, reset };
}