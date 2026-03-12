'use client';

/**
 * EcoStamp Phase 3 -- ImpactDashboard
 * Live on-chain data via useRewardPool hook.
 * Tier, stamp count, pool balance, and claimable amount are all read
 * from stamp-registry and reward-pool contracts on Stacks testnet.
 * Falls back to demo values when contracts are not yet deployed.
 */

import { useEffect, useState } from 'react';
import { CategoryIcon, IconWallet, IconAward, IconGlobe, IconLeaf, IconBitcoin, IconVerified, IconZap, IconCheck } from './Icons';
import { useRewardPool } from '@/hooks/useRewardPool';
import { TIER_CONFIG, satsToBtc, satsToDisplay } from '@/lib/stacks';
import { hiroTxUrl } from '@/lib/explorer';

const ACTIVITY = [
  { action: 'Stamp minted', provider: 'The Green Lodge',  points: '+3', date: '2026-03-09', category: 'hotel'     },
  { action: 'Stamp minted', provider: 'EcoRail Europe',   points: '+2', date: '2026-03-01', category: 'train'     },
  { action: 'Stamp minted', provider: 'GreenWings Air',   points: '+5', date: '2026-02-20', category: 'airline'   },
  { action: 'Tier reached', provider: 'Silver unlocked',  points: '',   date: '2026-02-15', category: 'tier'      },
  { action: 'Stamp minted', provider: 'City EV Share',    points: '+2', date: '2026-02-14', category: 'car-share' },
];

export default function ImpactDashboard({ walletAddress }: { walletAddress: string | null }) {
  const {
    loading, tier, tierLabel, stampCount, ecoPoints,
    summary, claiming, claimTxid, claimError,
    claimReward, clearClaimState,
  } = useRewardPool(walletAddress);

  const [animatedPoints, setAnimatedPoints] = useState(0);
  const [loaded, setLoaded]                 = useState(false);

  const currentTier = TIER_CONFIG[tier] ?? TIER_CONFIG[0];
  const nextTier    = TIER_CONFIG[Math.min(tier + 1, 2)];
  const isMaxTier   = tier === 2;
  const totalPoints = ecoPoints || stampCount || 0;

  // Animate points counter on load
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loaded || totalPoints === 0) return;
    let cur = 0;
    const step = Math.max(1, Math.ceil(totalPoints / 30));
    const iv = setInterval(() => {
      cur = Math.min(cur + step, totalPoints);
      setAnimatedPoints(cur);
      if (cur >= totalPoints) clearInterval(iv);
    }, 40);
    return () => clearInterval(iv);
  }, [loaded, totalPoints]);

  // Not connected
  if (!walletAddress) {
    return (
      <section className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 page-enter">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-6 mx-auto animate-float">
            <IconWallet size={32} className="text-sage-400" />
          </div>
          <h3 className="font-display text-2xl text-cream-200 mb-3">Connect your wallet</h3>
          <p className="text-sage-400 max-w-sm">Your impact dashboard will appear once you connect.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[calc(100vh-64px)] px-4 sm:px-6 lg:px-8 py-12 page-enter">
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-4xl text-cream-100">My Impact</h2>
            <p className="text-sage-400 mt-2">Your sustainable travel reputation, on-chain.</p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 glass-light rounded-xl px-3 py-2 text-xs text-sage-500">
              <div className="w-1.5 h-1.5 rounded-full bg-glow-400 animate-pulse" />
              Syncing chain...
            </div>
          )}
        </div>

        {/* Main score card */}
        <div className="glass rounded-3xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5"
               style={{ background: `radial-gradient(ellipse at 20% 50%, ${currentTier.glow} 0%, transparent 70%)` }} />
          <div className="grid sm:grid-cols-3 gap-8 relative z-10">

            {/* Score */}
            <div className="text-center sm:text-left">
              <div className="text-xs uppercase tracking-widest text-sage-500 mb-2">Eco Points</div>
              <div className="font-display text-7xl text-gradient">{animatedPoints}</div>
              <div className="text-sage-400 text-sm mt-1">
                {isMaxTier ? 'Gold tier — max rewards' : `of ${nextTier.threshold} for ${nextTier.name}`}
              </div>
            </div>

            {/* Tier */}
            <div className="text-center">
              <div className="text-xs uppercase tracking-widest text-sage-500 mb-2">Current Tier</div>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2 border animate-float"
                   style={{ borderColor: `${currentTier.color}50`, background: `${currentTier.color}18` }}>
                <div style={{ color: currentTier.color }}>
                  <IconAward size={32} className="text-current" />
                </div>
              </div>
              <div className="font-display text-xl" style={{ color: currentTier.color }}>
                {tierLabel}
              </div>
            </div>

            {/* Progress */}
            <div className="flex flex-col justify-center gap-3">
              {isMaxTier ? (
                <div className="flex items-center gap-2 text-sm text-glow-400">
                  <IconVerified size={16} /> Maximum tier reached
                </div>
              ) : (
                <>
                  <div className="text-xs uppercase tracking-widest text-sage-500">
                    Progress to {nextTier.name}
                  </div>
                  <div className="relative h-3 bg-forest-800 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-moss-500 to-glow-400 transition-all duration-1000"
                      style={{ width: loaded ? `${Math.min((totalPoints / nextTier.threshold) * 100, 100)}%` : '0%' }}
                    />
                    <div className="absolute inset-0 shimmer opacity-50" />
                  </div>
                  <div className="flex justify-between text-xs text-sage-500">
                    <span>{totalPoints} pts</span>
                    <span>{nextTier.threshold} pts needed</span>
                  </div>
                  <div className="glass-light rounded-xl p-3 text-sm text-sage-300 border border-sage-400/10">
                    <span className="text-glow-400 font-medium">{nextTier.threshold - totalPoints} more points</span> to {nextTier.name}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Stamps', value: String(stampCount || summary?.claimCount || 0),     Icon: IconAward   },
            { label: 'Countries',    value: '4',                                                 Icon: IconGlobe   },
            { label: 'CO2 Saved',    value: `~${(stampCount || 1) * 53}kg`,                      Icon: IconLeaf    },
            { label: 'Pool Balance', value: satsToDisplay(summary?.poolBalance ?? 42_000_000),   Icon: IconBitcoin },
          ].map((s, i) => (
            <div key={s.label}
                 className="glass rounded-2xl p-5 text-center animate-fade-up"
                 style={{ animationDelay: `${i * 0.1}s`, animationFillMode: 'both' }}>
              <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center mx-auto mb-2">
                <s.Icon size={18} className="text-white/80" />
              </div>
              <div className="font-display text-xl text-cream-100">{s.value}</div>
              <div className="text-xs text-sage-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">

          {/* Tier roadmap */}
          <div className="glass rounded-3xl p-6">
            <h3 className="font-display text-lg text-cream-100 mb-5">Tier Roadmap</h3>
            <div className="space-y-4">
              {TIER_CONFIG.map((t, i) => {
                const isActive = i === tier;
                const isLocked = i > tier;
                return (
                  <div key={t.name}
                       className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300
                         ${isActive ? 'border border-glow-300/30 bg-forest-700/30' : 'opacity-60'}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                         style={{ borderColor: `${t.color}40`, background: `${t.color}18` }}>
                      <div style={{ color: t.color }}>
                        <IconAward size={18} className="text-current" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-cream-200">{t.name}</span>
                        {isActive && (
                          <span className="text-[10px] bg-glow-400/20 text-glow-300 rounded-full px-2 py-0.5">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-sage-500 mt-0.5">
                        {t.threshold === 0 ? 'Starting tier' : `${t.threshold}+ eco points`}
                      </div>
                    </div>
                    <div className="text-right text-xs" style={{ color: t.color }}>
                      {isLocked
                        ? `+${t.threshold - totalPoints} pts`
                        : isActive ? 'Active' : '✓ Unlocked'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity feed */}
          <div className="glass rounded-3xl p-6">
            <h3 className="font-display text-lg text-cream-100 mb-5">Activity</h3>
            <div className="space-y-3">
              {ACTIVITY.map((item, i) => (
                <div key={i}
                     className="flex items-center gap-3 py-2 border-b border-sage-700/20 last:border-0 animate-fade-up"
                     style={{ animationDelay: `${i * 0.06}s`, animationFillMode: 'both' }}>
                  <div className="w-8 h-8 rounded-xl glass-light flex items-center justify-center shrink-0">
                    {item.category === 'tier'
                      ? <IconAward size={15} className="text-white/80" />
                      : <CategoryIcon category={item.category} size={15} className="text-white/80" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-cream-200 truncate">{item.provider}</div>
                    <div className="text-xs text-sage-500">{item.date}</div>
                  </div>
                  {item.points && (
                    <div className="text-sm text-glow-400 font-mono shrink-0">{item.points}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* sBTC Reward claim */}
        <RewardClaimCard
          summary={summary}
          tier={tier}
          tierLabel={tierLabel}
          tierColor={currentTier.color}
          claiming={claiming}
          claimTxid={claimTxid}
          claimError={claimError}
          onClaim={claimReward}
          onDismiss={clearClaimState}
          stampCount={stampCount}
        />

      </div>
    </section>
  );
}

// ── Reward claim card ─────────────────────────────────────────────────────────

function RewardClaimCard({
  summary, tier, tierLabel, tierColor,
  claiming, claimTxid, claimError,
  onClaim, onDismiss, stampCount,
}: {
  summary:    ReturnType<typeof useRewardPool>['summary'];
  tier:       number;
  tierLabel:  string;
  tierColor:  string;
  claiming:   boolean;
  claimTxid:  string | null;
  claimError: string | null;
  onClaim:    () => void;
  onDismiss:  () => void;
  stampCount: number;
}) {
  const claimable       = summary?.claimable       ?? 0;
  const poolBalance     = summary?.poolBalance     ?? 42_000_000;
  const cooldownBlocks  = summary?.cooldownBlocks  ?? 0;
  const canClaim        = summary?.canClaim        ?? false;
  const userClaimed     = summary?.userTotalClaimed ?? 0;

  return (
    <div className="glass rounded-3xl p-6 sm:p-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5 pointer-events-none"
           style={{ background: `radial-gradient(circle, ${tierColor} 0%, transparent 70%)`,
                    transform: 'translate(30%,-30%)' }} />

      <div className="relative z-10 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-sage-500 mb-1">Available Reward</div>
            <div className="font-display text-3xl text-cream-100">
              {claimable > 0
                ? <>{satsToBtc(claimable)} <span className="text-glow-400 text-xl">sBTC</span></>
                : <span className="text-sage-500 text-2xl">0.000000 sBTC</span>
              }
            </div>
            <div className="text-sm text-sage-400 mt-1">
              {tierLabel} tier + {stampCount} stamp{stampCount !== 1 ? 's' : ''}.
              Pool: {satsToDisplay(poolBalance)}
            </div>
          </div>

          <div className="flex flex-col gap-2 items-end">
            <button
              onClick={onClaim}
              disabled={!canClaim || claiming}
              className={`btn-primary px-8 py-4 text-sm whitespace-nowrap flex items-center gap-2
                ${(!canClaim || claiming) ? 'opacity-50 cursor-not-allowed hover:translate-y-0' : ''}`}
            >
              {claiming
                ? <><IconZap size={16} className="animate-pulse" /> Claiming...</>
                : <><IconBitcoin size={16} /> Claim Reward</>
              }
            </button>
            {!canClaim && cooldownBlocks > 0 && (
              <div className="text-xs text-sage-600 text-right">
                Available in ~{Math.ceil(cooldownBlocks * 10 / 60 / 24)} days
              </div>
            )}
            {!canClaim && cooldownBlocks === 0 && claimable === 0 && (
              <div className="text-xs text-sage-600 text-right">
                Earn more stamps to unlock rewards
              </div>
            )}
          </div>
        </div>

        {/* Tier weight explanation */}
        <div className="grid grid-cols-3 gap-3">
          {([['Bronze', '1x', '#cd7f32'], ['Silver', '3x', '#c0c0c0'], ['Gold', '7x', '#ffd700']] as const).map(([name, weight, color]) => (
            <div key={name}
                 className={`glass-light rounded-2xl p-3 text-center border transition-all
                   ${tierLabel === name ? 'border-glow-300/30' : 'border-transparent opacity-50'}`}>
              <div className="text-lg font-display" style={{ color }}>{weight}</div>
              <div className="text-xs text-sage-500 mt-0.5">{name}</div>
            </div>
          ))}
        </div>

        {/* Claimed so far */}
        {userClaimed > 0 && (
          <div className="glass-light rounded-2xl px-4 py-3 flex items-center gap-3 border border-glow-300/10">
            <IconCheck size={14} className="text-glow-400 shrink-0" />
            <span className="text-xs text-sage-400">
              You have claimed <span className="text-glow-300">{satsToDisplay(userClaimed)}</span> total
              across {summary?.claimCount} epoch{(summary?.claimCount ?? 0) !== 1 ? 's' : ''}.
            </span>
          </div>
        )}

        {/* Success */}
        {claimTxid && (
          <div className="glass rounded-2xl p-4 border border-glow-300/20 space-y-2">
            <div className="flex items-center gap-2 text-sm text-glow-400">
              <IconVerified size={16} /> Claim broadcast successfully
            </div>
            <div className="font-mono text-xs text-sage-500 break-all">{claimTxid}</div>
            <div className="flex gap-3">
              <a href={hiroTxUrl(claimTxid)}
                 target="_blank" rel="noopener noreferrer"
                 className="text-xs text-glow-400 hover:text-glow-300 transition-colors">
                View on Explorer →
              </a>
              <button onClick={onDismiss} className="text-xs text-sage-600 hover:text-sage-400 transition-colors">
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {claimError && (
          <div className="glass rounded-2xl p-4 border border-red-400/20 text-sm text-red-400">
            {claimError}
          </div>
        )}
      </div>
    </div>
  );
}
