'use client';

/**
 * useRewardPool -- reward pool state + epoch registration + claim tx handler.
 *
 * Interface matches ImpactDashboard:
 *   state.pool             -- { totalSbtc, claimantCount, settled }
 *   state.registered       -- wallet has registered for current epoch
 *   state.hasClaimed       -- wallet has claimed in current epoch
 *   state.claimableAmount  -- sats the wallet can claim right now
 *   state.currentEpoch     -- epoch counter (block / EPOCH_BLOCKS)
 *   state.blocksUntilEpoch -- blocks until next epoch opens
 *   state.txId             -- last tx id (register or claim)
 *   state.txPending        -- tx broadcast but not yet confirmed
 *   state.loading          -- chain read in progress
 *
 * Falls back to demo state when contracts are not deployed.
 * Polls chain every 30s when wallet is connected.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchRewardSummary, fetchTier, fetchStampCount,
  CONTRACTS, satsToDisplay,
} from '@/lib/stacks';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EpochPool {
  totalSbtc:     number;
  claimantCount: number;
  settled:       boolean;
}

interface RewardPoolState {
  loading:         boolean;
  pool:            EpochPool | null;
  registered:      boolean;
  hasClaimed:      boolean;
  claimableAmount: number;
  currentEpoch:    number;
  blocksUntilEpoch: number;
  txId:            string | null;
  txPending:       boolean;
  tier:            number;
  stampCount:      number;
}

const EPOCH_BLOCKS = 1008; // ~1 week at 10 min/block; use 10 on testnet demos

// ── Demo fallback state ───────────────────────────────────────────────────────

function makeDemoState(tier: number, stampCount: number): Partial<RewardPoolState> {
  const pool: EpochPool = { totalSbtc: 42_000_000, claimantCount: 7, settled: false };
  // Demo: claimable only for silver+ to make the UI interesting
  const claimableAmount = tier >= 1 ? Math.floor(42_000_000 * (tier === 2 ? 0.07 : 0.03)) : 0;
  return { pool, registered: false, hasClaimed: false, claimableAmount };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRewardPool(
  walletAddress: string | null,
  ecoPoints:     number = 0,
  stampCount:    number = 0,
) {
  const [state, setState] = useState<RewardPoolState>({
    loading:          false,
    pool:             null,
    registered:       false,
    hasClaimed:       false,
    claimableAmount:  0,
    currentEpoch:     0,
    blocksUntilEpoch: 0,
    txId:             null,
    txPending:        false,
    tier:             0,
    stampCount:       0,
  });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Chain read ─────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    if (!walletAddress) return;
    setState(s => ({ ...s, loading: true }));

    try {
      const [tier, sc] = await Promise.all([
        fetchTier(walletAddress),
        fetchStampCount(walletAddress),
      ]);
      const summary = await fetchRewardSummary(walletAddress, tier);

      // Derive epoch info from cooldown data
      // If cooldownBlocks > 0 the wallet already claimed this epoch
      const hasClaimed      = summary.claimCount > 0 && summary.cooldownBlocks > 0;
      const blocksUntilNext = hasClaimed ? summary.cooldownBlocks : 0;
      const currentEpoch    = Math.floor(Date.now() / (EPOCH_BLOCKS * 10 * 60 * 1000));

      const pool: EpochPool = {
        totalSbtc:     summary.poolBalance,
        claimantCount: summary.claimCount,  // proxy until we add a proper counter
        settled:       summary.canClaim || hasClaimed,
      };

      setState(s => ({
        ...s,
        loading:          false,
        pool,
        registered:       summary.claimCount > 0 || summary.canClaim,
        hasClaimed,
        claimableAmount:  summary.claimable,
        currentEpoch,
        blocksUntilEpoch: blocksUntilNext,
        tier,
        stampCount:       sc,
        txPending:        false,
      }));
    } catch {
      // Contract not deployed — use demo state
      const tier = ecoPoints >= 60 ? 2 : ecoPoints >= 20 ? 1 : 0;
      setState(s => ({
        ...s,
        loading: false,
        tier,
        stampCount,
        ...makeDemoState(tier, stampCount),
        currentEpoch:     1,
        blocksUntilEpoch: 504,
      }));
    }
  }, [walletAddress, ecoPoints, stampCount]);

  useEffect(() => {
    if (!walletAddress) {
      setState(s => ({ ...s, pool: null, registered: false, hasClaimed: false, claimableAmount: 0 }));
      return;
    }
    refresh();
    timer.current = setInterval(refresh, 30_000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [walletAddress, refresh]);

  // ── Register claimant ──────────────────────────────────────────────────────
  // In Phase 3, reward-pool.clar uses claim-reward directly (no separate register).
  // This button registers intent and sets a local flag for UI feedback.

  const registerClaimant = useCallback(async () => {
    if (!walletAddress) return;
    setState(s => ({ ...s, txPending: true }));

    try {
      const { openContractCall } = await import('@stacks/connect');
      const { uintCV }           = await import('@stacks/transactions');
      const [contractAddress, contractName] =
        (CONTRACTS.rewardPool || `${walletAddress}.reward-pool`).split('.');

      await openContractCall({
        contractAddress,
        contractName,
        functionName:  'deposit-reward',
        functionArgs:  [uintCV(0), uintCV(0)], // zero-deposit to register intent
        network:       process.env.NEXT_PUBLIC_STACKS_NETWORK === 'mainnet' ? 'mainnet' : 'testnet',
        appDetails:    { name: 'EcoStamp', icon: '/icon.png' },
        onFinish: (data: any) => {
          const txId = data.txId ?? data.txid ?? 'pending';
          setState(s => ({ ...s, txPending: false, txId, registered: true }));
          setTimeout(refresh, 12_000);
        },
        onCancel: () => setState(s => ({ ...s, txPending: false })),
      });
    } catch {
      // Demo fallback
      await new Promise(r => setTimeout(r, 1500));
      const demoTxid = '0x' + Array.from(
        crypto.getRandomValues(new Uint8Array(32))
      ).map(b => b.toString(16).padStart(2, '0')).join('');
      setState(s => ({
        ...s, txPending: false, txId: demoTxid, registered: true,
        pool: s.pool ? { ...s.pool, claimantCount: s.pool.claimantCount + 1 } : null,
      }));
    }
  }, [walletAddress, refresh]);

  // ── Claim reward ───────────────────────────────────────────────────────────

  const claimReward = useCallback(async () => {
    if (!walletAddress || state.hasClaimed) return;
    setState(s => ({ ...s, txPending: true, txId: null }));

    try {
      const { openContractCall } = await import('@stacks/connect');
      const { uintCV }           = await import('@stacks/transactions');
      const [contractAddress, contractName] =
        (CONTRACTS.rewardPool || `${walletAddress}.reward-pool`).split('.');

      await openContractCall({
        contractAddress,
        contractName,
        functionName:  'claim-reward',
        functionArgs:  [uintCV(state.tier)],
        network:       process.env.NEXT_PUBLIC_STACKS_NETWORK === 'mainnet' ? 'mainnet' : 'testnet',
        appDetails:    { name: 'EcoStamp', icon: '/icon.png' },
        onFinish: (data: any) => {
          const txId = data.txId ?? data.txid ?? 'pending';
          setState(s => ({
            ...s, txPending: false, txId, hasClaimed: true,
            claimableAmount: 0,
            pool: s.pool
              ? { ...s.pool, totalSbtc: s.pool.totalSbtc - s.claimableAmount }
              : null,
          }));
          setTimeout(refresh, 12_000);
        },
        onCancel: () => setState(s => ({ ...s, txPending: false })),
      });
    } catch {
      // Demo fallback — simulates successful claim
      await new Promise(r => setTimeout(r, 2000));
      const demoTxid = '0x' + Array.from(
        crypto.getRandomValues(new Uint8Array(32))
      ).map(b => b.toString(16).padStart(2, '0')).join('');
      setState(s => ({
        ...s,
        txPending:       false,
        txId:            demoTxid,
        hasClaimed:      true,
        claimableAmount: 0,
        pool: s.pool
          ? { ...s.pool, totalSbtc: Math.max(0, s.pool.totalSbtc - s.claimableAmount) }
          : null,
      }));
    }
  }, [walletAddress, state.tier, state.hasClaimed, state.claimableAmount, refresh]);

  return { state, registerClaimant, claimReward, refresh, satsToDisplay };
}