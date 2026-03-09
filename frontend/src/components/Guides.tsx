'use client';

/**
 * EcoStamp Phase 2 — Guides
 * Premium eco travel guides gated behind x402 micropayments.
 * Stamp-holders get 50% discount automatically via stamp token.
 */

import { useState, useEffect } from 'react';
import {
  IconLeaf, IconGlobe, IconTrain, IconHotel,
  IconBitcoin, IconCheck, IconSearch, IconLink,
  IconZap, IconArrowRight, IconWallet, IconVerified
} from './Icons';
import { useX402 } from '@/hooks/useX402';
import { useStampToken } from '@/hooks/useStampToken';

// ── Types ──────────────────────────────────────────────────────────────────

interface GuidePreview {
  slug:     string;
  title:    string;
  excerpt:  string;
  category: string;
  readTime: string;
  price:    string;
}

interface RouteOption {
  rank:          number;
  mode:          string;
  operator:      string;
  duration:      string;
  co2:           number;
  cost:          string;
  ecoScore:      number;
  note:          string;
  stampProvider: string | null;
}

// ── Static guide index (free teasers, fetched from /guides) ────────────────

const GUIDE_INDEX: GuidePreview[] = [
  {
    slug:     'train-travel-europe',
    title:    'The Definitive Guide to Carbon-Optimal Rail Travel in Europe',
    excerpt:  "Europe's rail network cuts emissions by up to 90% vs flying. Plan the perfect low-carbon itinerary.",
    category: 'transport',
    readTime: '12 min',
    price:    '$0.001',
  },
  {
    slug:     'eco-hotels-certification',
    title:    "How to Verify an Eco Hotel's Sustainability Claims",
    excerpt:  "Greenwashing is rife in hotel marketing. Learn to read certifications and what actually matters.",
    category: 'accommodation',
    readTime: '8 min',
    price:    '$0.001',
  },
  {
    slug:     'carbon-budget-travel',
    title:    'Your Annual Carbon Budget for Travel: A Practical Framework',
    excerpt:  'Travel meaningfully within a 1.5°C-aligned personal carbon budget, without giving up exploration.',
    category: 'sustainability',
    readTime: '10 min',
    price:    '$0.001',
  },
];

const CATEGORY_ICON: Record<string, React.FC<any>> = {
  transport:     IconTrain,
  accommodation: IconHotel,
  sustainability: IconLeaf,
};

// ── Main component ────────────────────────────────────────────────────────

export default function Guides({ walletAddress }: { walletAddress: string | null }) {
  const [activeTab, setActiveTab]           = useState<'guides' | 'routes'>('guides');
  const [selectedGuide, setSelectedGuide]   = useState<GuidePreview | null>(null);
  const [routeFrom, setRouteFrom]           = useState('London');
  const [routeTo, setRouteTo]               = useState('Paris');

  const { stampToken, tier, stampCount, loading: tokenLoading } = useStampToken(walletAddress);

  const guideX402 = useX402({ walletAddress, stampToken });
  const routeX402 = useX402({ walletAddress, stampToken });

  const hasDiscount = !!stampToken;

  // ── Fetch guide on selection ─────────────────────────────────────────────
  const openGuide = (guide: GuidePreview) => {
    setSelectedGuide(guide);
    guideX402.reset();
    guideX402.fetchContent(`/guides/${guide.slug}`);
  };

  const fetchRoute = () => {
    routeX402.reset();
    routeX402.fetchContent(`/routes/carbon-optimal?from=${encodeURIComponent(routeFrom)}&to=${encodeURIComponent(routeTo)}`);
  };

  // ── Guide reader view ────────────────────────────────────────────────────
  if (selectedGuide) {
    return (
      <section className="min-h-[calc(100vh-64px)] px-4 sm:px-6 lg:px-8 py-12 page-enter">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => { setSelectedGuide(null); guideX402.reset(); }}
            className="text-sage-500 hover:text-sage-300 transition-colors text-sm mb-8 flex items-center gap-2"
          >
            ← Back to Guides
          </button>

          <GuideReader
            guide={selectedGuide}
            state={guideX402.state}
            onConfirmPayment={guideX402.confirmPayment}
            onRetry={() => openGuide(selectedGuide)}
            hasDiscount={hasDiscount}
            tier={tier}
          />
        </div>
      </section>
    );
  }

  // ── Main guides view ─────────────────────────────────────────────────────
  return (
    <section className="min-h-[calc(100vh-64px)] px-4 sm:px-6 lg:px-8 py-12 page-enter">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-4xl text-cream-100">Premium Guides</h2>
            <p className="text-sage-400 mt-2">
              Pay-per-access eco travel intelligence. Verified data, zero subscriptions.
            </p>
          </div>
          <X402Badge />
        </div>

        {/* Stamp discount banner */}
        {walletAddress && (
          <StampDiscountBanner
            loading={tokenLoading}
            hasDiscount={hasDiscount}
            tier={tier}
            stampCount={stampCount}
          />
        )}

        {/* Tabs */}
        <div className="flex gap-1 glass-light rounded-2xl p-1 w-fit">
          {(['guides', 'routes'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 capitalize
                ${activeTab === tab
                  ? 'bg-moss-500/40 text-glow-300 border border-glow-300/20'
                  : 'text-sage-400 hover:text-cream-200'}`}
            >
              {tab === 'guides' ? 'Eco Guides' : 'Route Planner'}
            </button>
          ))}
        </div>

        {/* ── Guides tab ────────────────────────────────────────────────── */}
        {activeTab === 'guides' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {GUIDE_INDEX.map((guide, i) => {
              const Icon = CATEGORY_ICON[guide.category] ?? IconLeaf;
              const effectivePrice = hasDiscount
                ? `$${(parseFloat(guide.price.slice(1)) / 2).toFixed(4)}`
                : guide.price;
              return (
                <button
                  key={guide.slug}
                  onClick={() => openGuide(guide)}
                  className="group glass rounded-3xl p-6 text-left hover:border-glow-300/25
                             transition-all duration-300 hover:-translate-y-1
                             hover:shadow-[0_8px_32px_rgba(74,124,89,0.2)]
                             animate-fade-up flex flex-col gap-4"
                  style={{ animationDelay: `${i * 0.1}s`, animationFillMode: 'both' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-11 h-11 rounded-2xl bg-forest-gradient border border-glow-300/20
                                    flex items-center justify-center">
                      <Icon size={20} className="text-white" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-xs font-mono glass-light rounded-full px-2.5 py-1 text-glow-400 border border-glow-300/20">
                        {effectivePrice} USDC
                      </div>
                      {hasDiscount && (
                        <div className="text-[10px] text-sage-500 line-through">{guide.price}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="text-xs uppercase tracking-widest text-sage-500 mb-2 capitalize">
                      {guide.category}
                    </div>
                    <h3 className="font-display text-base text-cream-100 leading-snug mb-2
                                   group-hover:text-glow-300 transition-colors">
                      {guide.title}
                    </h3>
                    <p className="text-xs text-sage-500 leading-relaxed line-clamp-3">
                      {guide.excerpt}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-sage-600">{guide.readTime} read</span>
                    <span className="text-xs text-glow-400 group-hover:text-glow-300 flex items-center gap-1
                                     transition-colors">
                      Read <IconArrowRight size={12} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Route planner tab ─────────────────────────────────────────── */}
        {activeTab === 'routes' && (
          <div className="space-y-6">
            {/* Route input */}
            <div className="glass rounded-3xl p-6 sm:p-8">
              <h3 className="font-display text-xl text-cream-100 mb-6">Carbon-Optimal Route Finder</h3>

              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs text-sage-500 uppercase tracking-widest mb-2">From</label>
                  <select
                    value={routeFrom}
                    onChange={e => setRouteFrom(e.target.value)}
                    className="eco-input"
                  >
                    <option>London</option>
                    <option>Amsterdam</option>
                    <option>Paris</option>
                  </select>
                </div>
                <div className="text-sage-500 pb-3 text-lg">→</div>
                <div className="flex-1">
                  <label className="block text-xs text-sage-500 uppercase tracking-widest mb-2">To</label>
                  <select
                    value={routeTo}
                    onChange={e => setRouteTo(e.target.value)}
                    className="eco-input"
                  >
                    <option>Paris</option>
                    <option>Berlin</option>
                    <option>Barcelona</option>
                  </select>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={fetchRoute}
                    disabled={routeX402.state.status === 'fetching' || routeX402.state.status === 'paying'}
                    className="btn-primary py-3 px-6 text-sm disabled:opacity-50"
                  >
                    {routeX402.state.status === 'fetching' ? 'Fetching…' : 'Find Routes'}
                  </button>
                  <span className="text-[10px] text-sage-600">
                    {hasDiscount ? '$0.001' : '$0.002'} USDC
                  </span>
                </div>
              </div>

              {/* Route results */}
              {routeX402.state.status === 'payment_required' && (
                <PaymentPrompt
                  price={routeX402.state.price}
                  description={routeX402.state.description}
                  network={routeX402.state.network}
                  hasDiscount={hasDiscount}
                  onConfirm={routeX402.confirmPayment}
                  onCancel={routeX402.reset}
                />
              )}

              {routeX402.state.status === 'paying' && (
                <PayingSpinner label="Processing payment…" />
              )}

              {routeX402.state.status === 'success' && (
                <RouteResults data={routeX402.state.data} />
              )}

              {routeX402.state.status === 'error' && (
                <ErrorBanner message={routeX402.state.message} onRetry={fetchRoute} />
              )}
            </div>

            <div className="glass-light rounded-2xl p-4 text-xs text-sage-500 flex gap-3">
              <IconLink size={14} className="text-sage-400 shrink-0 mt-0.5" />
              <span>
                Route data is sourced from ADEME transport emission factors and live rail APIs.
                Powered by x402 micropayments — you pay only for routes you actually query.
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function GuideReader({
  guide, state, onConfirmPayment, onRetry, hasDiscount, tier,
}: {
  guide:            GuidePreview;
  state:            ReturnType<typeof useX402>['state'];
  onConfirmPayment: () => void;
  onRetry:          () => void;
  hasDiscount:      boolean;
  tier:             string;
}) {
  const Icon = CATEGORY_ICON[guide.category] ?? IconLeaf;

  return (
    <div className="space-y-6">
      {/* Guide header */}
      <div className="glass rounded-3xl p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-forest-gradient border border-glow-300/20
                          flex items-center justify-center shrink-0">
            <Icon size={22} className="text-white" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-sage-500 mb-1 capitalize">
              {guide.category}
            </div>
            <h2 className="font-display text-2xl text-cream-100 leading-snug">{guide.title}</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-sage-500">{guide.readTime} read</span>
              <span className="text-xs text-sage-700">•</span>
              <span className="text-xs font-mono text-glow-400 glass-light rounded-full px-2 py-0.5">
                {hasDiscount
                  ? `$${(parseFloat(guide.price.slice(1)) / 2).toFixed(4)}`
                  : guide.price} USDC
              </span>
              {hasDiscount && (
                <span className="text-[10px] text-glow-400 bg-glow-400/10 rounded-full px-2 py-0.5 border border-glow-400/20">
                  {tier} discount applied
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="text-sage-400 leading-relaxed">{guide.excerpt}</p>
      </div>

      {/* Content area */}
      <div className="glass rounded-3xl overflow-hidden">
        {state.status === 'idle' || state.status === 'fetching' ? (
          <div className="p-8 text-center space-y-4">
            <div className="relative mx-auto w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-glow-300/20 animate-spin"
                   style={{ borderTopColor: 'rgba(168,230,184,0.8)' }} />
              <div className="absolute inset-3 rounded-full bg-forest-gradient flex items-center justify-center">
                <IconSearch size={18} className="text-white" />
              </div>
            </div>
            <p className="text-sage-500 text-sm">Checking access…</p>
          </div>
        ) : state.status === 'payment_required' ? (
          <div className="p-8">
            {/* Blurred preview */}
            <div className="relative mb-6">
              <div className="blur-sm select-none pointer-events-none opacity-40 text-sm text-sage-300 leading-loose font-mono space-y-2">
                <div className="h-4 bg-sage-700/30 rounded w-3/4" />
                <div className="h-4 bg-sage-700/20 rounded w-full" />
                <div className="h-4 bg-sage-700/20 rounded w-5/6" />
                <div className="h-4 bg-sage-700/30 rounded w-2/3" />
                <div className="h-4 bg-sage-700/20 rounded w-full" />
                <div className="h-4 bg-sage-700/20 rounded w-4/5" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-forest-900/90 via-forest-900/50 to-transparent" />
            </div>
            <PaymentPrompt
              price={state.price}
              description={state.description}
              network={state.network}
              hasDiscount={hasDiscount}
              onConfirm={onConfirmPayment}
              onCancel={onRetry}
            />
          </div>
        ) : state.status === 'paying' ? (
          <div className="p-12">
            <PayingSpinner label="Signing USDC permit and verifying payment…" />
          </div>
        ) : state.status === 'success' ? (
          <GuideContent data={state.data} paidAt={state.paidAt} />
        ) : state.status === 'error' ? (
          <div className="p-8">
            <ErrorBanner message={state.message} onRetry={onRetry} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GuideContent({ data, paidAt }: { data: any; paidAt: string }) {
  const guide = data?.guide;
  if (!guide) return null;

  return (
    <div className="p-8">
      {/* Payment receipt */}
      <div className="flex items-center gap-2 glass-light rounded-xl px-4 py-2.5 mb-8 w-fit border border-glow-300/15">
        <div className="w-2 h-2 rounded-full bg-glow-400" />
        <span className="text-xs text-sage-400">
          Paid via x402 · {new Date(paidAt).toLocaleTimeString()}
        </span>
        {guide.stampBonus && (
          <>
            <span className="text-sage-700">·</span>
            <span className="text-xs text-glow-400 capitalize">{guide.stampBonus.tier} discount applied</span>
          </>
        )}
      </div>

      {/* Guide markdown (rendered as pre-formatted text for hackathon) */}
      <article className="prose-eco">
        {guide.content?.split('\n').map((line: string, i: number) => {
          if (line.startsWith('# '))
            return <h1 key={i} className="font-display text-3xl text-cream-100 mt-8 mb-4 first:mt-0">{line.slice(2)}</h1>;
          if (line.startsWith('## '))
            return <h2 key={i} className="font-display text-xl text-cream-200 mt-6 mb-3 border-b border-sage-700/30 pb-2">{line.slice(3)}</h2>;
          if (line.startsWith('## '))
            return <h3 key={i} className="font-display text-lg text-cream-200 mt-5 mb-2">{line.slice(4)}</h3>;
          if (line.startsWith('- '))
            return <li key={i} className="text-sage-300 ml-4 mb-1 list-disc">{line.slice(2)}</li>;
          if (line.startsWith('|'))
            return null; // Skip table lines for now (hackathon simplification)
          if (line.trim() === '')
            return <div key={i} className="h-3" />;
          if (line.match(/^\d+\./))
            return <p key={i} className="text-sage-300 mb-2 ml-4">{line}</p>;
          return <p key={i} className="text-sage-300 leading-relaxed mb-2">{line}</p>;
        })}
      </article>
    </div>
  );
}

function RouteResults({ data }: { data: any }) {
  if (!data?.routes?.length) {
    return (
      <div className="mt-6 text-center text-sage-500 py-6">
        No routes found for this city pair.
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-lg text-cream-100">
          {data.query?.from} → {data.query?.to}
        </h4>
        <div className="flex items-center gap-2 glass-light rounded-xl px-3 py-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-glow-400" />
          <span className="text-xs text-sage-400">Paid via x402</span>
        </div>
      </div>
      <div className="text-xs text-glow-400">{data.carbonSaved}</div>

      <div className="space-y-3">
        {data.routes.map((route: RouteOption) => (
          <div
            key={route.rank}
            className={`rounded-2xl p-5 transition-all duration-200 border
              ${route.rank === 1
                ? 'bg-forest-700/40 border-glow-300/20'
                : 'glass border-sage-700/20'}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono
                  ${route.rank === 1 ? 'bg-glow-400/20 text-glow-300 border border-glow-300/30' : 'glass-light text-sage-500'}`}>
                  #{route.rank}
                </div>
                <div>
                  <div className="font-medium text-cream-200 text-sm">{route.operator}</div>
                  <div className="text-xs text-sage-500 capitalize">{route.mode} · {route.duration}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-right shrink-0">
                <div>
                  <div className="text-sm text-cream-200 font-mono">{route.cost}</div>
                  <div className="text-xs text-sage-500">{route.co2}kg CO₂</div>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-mono font-bold
                  ${route.ecoScore >= 90 ? 'bg-glow-400/15 text-glow-300 border border-glow-300/20'
                  : route.ecoScore >= 70 ? 'bg-amber-400/10 text-amber-300 border border-amber-300/20'
                  : 'bg-red-400/10 text-red-300 border border-red-300/20'}`}>
                  {route.ecoScore}
                </div>
              </div>
            </div>
            {route.note && (
              <p className="text-xs text-sage-500 mt-3 ml-11">{route.note}</p>
            )}
            {route.stampProvider && (
              <div className="flex items-center gap-1.5 mt-3 ml-11">
                <IconVerified size={12} className="text-glow-400" />
                <span className="text-xs text-glow-400">EcoStamp provider: {route.stampProvider}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentPrompt({
  price, description, network, hasDiscount, onConfirm, onCancel,
}: {
  price:       string;
  description: string;
  network:     string;
  hasDiscount: boolean;
  onConfirm:   () => void;
  onCancel:    () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="glass rounded-2xl p-5 border border-glow-300/15 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-forest-gradient flex items-center justify-center">
            <IconBitcoin size={18} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-cream-200">Payment Required</div>
            <div className="text-xs text-sage-500">{description}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Amount', value: price },
            { label: 'Currency', value: 'USDC' },
            { label: 'Network', value: network.replace('base-', 'Base ') },
          ].map(({ label, value }) => (
            <div key={label} className="glass-light rounded-xl p-3 text-center">
              <div className="text-xs text-sage-500 mb-1">{label}</div>
              <div className="text-sm font-mono text-cream-200">{value}</div>
            </div>
          ))}
        </div>

        {hasDiscount && (
          <div className="flex items-center gap-2 text-xs text-glow-400 bg-glow-400/8 rounded-xl px-3 py-2.5 border border-glow-400/15">
            <IconVerified size={12} />
            Stamp-holder discount applied — 50% off standard rate
          </div>
        )}

        <div className="text-xs text-sage-600 leading-relaxed">
          By confirming, your wallet will sign a USDC payment authorization (EIP-712).
          No gas required — payment settles instantly on {network}.
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-ghost flex-1 py-3 text-sm">
          Cancel
        </button>
        <button onClick={onConfirm} className="btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-2">
          <IconZap size={14} />
          Pay & Unlock
        </button>
      </div>
    </div>
  );
}

function PayingSpinner({ label }: { label: string }) {
  return (
    <div className="py-10 text-center space-y-4">
      <div className="relative mx-auto w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-glow-300/20 animate-spin"
             style={{ borderTopColor: 'rgba(168,230,184,0.8)' }} />
        <div className="absolute inset-3 rounded-full bg-forest-gradient flex items-center justify-center">
          <IconZap size={18} className="text-white" />
        </div>
      </div>
      <p className="text-sage-400 text-sm">{label}</p>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="glass rounded-2xl p-5 border border-red-400/20 space-y-3">
      <div className="text-sm text-red-400">{message}</div>
      <button onClick={onRetry} className="text-xs text-glow-400 hover:text-glow-300 transition-colors">
        Try again →
      </button>
    </div>
  );
}

function StampDiscountBanner({
  loading, hasDiscount, tier, stampCount,
}: {
  loading:     boolean;
  hasDiscount: boolean;
  tier:        string;
  stampCount:  number;
}) {
  if (loading) return null;

  if (hasDiscount) {
    return (
      <div className="glass rounded-2xl px-5 py-3.5 flex items-center gap-3 border border-glow-300/15 animate-fade-up">
        <div className="w-2 h-2 rounded-full bg-glow-400 animate-pulse shrink-0" />
        <span className="text-sm text-sage-300">
          <span className="text-glow-300 font-medium capitalize">{tier} stamp-holder</span>
          {' '}({stampCount} stamps) — 50% discount applied to all content prices
        </span>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl px-5 py-3.5 flex items-center gap-3 border border-sage-500/15 animate-fade-up">
      <IconLeaf size={14} className="text-sage-500 shrink-0" />
      <span className="text-sm text-sage-500">
        Earn EcoStamps to unlock 50% discount on all premium content.
      </span>
    </div>
  );
}

function X402Badge() {
  return (
    <div className="flex items-center gap-2 glass-light rounded-2xl px-4 py-2.5 border border-glow-300/10 shrink-0">
      <div className="w-5 h-5 rounded-lg bg-forest-gradient flex items-center justify-center">
        <IconZap size={11} className="text-white" />
      </div>
      <div>
        <div className="text-xs font-medium text-cream-200">Powered by x402</div>
        <div className="text-[10px] text-sage-600">HTTP-native micropayments</div>
      </div>
    </div>
  );
}