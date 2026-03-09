'use client';

import { useState } from 'react';
import { CategoryIcon, IconUpload, IconSearch, IconCheckCircle, IconZap, IconLink, IconAward, IconArrowRight } from './Icons';

type Step = 'select' | 'upload' | 'validating' | 'signing' | 'minting' | 'success' | 'error';

const DEMO_PROVIDERS = [
  { id: 1, name: 'The Green Lodge',  category: 'hotel',     ecoScore: 92, points: 3, verified: true  },
  { id: 2, name: 'EcoRail Europe',   category: 'train',     ecoScore: 97, points: 2, verified: true  },
  { id: 3, name: 'GreenWings Air',   category: 'airline',   ecoScore: 78, points: 5, verified: true  },
  { id: 4, name: 'City EV Share',    category: 'car-share', ecoScore: 88, points: 2, verified: true  },
  { id: 5, name: 'Bamboo Boutique',  category: 'hotel',     ecoScore: 95, points: 3, verified: true  },
  { id: 6, name: 'Forest Treks Co.', category: 'activity',  ecoScore: 99, points: 1, verified: true  },
];

export default function SubmitProof({ walletAddress }: { walletAddress: string | null }) {
  const [step, setStep] = useState<Step>('select');
  const [selectedProvider, setSelectedProvider] = useState<typeof DEMO_PROVIDERS[0] | null>(null);
  const [bookingRef, setBookingRef] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [mintedStampId, setMintedStampId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleSelectProvider = (p: typeof DEMO_PROVIDERS[0]) => {
    setSelectedProvider(p);
    setStep('upload');
  };

  const handleSubmit = async () => {
    if (!bookingRef.trim()) return;
    setStep('validating');

    await delay(1800);
    setStep('signing');

    await delay(1500);
    setStep('minting');

    await delay(2200);

    // In production: call stamp-registry.earn-stamp via stacks.js
    // const txResult = await openContractCall({ ... })
    setMintedStampId(Math.floor(Math.random() * 10000));
    setStep('success');
  };

  const reset = () => {
    setStep('select');
    setSelectedProvider(null);
    setBookingRef('');
    setFile(null);
    setMintedStampId(null);
    setError('');
  };

  return (
    <section className="min-h-[calc(100vh-64px)] px-4 sm:px-6 lg:px-8 py-12 page-enter">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <h2 className="font-display text-4xl text-cream-100">Earn a Stamp</h2>
          <p className="text-sage-400 mt-2">Submit your booking proof to mint a verified EcoStamp.</p>
        </div>

        {/* Step indicator */}
        <StepBar current={step} />

        {!walletAddress && step === 'select' && (
          <div className="glass rounded-3xl p-6 mb-6 flex items-center gap-3 border border-amber-500/20">
            <span className="text-amber-400">⚠</span>
            <span className="text-sm text-sage-300">Connect your wallet to mint stamps on-chain. You can still browse the flow.</span>
          </div>
        )}

        <div className="glass rounded-3xl p-6 sm:p-8">

          {/* STEP 1: Select provider */}
          {step === 'select' && (
            <div className="animate-fade-up">
              <h3 className="font-display text-xl text-cream-100 mb-6">Select your provider</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {DEMO_PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProvider(p)}
                    className="group flex items-center gap-4 p-4 rounded-2xl
                               border border-sage-400/15 hover:border-glow-300/30
                               hover:bg-forest-700/40 transition-all duration-200 text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                      <CategoryIcon category={p.category} size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-cream-200 truncate">{p.name}</div>
                      <div className="text-xs text-sage-500 capitalize">{p.category}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="text-xs glass-light rounded-full px-2 py-0.5 text-glow-400 font-mono">
                        {p.ecoScore}
                      </div>
                      <div className="text-[10px] text-sage-500">+{p.points}pts</div>
                    </div>
                    <div className="text-sage-600 group-hover:text-glow-400 transition-colors text-xs">→</div>
                  </button>
                ))}
              </div>
              <p className="text-center text-xs text-sage-600 mt-4">
                Don&apos;t see your provider?{' '}
                <span className="text-glow-400 cursor-pointer hover:text-glow-300">Apply for listing →</span>
              </p>
            </div>
          )}

          {/* STEP 2: Upload proof */}
          {step === 'upload' && selectedProvider && (
            <div className="animate-fade-up space-y-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setStep('select')} className="text-sage-500 hover:text-sage-300 transition-colors text-sm">
                  ← Back
                </button>
                <div className="flex items-center gap-2 glass-light rounded-xl px-3 py-2">
                    <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
                      <CategoryIcon category={selectedProvider.category} size={14} className="text-white" />
                    </div>
                    <span className="text-sm text-cream-200">{selectedProvider.name}</span>
                  </div>
              </div>

              <div>
                <label className="block text-sm text-sage-400 mb-2">Booking Reference *</label>
                <input
                  type="text"
                  placeholder="e.g. BOOK-2026-AB1234"
                  value={bookingRef}
                  onChange={e => setBookingRef(e.target.value)}
                  className="eco-input"
                />
              </div>

              <div>
                <label className="block text-sm text-sage-400 mb-2">Booking Confirmation (optional)</label>
                <div
                  className="border-2 border-dashed border-sage-500/30 rounded-2xl p-8 text-center
                              hover:border-glow-300/30 transition-colors duration-200 cursor-pointer
                              hover:bg-forest-800/20"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) setFile(f);
                  }}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                  />
                  {file ? (
                    <div className="text-sm text-glow-400 flex items-center justify-center gap-2">
                      <IconUpload size={14} className="text-glow-400" />
                      <span>{file.name}</span>
                      <button
                        className="ml-1 text-sage-500 hover:text-sage-300 text-xs"
                        onClick={e => { e.stopPropagation(); setFile(null); }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-xl glass flex items-center justify-center mx-auto mb-3">
                      <IconUpload size={22} className="text-sage-400" />
                    </div>
                    <div className="text-sm text-sage-500">Drop your booking PDF or image here</div>
                    <div className="text-xs text-sage-600 mt-1">or click to browse</div>
                    </>
                  )}
                </div>
              </div>

              <div className="glass-light rounded-2xl p-4 text-xs text-sage-500 leading-relaxed border border-sage-400/10 flex gap-3">
                <IconLink size={14} className="text-sage-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-sage-400 block mb-1">Privacy note</strong>
                  Your booking data is verified off-chain by our oracle and only a cryptographic hash is stored on-chain.
                  Personal details are never written to the blockchain.
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!bookingRef.trim()}
                className="w-full btn-primary py-4 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                Validate & Mint Stamp
              </button>
            </div>
          )}

          {/* Processing states */}
          {['validating', 'signing', 'minting'].includes(step) && (
            <div className="animate-fade-in py-12 text-center space-y-6">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 rounded-full border-2 border-glow-300/20 animate-spin"
                     style={{ borderTopColor: 'rgba(168,230,184,0.8)' }} />
                <div className="absolute inset-3 rounded-full bg-forest-gradient flex items-center justify-center">
                  {step === 'validating' && <IconSearch size={22} className="text-white" />}
                  {step === 'signing'    && <IconLink   size={22} className="text-white" />}
                  {step === 'minting'   && <IconZap    size={22} className="text-white" />}
                </div>
              </div>
              <div>
                <div className="font-display text-xl text-cream-100 mb-2">
                  {step === 'validating' ? 'Validating booking proof…' :
                   step === 'signing'    ? 'Oracle signing proof…' :
                                          'Minting stamp on-chain…'}
                </div>
                <div className="text-sm text-sage-500">
                  {step === 'validating' ? 'Checking booking reference with provider API' :
                   step === 'signing'    ? 'Generating secp256k1 signature' :
                                          'Broadcasting to Stacks testnet'}
                </div>
              </div>
              <ProgressDots step={step} />
            </div>
          )}

          {/* Success */}
          {step === 'success' && selectedProvider && (
            <div className="animate-stamp-drop text-center space-y-6 py-8">
              <div className="relative mx-auto w-32 h-32">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-glow-400/20 to-moss-500/20 animate-pulse-glow" />
                <div className="relative w-32 h-32 rounded-full glass flex flex-col items-center justify-center
                                border border-glow-300/40 shadow-[0_0_60px_rgba(168,230,184,0.2)]">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-1">
                    <CategoryIcon category={selectedProvider.category} size={26} className="text-white" />
                  </div>
                  <span className="text-[10px] text-glow-400 font-mono">#{mintedStampId}</span>
                </div>
              </div>

              <div>
                <div className="font-display text-2xl text-cream-100 mb-1 flex items-center justify-center gap-2">
                  Stamp Minted
                  <IconCheckCircle size={22} className="text-glow-400" />
                </div>
                <div className="text-sage-400 text-sm">{selectedProvider.name}</div>
              </div>

              <div className="flex items-center justify-center gap-4">
                <div className="glass rounded-xl px-4 py-2 text-center">
                  <div className="text-glow-300 font-display text-lg">+{selectedProvider.points}</div>
                  <div className="text-xs text-sage-500">eco points</div>
                </div>
                <div className="glass rounded-xl px-4 py-2 text-center">
                  <div className="text-glow-300 font-display text-lg">{selectedProvider.ecoScore}</div>
                  <div className="text-xs text-sage-500">eco score</div>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <button onClick={reset} className="btn-ghost text-sm py-2.5 px-5">
                  Earn Another
                </button>
                <a
                  href={`https://explorer.stacks.co?chain=testnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-sm py-2.5 px-5"
                >
                  View on Explorer ↗
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StepBar({ current }: { current: Step }) {
  const steps = ['select', 'upload', 'minting', 'success'];
  const idx = ['select', 'upload', 'validating', 'signing', 'minting', 'success'].indexOf(current);
  const displayIdx = Math.min(Math.floor(idx / 1.5), 3);

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2 flex-1">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono
                           border transition-all duration-300
                           ${i <= displayIdx
                             ? 'bg-moss-500 border-glow-300/40 text-cream-100'
                             : 'border-sage-500/30 text-sage-600'
                           }`}>
            {i < displayIdx ? '✓' : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-px transition-all duration-500 ${i < displayIdx ? 'bg-moss-500' : 'bg-sage-700/40'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function ProgressDots({ step }: { step: Step }) {
  const order = ['validating', 'signing', 'minting'];
  return (
    <div className="flex justify-center gap-2">
      {order.map((s, i) => (
        <div
          key={s}
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            order.indexOf(step) >= i ? 'bg-glow-400' : 'bg-sage-700'
          }`}
        />
      ))}
    </div>
  );
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}