'use client';

import { useEffect, useState } from 'react';
import { CategoryIcon, IconWallet, IconTrendingUp, IconAward, IconGlobe, IconLeaf, IconBitcoin, IconMap, IconVerified, IconArrowRight } from './Icons';

const TIER_CONFIG = [
  { name: 'Bronze', threshold: 0,   max: 20,  label: 'Starting tier',  color: '#cd7f32', glow: 'rgba(205,127,50,0.2)'  },
  { name: 'Silver', threshold: 20,  max: 60,  label: '20+ eco points', color: '#c0c0c0', glow: 'rgba(192,192,192,0.2)' },
  { name: 'Gold',   threshold: 60,  max: 999, label: '60+ eco points', color: '#ffd700', glow: 'rgba(255,215,0,0.2)'   },
];

const ACTIVITY = [
  { action: 'Stamp minted', provider: 'The Green Lodge',  points: '+3', date: '2026-03-09', category: 'hotel'     },
  { action: 'Stamp minted', provider: 'EcoRail Europe',   points: '+2', date: '2026-03-01', category: 'train'     },
  { action: 'Stamp minted', provider: 'GreenWings Air',   points: '+5', date: '2026-02-20', category: 'airline'   },
  { action: 'Tier reached', provider: 'Silver unlocked',  points: '',   date: '2026-02-15', category: 'tier'      },
  { action: 'Stamp minted', provider: 'City EV Share',    points: '+2', date: '2026-02-14', category: 'car-share' },
];

export default function ImpactDashboard({ walletAddress }: { walletAddress: string | null }) {
  const [loaded, setLoaded] = useState(false);
  const [animatedPoints, setAnimatedPoints] = useState(0);

  const totalPoints = 16;
  const currentTier = TIER_CONFIG[0]; // Bronze
  const nextTier    = TIER_CONFIG[1]; // Silver
  const progress = (totalPoints / nextTier.threshold) * 100;

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 300);
    return () => clearTimeout(t);
  }, []);

  // Animate points counter
  useEffect(() => {
    if (!loaded) return;
    let current = 0;
    const step = Math.ceil(totalPoints / 30);
    const interval = setInterval(() => {
      current += step;
      if (current >= totalPoints) {
        setAnimatedPoints(totalPoints);
        clearInterval(interval);
      } else {
        setAnimatedPoints(current);
      }
    }, 40);
    return () => clearInterval(interval);
  }, [loaded]);

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

        <div>
          <h2 className="font-display text-4xl text-cream-100">My Impact</h2>
          <p className="text-sage-400 mt-2">Your sustainable travel reputation, on-chain.</p>
        </div>

        {/* Main score card */}
        <div className="glass rounded-3xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5"
               style={{ background: `radial-gradient(ellipse at 20% 50%, ${currentTier.glow} 0%, transparent 70%)` }} />

          <div className="grid sm:grid-cols-3 gap-8 relative z-10">

            {/* Score */}
            <div className="text-center sm:text-left">
              <div className="text-xs uppercase tracking-widest text-sage-500 mb-2">Eco Points</div>
              <div className="font-display text-7xl text-gradient">
                {animatedPoints}
              </div>
              <div className="text-sage-400 text-sm mt-1">of 60 for Gold</div>
            </div>

            {/* Tier */}
            <div className="text-center">
              <div className="text-xs uppercase tracking-widest text-sage-500 mb-2">Current Tier</div>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2 border animate-float"
                   style={{ borderColor: `${currentTier.color}50`, background: `${currentTier.color}18` }}>
                <IconAward size={32} style={{ color: currentTier.color }} />
              </div>
              <div className="font-display text-xl" style={{ color: currentTier.color }}>
                {currentTier.name}
              </div>
            </div>

            {/* Progress to next tier */}
            <div className="flex flex-col justify-center gap-3">
              <div className="text-xs uppercase tracking-widest text-sage-500">Progress to {nextTier.name}</div>
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
                <span className="text-glow-400 font-medium">{nextTier.threshold - totalPoints} more points</span> to reach {nextTier.name}
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Stamps', value: '6',     Icon: IconAward       },
            { label: 'Countries',    value: '4',     Icon: IconGlobe       },
            { label: 'CO₂ Saved',   value: '~320kg', Icon: IconLeaf        },
            { label: 'sBTC Earned',  value: '0.002', Icon: IconBitcoin     },
          ].map((s, i) => (
            <div key={s.label} className="glass rounded-2xl p-5 text-center animate-fade-up"
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
              {TIER_CONFIG.map((tier, i) => {
                const isActive  = tier.name === currentTier.name;
                const isLocked  = tier.threshold > totalPoints;
                return (
                  <div
                    key={tier.name}
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300
                      ${isActive ? 'border border-glow-300/30 bg-forest-700/30' : 'opacity-60'}`}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                         style={{ borderColor: `${tier.color}40`, background: `${tier.color}18` }}>
                      <IconAward size={18} style={{ color: tier.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-cream-200">{tier.name}</span>
                        {isActive && (
                          <span className="text-[10px] bg-glow-400/20 text-glow-300 rounded-full px-2 py-0.5">Current</span>
                        )}
                      </div>
                      <div className="text-xs text-sage-500 mt-0.5">
                        {tier.threshold === 0 ? 'Starting tier' : `${tier.threshold}+ eco points`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs" style={{ color: tier.color }}>
                        {isLocked ? `+${tier.threshold - totalPoints} pts` : '✓ Unlocked'}
                      </div>
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
                <div
                  key={i}
                  className="flex items-center gap-3 py-2 border-b border-sage-700/20 last:border-0 animate-fade-up"
                  style={{ animationDelay: `${i * 0.06}s`, animationFillMode: 'both' }}
                >
                  <div className="w-8 h-8 rounded-xl glass-light flex items-center justify-center shrink-0">
                    {item.category === 'tier'
                      ? <IconAward size={15} className="text-white/80" />
                      : <CategoryIcon category={item.category} size={15} className="text-white/80" />
                    }
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

        {/* sBTC reward claim */}
        <div className="glass rounded-3xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5"
               style={{ background: 'radial-gradient(circle, #ffd700 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-widest text-sage-500 mb-1">Available Reward</div>
              <div className="font-display text-3xl text-cream-100">
                0.002 <span className="text-glow-400 text-xl">sBTC</span>
              </div>
              <div className="text-sm text-sage-400 mt-1">
                Based on your Bronze tier + 6 stamps. Pool: 0.42 sBTC
              </div>
            </div>
            <button className="btn-primary px-8 py-4 text-sm whitespace-nowrap flex items-center gap-2">
              <IconBitcoin size={16} />
              Claim Reward
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}