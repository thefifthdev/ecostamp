'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconActivity, IconWallet, IconLink, IconX, IconVerified, IconBitcoin } from './Icons';
import { hiroTxUrl } from '@/lib/explorer';
import { clearActivity, loadActivity, type ActivityItem } from '@/lib/activity';
import { fetchEarnStampTxs } from '@/lib/hiro';

export default function Activity({ walletAddress }: { walletAddress: string | null }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [chainStamps, setChainStamps] = useState<any[]>([]);
  const [loadingChain, setLoadingChain] = useState(false);

  useEffect(() => {
    const sync = () => setItems(loadActivity());
    sync();
    window.addEventListener('ecostamp:activity', sync);
    return () => window.removeEventListener('ecostamp:activity', sync);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!walletAddress) {
        setChainStamps([]);
        return;
      }
      setLoadingChain(true);
      const txs = await fetchEarnStampTxs(walletAddress, 20).catch(() => []);
      if (!mounted) return;
      setChainStamps(txs);
      setLoadingChain(false);
    })();
    return () => { mounted = false; };
  }, [walletAddress]);

  const grouped = useMemo(() => {
    const sorted = [...items].sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    return sorted.slice(0, 50);
  }, [items]);

  return (
    <section className="min-h-[calc(100vh-64px)] px-4 sm:px-6 lg:px-8 py-12 page-enter">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-4xl text-cream-100 flex items-center gap-3">
              <IconActivity size={30} className="text-glow-400" />
              My Activity
            </h2>
            <p className="text-sage-400 mt-2">
              Purchases, stamp mints, and reward claims for this browser session.
            </p>
          </div>
          <button
            onClick={() => { clearActivity(); setItems([]); }}
            className="btn-ghost text-xs px-4 py-2 flex items-center gap-2"
            title="Clears locally stored activity only"
          >
            <IconX size={14} /> Clear local
          </button>
        </div>

        {/* Wallet chip */}
        <div className="glass rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl glass flex items-center justify-center">
              <IconWallet size={18} className="text-sage-400" />
            </div>
            <div>
              <div className="text-xs text-sage-500">Stacks wallet</div>
              <div className="text-sm text-cream-200 font-mono">
                {walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : 'Not connected'}
              </div>
            </div>
          </div>
        </div>

        {/* Recent on-chain mints */}
        <div className="glass rounded-3xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-xs uppercase tracking-widest text-sage-500">On-chain</div>
              <div className="font-display text-xl text-cream-100 mt-1">Recent stamp mints</div>
            </div>
            {loadingChain && (
              <div className="text-xs text-sage-500 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-glow-400 animate-pulse" /> syncing
              </div>
            )}
          </div>

          {!walletAddress ? (
            <div className="text-sm text-sage-500">
              Connect your wallet to load your on-chain stamp transactions.
            </div>
          ) : chainStamps.length === 0 ? (
            <div className="text-sm text-sage-500">
              No `earn-stamp` transactions found yet.
            </div>
          ) : (
            <div className="space-y-3">
              {chainStamps.map((tx: any) => (
                <a
                  key={tx.txId}
                  href={hiroTxUrl(tx.txId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-light rounded-2xl p-4 flex items-center justify-between gap-4
                             border border-sage-700/30 hover:border-glow-300/20 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-cream-200 font-medium">
                      Provider #{tx.providerId}
                      <span className="text-xs text-sage-600 font-mono ml-2">{tx.txId.slice(0, 10)}…</span>
                    </div>
                    <div className="text-xs text-sage-500 mt-1">
                      {new Date(tx.mintedAt).toLocaleString()} · +{tx.ecoPoints} points
                    </div>
                  </div>
                  <div className="text-xs text-glow-400 flex items-center gap-1 shrink-0">
                    <IconLink size={12} /> view
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Local receipts */}
        <div className="glass rounded-3xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-xs uppercase tracking-widest text-sage-500">Local</div>
              <div className="font-display text-xl text-cream-100 mt-1">Receipts</div>
            </div>
            <div className="text-xs text-sage-600">{grouped.length} items</div>
          </div>

          {grouped.length === 0 ? (
            <div className="text-sm text-sage-500">
              No local receipts yet. Buy a guide via x402 or mint a stamp to populate this list.
            </div>
          ) : (
            <div className="space-y-3">
              {grouped.map(it => (
                <div
                  key={it.id}
                  className="glass-light rounded-2xl p-4 border border-sage-700/30 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-cream-200 font-medium">{it.title}</span>
                      {it.kind === 'x402' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-300 border border-blue-400/20">
                          x402
                        </span>
                      )}
                      {it.kind === 'stamp' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-glow-400/10 text-glow-400 border border-glow-300/20">
                          stamp
                        </span>
                      )}
                      {it.kind === 'reward' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
                          reward
                        </span>
                      )}
                    </div>
                    {it.detail && <div className="text-xs text-sage-500 mt-1 break-all">{it.detail}</div>}
                    <div className="text-xs text-sage-600 mt-1">{new Date(it.timestamp).toLocaleString()}</div>
                    {it.txId && (
                      <div className="text-[11px] text-sage-500 font-mono mt-2 break-all">
                        {it.txId}
                      </div>
                    )}
                  </div>

                  {it.kind !== 'x402' && it.txId && (
                    <a
                      href={hiroTxUrl(it.txId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-glow-400 shrink-0 flex items-center gap-1"
                      title="View on Hiro Explorer"
                    >
                      <IconVerified size={12} /> view
                    </a>
                  )}

                  {it.kind === 'x402' && (
                    <div className="text-xs text-blue-300 shrink-0 flex items-center gap-1">
                      <IconBitcoin size={12} /> paid
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
