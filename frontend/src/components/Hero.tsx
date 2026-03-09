'use client';

import { useEffect, useState } from 'react';
import {
  IconHotel, IconTrain, IconPlane, IconCar, IconLeaf,
  IconGlobe, IconSprout, IconFile, IconAward,
} from './Icons';

type Section = 'home' | 'stamps' | 'submit' | 'impact' | 'providers';

const DEMO_STAMPS = [
  { Icon: IconHotel,  label: 'Eco Hotel',  points: 3, delay: 0    },
  { Icon: IconTrain,  label: 'Train',      points: 2, delay: 0.15 },
  { Icon: IconSprout, label: 'Activity',   points: 1, delay: 0.3  },
  { Icon: IconPlane,  label: 'Airline',    points: 5, delay: 0.45 },
  { Icon: IconCar,    label: 'Car-Share',  points: 2, delay: 0.6  },
  { Icon: IconLeaf,   label: 'Local Eats', points: 1, delay: 0.75 },
];

const STATS = [
  { value: '2,841',  label: 'Stamps Issued'    },
  { value: '196',    label: 'Verified Providers'},
  { value: '0.42',   label: 'sBTC in Rewards'  },
  { value: '48',     label: 'Countries Covered' },
];

export default function Hero({ setActiveSection }: { setActiveSection: (s: Section) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="min-h-[calc(100vh-64px)] flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left: copy */}
          <div className={`space-y-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 glass-light rounded-full px-4 py-2 text-sm text-glow-300 border border-glow-300/20">
              <IconLeaf size={14} className="text-glow-300 animate-pulse-glow" />
              <span>Built on Stacks Bitcoin L2</span>
            </div>

            {/* Headline */}
            <div>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.05] text-cream-100">
                Travel{' '}
                <em className="not-italic text-gradient">responsibly.</em>
                <br />
                Prove it{' '}
                <em className="not-italic text-gradient">on-chain.</em>
              </h1>
              <p className="mt-6 text-lg text-sage-300 font-body leading-relaxed max-w-lg">
                EcoStamp mints verifiable SFT stamps for every eco-friendly booking you make —
                hotels, trains, green airlines. Build your reputation. Earn sBTC rewards.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setActiveSection('submit')}
                className="group relative overflow-hidden px-7 py-3.5 rounded-2xl font-medium text-sm
                           bg-gradient-to-r from-moss-500 to-forest-500 text-cream-100
                           border border-glow-300/20
                           hover:shadow-[0_0_40px_rgba(168,230,184,0.2)] hover:-translate-y-0.5
                           transition-all duration-300 active:scale-95 flex items-center gap-2"
              >
                <span className="relative z-10">Earn Your First Stamp</span>
                <IconAward size={15} className="relative z-10" />
                <div className="absolute inset-0 bg-stamp-shine opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                onClick={() => setActiveSection('providers')}
                className="btn-ghost text-sm py-3.5"
              >
                Browse Providers
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
              {STATS.map((stat, i) => (
                <div
                  key={stat.label}
                  className="glass rounded-2xl p-3 text-center"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="font-display text-xl text-glow-300 font-semibold">{stat.value}</div>
                  <div className="text-xs text-sage-400 mt-0.5 font-body">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: stamp orbit visualization */}
          <div className={`relative flex items-center justify-center min-h-[440px]
                           transition-all duration-700 delay-200
                           ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

            {/* Orbit rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[180, 260, 340].map((size, i) => (
                <div
                  key={i}
                  className="absolute rounded-full border border-glow-300/10"
                  style={{ width: size, height: size }}
                />
              ))}
            </div>

            {/* Central medallion */}
            <div className="relative z-10 w-28 h-28 rounded-full
                            bg-gradient-to-br from-forest-600 to-moss-500
                            border-2 border-glow-300/30
                            flex items-center justify-center
                            shadow-[0_0_60px_rgba(77,160,125,0.3)]
                            animate-float">
              <IconGlobe size={48} className="text-white/90" />
            </div>

            {/* Orbiting stamps */}
            {DEMO_STAMPS.map((stamp, i) => {
              const angle  = (i / DEMO_STAMPS.length) * 360;
              const radius = i % 2 === 0 ? 130 : 170;
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius;

              return (
                <div
                  key={stamp.label}
                  className="absolute z-20 stamp-glow animate-fade-in"
                  style={{ transform: `translate(${x}px, ${y}px)`, animationDelay: `${stamp.delay}s`, animationFillMode: 'both' }}
                >
                  <div className="glass rounded-2xl p-2.5 text-center w-20 hover:scale-110
                                  transition-transform duration-300 cursor-default border border-glow-300/15
                                  flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                      <stamp.Icon size={16} className="text-white" />
                    </div>
                    <div className="text-xs text-cream-200 font-medium leading-tight">{stamp.label}</div>
                    <div className="text-[10px] text-glow-400">+{stamp.points}pts</div>
                  </div>
                </div>
              );
            })}

            {/* Glow pulse */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 rounded-full bg-moss-500/10 animate-pulse-glow" />
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className={`mt-24 transition-all duration-700 delay-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-center text-xs uppercase tracking-[0.2em] text-sage-500 mb-8 font-body">
            How it works
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { step: '01', title: 'Book sustainably',  desc: 'Book with any of our verified eco providers — hotels, trains, airlines with green credentials.', Icon: IconLeaf  },
              { step: '02', title: 'Submit your proof', desc: 'Upload your booking confirmation. Our oracle validates it and signs a minting proof on-chain.',  Icon: IconFile  },
              { step: '03', title: 'Claim your stamp',  desc: 'An SFT stamp is minted to your Stacks wallet. Accumulate points, level up, earn sBTC rewards.', Icon: IconAward },
            ].map(item => (
              <div key={item.step}
                   className="glass rounded-3xl p-6 relative overflow-hidden group hover:border-glow-300/20 transition-all duration-300">
                <div className="absolute top-4 right-4 font-mono text-4xl font-bold text-glow-300/10 group-hover:text-glow-300/20 transition-colors">
                  {item.step}
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center mb-4">
                  <item.Icon size={20} className="text-white" />
                </div>
                <h3 className="font-display text-lg text-cream-100 mb-2">{item.title}</h3>
                <p className="text-sm text-sage-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}