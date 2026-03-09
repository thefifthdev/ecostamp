'use client';

import { useState } from 'react';
import { CategoryIcon, IconLeaf, IconVerified, IconSearch, IconArrowRight, IconX } from './Icons';

const ALL_PROVIDERS = [
  { id: 1, name: 'The Green Lodge',       category: 'hotel',     ecoScore: 92, stamps: 284, country: 'Norway',  verified: true,  desc: 'Carbon-neutral mountain retreat powered by hydroelectric energy.' },
  { id: 2, name: 'EcoRail Europe',        category: 'train',     ecoScore: 97, stamps: 512, country: 'Germany', verified: true,  desc: '100% renewable energy rail network across 12 European countries.' },
  { id: 3, name: 'GreenWings Air',        category: 'airline',   ecoScore: 78, stamps: 198, country: 'Sweden',  verified: true,  desc: 'SAF-certified flights with verified carbon offset programmes.' },
  { id: 4, name: 'City EV Share',         category: 'car-share', ecoScore: 88, stamps: 143, country: 'Denmark', verified: true,  desc: 'All-electric car sharing with solar-charged depot.' },
  { id: 5, name: 'Bamboo Boutique',       category: 'hotel',     ecoScore: 95, stamps: 91,  country: 'Thailand',verified: true,  desc: 'Bamboo-constructed eco resort with zero-waste kitchen.' },
  { id: 6, name: 'Forest Treks Co.',      category: 'activity',  ecoScore: 99, stamps: 67,  country: 'Finland', verified: true,  desc: 'Leave-no-trace guided forest experiences with trained naturalists.' },
  { id: 7, name: 'Solaris Retreats',      category: 'hotel',     ecoScore: 89, stamps: 44,  country: 'Portugal',verified: false, desc: 'Solar-powered retreat undergoing EcoStamp verification.' },
  { id: 8, name: 'Blue Line Ferries',     category: 'cruise',    ecoScore: 81, stamps: 102, country: 'Greece',  verified: true,  desc: 'LNG-powered ferry operator with hull-fouling reduction technology.' },
];

const CATEGORIES = ['all', 'hotel', 'train', 'airline', 'car-share', 'activity', 'cruise'];

export default function Providers() {
  const [filter, setFilter]   = useState('all');
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState<typeof ALL_PROVIDERS[0] | null>(null);

  const filtered = ALL_PROVIDERS.filter(p =>
    (filter === 'all' || p.category === filter) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.country.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <section className="min-h-[calc(100vh-64px)] px-4 sm:px-6 lg:px-8 py-12 page-enter">
      <div className="max-w-7xl mx-auto">

        <div className="mb-10">
          <h2 className="font-display text-4xl text-cream-100">Eco Providers</h2>
          <p className="text-sage-400 mt-2">Verified sustainable travel partners. Book with them to earn stamps.</p>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <input
            type="text"
            placeholder="Search providers or countries…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="eco-input flex-1 max-w-sm"
          />
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition-all duration-200
                  ${filter === cat
                    ? 'bg-moss-500 text-cream-100 border border-glow-300/30'
                    : 'glass-light text-sage-400 hover:text-cream-200'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className={`group text-left glass rounded-3xl p-5 hover:border-glow-300/25 transition-all duration-300
                          hover:shadow-[0_0_20px_rgba(168,230,184,0.08)] hover:-translate-y-0.5
                          animate-fade-up border ${p.verified ? 'border-sage-500/15' : 'border-sage-700/10 opacity-70'}`}
              style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'both' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                  <CategoryIcon category={p.category} size={20} className="text-white" />
                </div>
                <div className="flex items-center gap-1.5">
                  {p.verified
                    ? <span className="text-[10px] text-glow-400 glass-light rounded-full px-2 py-0.5 border border-glow-300/20 flex items-center gap-1">
                        <IconVerified size={9} className="text-glow-400" /> Verified
                      </span>
                    : <span className="text-[10px] text-sage-500 glass-light rounded-full px-2 py-0.5">Pending</span>
                  }
                </div>
              </div>

              <div className="font-display text-base text-cream-100 mb-0.5 leading-tight">{p.name}</div>
              <div className="text-xs text-sage-500 capitalize mb-3">{p.category} · {p.country}</div>
              <div className="text-xs text-sage-400 leading-relaxed mb-4 line-clamp-2">{p.desc}</div>

              <div className="flex items-center justify-between pt-3 border-t border-sage-700/30">
                <div>
                  <div className="text-xs text-sage-500">Eco Score</div>
                  <EcoBar score={p.ecoScore} />
                </div>
                <div className="text-right">
                  <div className="text-xs text-sage-500">Stamps issued</div>
                  <div className="font-mono text-sm text-glow-400">{p.stamps}</div>
                </div>
              </div>
            </button>
          ))}

          {/* Apply CTA card */}
          <div className="glass rounded-3xl p-5 border-dashed border border-sage-600/30 flex flex-col items-center justify-center text-center gap-3 min-h-[200px]">
            <div className="w-10 h-10 rounded-xl glass-light flex items-center justify-center opacity-50">
              <IconLeaf size={18} className="text-sage-400" />
            </div>
            <div className="text-sm text-sage-500">Are you an eco provider?</div>
            <button className="btn-ghost text-xs py-2 px-4">Apply for listing</button>
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-sage-500">No providers match your search.</div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative glass rounded-3xl p-8 max-w-md w-full border border-glow-300/20 animate-stamp-drop"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 text-sage-500 hover:text-sage-300 transition-colors"
            >
              ✕
            </button>

            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mb-4">
              <CategoryIcon category={selected.category} size={32} className="text-white" />
            </div>
            <h3 className="font-display text-2xl text-cream-100 mb-1">{selected.name}</h3>
            <div className="text-sm text-sage-400 capitalize mb-4">{selected.category} · {selected.country}</div>
            <p className="text-sm text-sage-300 leading-relaxed mb-6">{selected.desc}</p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Eco Score',  value: selected.ecoScore },
                { label: 'Stamps',     value: selected.stamps   },
                { label: 'Status',     value: selected.verified ? '✓ Active' : 'Pending' },
              ].map(s => (
                <div key={s.label} className="glass-light rounded-xl p-3 text-center">
                  <div className="text-glow-300 font-display text-lg">{s.value}</div>
                  <div className="text-[10px] text-sage-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {selected.verified && (
              <button
                onClick={() => setSelected(null)}
                className="btn-primary w-full py-3 text-sm"
              >
                Book & Earn Stamp →
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function EcoBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <div className="w-16 h-1.5 bg-forest-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-moss-500 to-glow-400"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-mono text-glow-400">{score}</span>
    </div>
  );
}