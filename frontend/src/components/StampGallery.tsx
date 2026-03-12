'use client';

import { useEffect, useState } from 'react';
import { CategoryIcon, IconGlobe, IconWallet, IconAward } from './Icons';
import { hiroTxUrl } from '@/lib/explorer';
import { CONTRACTS, tierName } from '@/lib/stacks';
import { fetchEarnStampTxs, getProviderCached } from '@/lib/hiro';

interface Stamp {
  id: number;
  providerName: string;
  category: string;
  ecoScore: number;
  points: number;
  mintedAt: string;
  txId: string;
  bookingHash: string;
}

const DEMO_STAMPS: Stamp[] = [
  { id: 1, providerName: 'The Green Lodge',  category: 'hotel',     ecoScore: 92, points: 3, mintedAt: '2026-02-14', txId: '0xabc...123', bookingHash: '0xdef...456' },
  { id: 2, providerName: 'EcoRail Europe',   category: 'train',     ecoScore: 97, points: 2, mintedAt: '2026-02-20', txId: '0x789...abc', bookingHash: '0xfed...321' },
  { id: 3, providerName: 'GreenWings Air',   category: 'airline',   ecoScore: 78, points: 5, mintedAt: '2026-03-01', txId: '0x321...fed', bookingHash: '0xcba...987' },
  { id: 4, providerName: 'City EV Share',    category: 'car-share', ecoScore: 88, points: 2, mintedAt: '2026-03-05', txId: '0x654...321', bookingHash: '0x111...222' },
  { id: 5, providerName: 'Bamboo Boutique',  category: 'hotel',     ecoScore: 95, points: 3, mintedAt: '2026-03-08', txId: '0xaaa...bbb', bookingHash: '0xccc...ddd' },
  { id: 6, providerName: 'Forest Treks Co.', category: 'activity',  ecoScore: 99, points: 1, mintedAt: '2026-03-09', txId: '0xeee...fff', bookingHash: '0x000...111' },
];

const CATEGORY_COLORS: Record<string, string> = {
  hotel:     'from-emerald-700 to-emerald-900',
  train:     'from-blue-700 to-blue-900',
  airline:   'from-sky-700 to-sky-900',
  'car-share':'from-amber-700 to-amber-900',
  activity:  'from-teal-700 to-teal-900',
  restaurant:'from-orange-700 to-orange-900',
};

const CATEGORY_BORDER: Record<string, string> = {
  hotel:      'border-emerald-500/40',
  train:      'border-blue-500/40',
  airline:    'border-sky-500/40',
  'car-share':'border-amber-500/40',
  activity:   'border-teal-500/40',
  restaurant: 'border-orange-500/40',
};

function StampCard({ stamp, index }: { stamp: Stamp; index: number }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="relative cursor-pointer group"
      style={{ perspective: '1000px', animationDelay: `${index * 0.08}s` }}
      onClick={() => setFlipped(!flipped)}
    >
      <div
        className="relative w-full transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          height: '240px',
        }}
      >
        {/* Front */}
        <div
          className={`absolute inset-0 rounded-3xl border ${CATEGORY_BORDER[stamp.category] || 'border-glow-300/20'}
                      bg-gradient-to-br ${CATEGORY_COLORS[stamp.category] || 'from-forest-700 to-forest-900'}
                      flex flex-col items-center justify-center gap-3 p-5
                      group-hover:shadow-[0_0_30px_rgba(168,230,184,0.15)]
                      transition-shadow duration-300 stamp-glow`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Stamp texture overlay */}
          <div className="absolute inset-0 rounded-3xl opacity-20"
               style={{
                 backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.03) 4px, rgba(255,255,255,0.03) 8px)',
               }} />

          {/* Eco score arc */}
          <div className="absolute top-3 right-3">
            <div className="glass-light rounded-xl px-2 py-1 text-xs font-mono text-glow-300">
              {stamp.ecoScore}
            </div>
          </div>

          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15
                          flex items-center justify-center animate-float"
               style={{ animationDelay: `${index * 0.3}s` }}>
            <CategoryIcon category={stamp.category} size={28} className="text-white" />
          </div>

          <div className="text-center">
            <div className="font-display text-base text-cream-100 leading-tight">{stamp.providerName}</div>
            <div className="text-xs text-sage-400 capitalize mt-0.5">{stamp.category}</div>
          </div>

          <div className="flex items-center gap-1.5 glass-light rounded-full px-3 py-1">
            <span className="text-glow-400 text-xs">+{stamp.points}</span>
            <span className="text-xs text-sage-400">eco points</span>
          </div>

          <div className="text-[10px] text-sage-600 font-mono">{stamp.mintedAt}</div>

          {/* Tap hint */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] text-sage-600 opacity-0 group-hover:opacity-100 transition-opacity">
            tap to flip ↺
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-3xl border border-glow-300/20
                      glass flex flex-col justify-between p-5"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div>
            <div className="text-xs uppercase tracking-widest text-sage-500 mb-3">Stamp Details</div>
            <div className="space-y-2">
              <Row label="Provider" value={stamp.providerName} />
              <Row label="Category" value={stamp.category} />
              <Row label="Eco Score" value={`${stamp.ecoScore}/100`} />
              <Row label="Points" value={`+${stamp.points}`} />
              <Row label="Minted" value={stamp.mintedAt} />
              <Row label="Booking" value={`${stamp.bookingHash.slice(0, 10)}…${stamp.bookingHash.slice(-6)}`} />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="text-[9px] text-sage-600 font-mono truncate">
              TX: {stamp.txId}
            </div>
            <a
              href={hiroTxUrl(stamp.txId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-glow-400 hover:text-glow-300 transition-colors"
              onClick={e => e.stopPropagation()}
            >
              View on Hiro Explorer ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-sage-500">{label}</span>
      <span className="text-xs text-cream-300 font-medium">{value}</span>
    </div>
  );
}

export default function StampGallery({ walletAddress }: { walletAddress: string | null }) {
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!walletAddress) {
        setStamps([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // If contracts aren't configured, fall back to demo stamps for the hackathon UI.
        if (!CONTRACTS.stampRegistry) {
          setStamps(DEMO_STAMPS);
          setLoading(false);
          return;
        }

        const txs = await fetchEarnStampTxs(walletAddress, 50);
        const hydrated: Stamp[] = [];
        for (let i = 0; i < txs.length; i++) {
          const tx = txs[i];
          const prov = await getProviderCached(tx.providerId);
          hydrated.push({
            id: i + 1,
            providerName: prov?.name || `Provider #${tx.providerId}`,
            category: prov?.category || 'activity',
            ecoScore: prov?.ecoScore || 0,
            points: tx.ecoPoints || 0,
            mintedAt: new Date(tx.mintedAt).toLocaleDateString(),
            txId: tx.txId,
            bookingHash: tx.bookingHash,
          });
        }

        if (!mounted) return;
        setStamps(hydrated);
        setLoading(false);
      } catch {
        if (!mounted) return;
        setStamps(DEMO_STAMPS);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [walletAddress]);

  const categories = ['all', ...Array.from(new Set(stamps.map(s => s.category)))];
  const filtered = filter === 'all' ? stamps : stamps.filter(s => s.category === filter);
  const totalPoints = stamps.reduce((acc, s) => acc + s.points, 0);
  const tier = totalPoints >= 60 ? 2 : totalPoints >= 20 ? 1 : 0;

  return (
    <section className="min-h-[calc(100vh-64px)] px-4 sm:px-6 lg:px-8 py-12 page-enter">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <h2 className="font-display text-4xl text-cream-100">My Stamps</h2>
          <p className="text-sage-400 mt-2">Your verifiable on-chain travel impact record.</p>
        </div>

        {!walletAddress ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-6 animate-float">
              <IconWallet size={32} className="text-sage-400" />
            </div>
            <h3 className="font-display text-2xl text-cream-200 mb-3">Connect your wallet</h3>
            <p className="text-sage-400 max-w-sm">Connect your Stacks wallet to see your eco stamps and impact score.</p>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-60 rounded-3xl glass shimmer" />
            ))}
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: 'Total Stamps', value: stamps.length },
                { label: 'Eco Points',   value: totalPoints   },
                { label: 'Tier', value: tierName(tier) },
              ].map(stat => (
                <div key={stat.label} className="glass rounded-2xl p-4 text-center">
                  <div className="font-display text-2xl text-glow-300">{stat.value}</div>
                  <div className="text-xs text-sage-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all duration-200
                    ${filter === cat
                      ? 'bg-moss-500 text-cream-100 border border-glow-300/30'
                      : 'glass-light text-sage-400 hover:text-cream-200 border border-transparent'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
              <div className="text-center py-20 text-sage-500">No stamps in this category yet.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filtered.map((stamp, i) => (
                  <div key={stamp.id} className="animate-fade-up" style={{ animationDelay: `${i * 0.06}s`, animationFillMode: 'both' }}>
                    <StampCard stamp={stamp} index={i} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
