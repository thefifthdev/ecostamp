'use client';

/**
 * useStampToken — fetches a signed JWT proving the wallet's stamp count and tier.
 * Token is used as X-EcoStamp-Token header for discounted x402 prices on the
 * content server.
 *
 * Caches the token for 23h in memory (never localStorage — SSR safe).
 */

import { useState, useEffect } from 'react';

interface StampToken {
  token: string;
  tier: 'bronze' | 'silver' | 'gold';
  stampCount: number;
  fetchedAt: number;
}

const TOKEN_TTL_MS = 23 * 60 * 60 * 1000; // 23h
const cache = new Map<string, StampToken>();

export function useStampToken(walletAddress: string | null) {
  const [stampToken, setStampToken]   = useState<string | null>(null);
  const [tier, setTier]               = useState<'bronze' | 'silver' | 'gold'>('bronze');
  const [stampCount, setStampCount]   = useState(0);
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    if (!walletAddress) {
      setStampToken(null);
      setTier('bronze');
      setStampCount(0);
      return;
    }

    // Check in-memory cache first
    const cached = cache.get(walletAddress);
    if (cached && Date.now() - cached.fetchedAt < TOKEN_TTL_MS) {
      setStampToken(cached.token);
      setTier(cached.tier);
      setStampCount(cached.stampCount);
      return;
    }

    setLoading(true);
    fetch(`/api/stamp-token?wallet=${encodeURIComponent(walletAddress)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.token) return;
        const entry: StampToken = {
          token:      data.token,
          tier:       data.tier,
          stampCount: data.stampCount,
          fetchedAt:  Date.now(),
        };
        cache.set(walletAddress, entry);
        setStampToken(data.token);
        setTier(data.tier);
        setStampCount(data.stampCount);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [walletAddress]);

  return { stampToken, tier, stampCount, loading };
}