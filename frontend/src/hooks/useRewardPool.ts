'use client';

/**
 * useRewardPool — reads Impact Dashboard state from Stacks contracts and
 * broadcasts claim transactions via Leather/Xverse.
 *
 * Falls back to demo values if contracts are not configured or unreachable.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CONTRACTS,
  fetchEcoPoints,
  fetchRewardSummary,
  fetchStampCount,
  fetchTier,
  tierName,
  type RewardSummary,
} from '@/lib/stacks';
import { stacksNetwork } from '@/lib/stacks-network';
import { addActivity } from '@/lib/activity';

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return '0x' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function demoSummary(tier: number): RewardSummary {
  const poolBalance = 42_000_000;
  const claimable = tier >= 2 ? Math.floor(poolBalance * 0.07) : tier >= 1 ? Math.floor(poolBalance * 0.03) : 0;
  return {
    claimable,
    poolBalance,
    totalDeposited: poolBalance,
    totalClaimed: 0,
    userTotalClaimed: 0,
    claimCount: 0,
    cooldownBlocks: 0,
    canClaim: claimable > 0,
  };
}

export function useRewardPool(walletAddress: string | null) {
  const [loading, setLoading] = useState(false);
  const [tier, setTier] = useState(0);
  const [stampCount, setStampCount] = useState(0);
  const [ecoPoints, setEcoPointsState] = useState(0);
  const [summary, setSummary] = useState<RewardSummary | null>(null);

  const [claiming, setClaiming] = useState(false);
  const [claimTxid, setClaimTxid] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const [t, sc, ep] = await Promise.all([
        fetchTier(walletAddress),
        fetchStampCount(walletAddress),
        fetchEcoPoints(walletAddress),
      ]);
      setTier(t);
      setStampCount(sc);
      setEcoPointsState(ep);

      const s = await fetchRewardSummary(walletAddress, t);
      setSummary(s);
      setLoading(false);
    } catch {
      const t = ecoPoints >= 60 ? 2 : ecoPoints >= 20 ? 1 : 0;
      setTier(t);
      setStampCount(stampCount);
      setSummary(demoSummary(t));
      setLoading(false);
    }
  }, [walletAddress, ecoPoints, stampCount]);

  useEffect(() => {
    if (!walletAddress) {
      setLoading(false);
      setTier(0);
      setStampCount(0);
      setEcoPointsState(0);
      setSummary(null);
      return;
    }
    refresh();
    timer.current = setInterval(refresh, 30_000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [walletAddress, refresh]);

  const clearClaimState = useCallback(() => {
    setClaimTxid(null);
    setClaimError(null);
  }, []);

  const claimReward = useCallback(async () => {
    if (!walletAddress) return;
    if (claiming) return;
    if (!summary?.canClaim) return;

    setClaiming(true);
    setClaimError(null);
    setClaimTxid(null);

    try {
      if (!CONTRACTS.rewardPool || !CONTRACTS.rewardPool.includes('.')) {
        await new Promise(r => setTimeout(r, 1200));
        setClaimTxid(randomHex(32));
        setClaiming(false);
        return;
      }

      const [contractAddress, contractName] = CONTRACTS.rewardPool.split('.');
      const { openContractCall } = await import('@stacks/connect');
      const { uintCV } = await import('@stacks/transactions');

      await new Promise<void>((resolve, reject) => {
        openContractCall({
          contractAddress,
          contractName,
          functionName: 'claim-reward',
          functionArgs: [uintCV(tier)],
          network: stacksNetwork(),
          appDetails: { name: 'EcoStamp', icon: '/icon.png' },
          onFinish: (data: any) => {
            const txId = data.txId ?? data.txid ?? null;
            setClaimTxid(txId);
            if (txId) {
              addActivity({
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                kind: 'reward',
                title: 'Reward claim broadcast',
                detail: `${tierName(tier)} tier`,
                timestamp: new Date().toISOString(),
                txId,
              });
            }
            resolve();
          },
          onCancel: () => reject(new Error('Transaction cancelled')),
        });
      });

      setClaiming(false);
      setTimeout(refresh, 12_000);
    } catch (e: any) {
      setClaiming(false);
      setClaimError(e?.message ?? 'Claim failed');
    }
  }, [walletAddress, claiming, summary, tier, refresh]);

  return {
    loading,
    tier,
    tierLabel: tierName(tier),
    stampCount,
    ecoPoints,
    summary,
    claiming,
    claimTxid,
    claimError,
    claimReward,
    clearClaimState,
  };
}
