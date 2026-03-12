'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CategoryIcon,
  IconCheckCircle,
  IconLink,
  IconSearch,
  IconUpload,
  IconWallet,
  IconZap,
} from './Icons';
import { hiroTxUrl, stacksChain } from '@/lib/explorer';
import { stacksNetwork } from '@/lib/stacks-network';
import { fetchProviders, type ProviderRecord } from '@/lib/stacks';
import { uintCV } from '@stacks/transactions';
import { addActivity } from '@/lib/activity';
import { bufferCvFromHex } from '@/lib/clarity';

type Step = 'select' | 'upload' | 'validating' | 'minting' | 'success' | 'error';

const FALLBACK_PROVIDERS: ProviderRecord[] = [
  { id: 1, name: 'The Green Lodge',  category: 'hotel',     ecoScore: 92, status: 'approved', owner: 'ST1…', stampsIssued: 284 },
  { id: 2, name: 'EcoRail Europe',   category: 'train',     ecoScore: 97, status: 'approved', owner: 'ST1…', stampsIssued: 512 },
  { id: 3, name: 'GreenWings Air',   category: 'airline',   ecoScore: 78, status: 'approved', owner: 'ST1…', stampsIssued: 198 },
  { id: 4, name: 'City EV Share',    category: 'car-share', ecoScore: 88, status: 'approved', owner: 'ST1…', stampsIssued: 143 },
  { id: 5, name: 'Bamboo Boutique',  category: 'hotel',     ecoScore: 95, status: 'approved', owner: 'ST1…', stampsIssued: 91  },
  { id: 6, name: 'Forest Treks Co.', category: 'activity',  ecoScore: 99, status: 'approved', owner: 'ST1…', stampsIssued: 67  },
  { id: 7, name: 'Solaris Retreats', category: 'hotel',     ecoScore: 89, status: 'pending',  owner: 'ST1…', stampsIssued: 0   },
];

export default function SubmitProof({ walletAddress }: { walletAddress: string | null }) {
  const [step, setStep] = useState<Step>('select');
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<ProviderRecord | null>(null);

  const [bookingRef, setBookingRef] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [ecoPoints, setEcoPoints] = useState<number | null>(null);
  const [bookingHash, setBookingHash] = useState<string | null>(null);
  const [mintedTxId, setMintedTxId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setProvidersLoading(true);
      const list = await fetchProviders().catch(() => []);
      if (!mounted) return;
      setProviders(list.length ? list : FALLBACK_PROVIDERS);
      setProvidersLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const approvedCount = useMemo(() => providers.filter(p => p.status === 'approved').length, [providers]);

  const reset = () => {
    setStep('select');
    setSelectedProvider(null);
    setBookingRef('');
    setFile(null);
    setEcoPoints(null);
    setBookingHash(null);
    setMintedTxId(null);
    setError('');
  };

  const goBack = () => {
    setStep('select');
    setSelectedProvider(null);
    setBookingRef('');
    setFile(null);
    setEcoPoints(null);
    setBookingHash(null);
    setMintedTxId(null);
    setError('');
  };

  const selectProvider = (p: ProviderRecord) => {
    setSelectedProvider(p);
    setStep('upload');
    setError('');
    setEcoPoints(null);
    setBookingHash(null);
    setMintedTxId(null);
  };

  const handleSubmit = async () => {
    if (!selectedProvider) return;
    if (!walletAddress) {
      setError('Connect your Stacks wallet to mint a stamp on-chain.');
      setStep('error');
      return;
    }
    if (!bookingRef.trim()) return;
    if (selectedProvider.status !== 'approved') {
      setError('Provider is not verified yet. Estimated onboarding: 2-5 business days.');
      setStep('error');
      return;
    }

    setStep('validating');
    try {
      const oracleRes = await fetch('/api/oracle/sign-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingRef: bookingRef.trim(),
          providerId: selectedProvider.id,
          walletAddress,
        }),
      });
      const oracleData = await oracleRes.json().catch(() => ({}));
      if (!oracleRes.ok || !oracleData?.bookingHash || !oracleData?.bookingProof) {
        throw new Error(oracleData?.error || oracleData?.detail || 'Booking validation failed');
      }

      const bh = String(oracleData.bookingHash);
      const bp = String(oracleData.bookingProof);
      const pts = Number(oracleData.ecoPoints ?? 0);
      setEcoPoints(pts);
      setBookingHash(bh);

      const contractId = (process.env.NEXT_PUBLIC_STAMP_REGISTRY_ADDRESS || '').trim();
      if (!contractId.includes('.')) throw new Error('Stamp registry not configured (NEXT_PUBLIC_STAMP_REGISTRY_ADDRESS)');
      const [contractAddress, contractName] = contractId.split('.');

      setStep('minting');
      const { openContractCall } = await import('@stacks/connect');

      await new Promise<void>((resolve, reject) => {
        openContractCall({
          contractAddress,
          contractName,
          functionName: 'earn-stamp',
          functionArgs: [
            uintCV(selectedProvider.id),
            bufferCvFromHex(bh),
            bufferCvFromHex(bp),
            uintCV(pts),
          ],
          network: stacksNetwork(),
          appDetails: { name: 'EcoStamp', icon: '/icon.png' },
          onFinish: (data: any) => {
            const txId = data.txId ?? data.txid ?? null;
            if (txId) setMintedTxId(txId);
            if (txId) {
              addActivity({
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                kind: 'stamp',
                title: 'Stamp minted',
                detail: `${selectedProvider.name} · +${pts} eco points`,
                timestamp: new Date().toISOString(),
                txId,
              });
            }
            resolve();
          },
          onCancel: () => reject(new Error('Transaction cancelled')),
        });
      });

      setStep('success');
    } catch (e: any) {
      setError(e?.message ?? 'Minting failed');
      setStep('error');
    }
  };

  return (
    <section className="min-h-[calc(100vh-64px)] px-4 sm:px-6 lg:px-8 py-12 page-enter">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <h2 className="font-display text-4xl text-cream-100">Earn a Stamp</h2>
          <p className="text-sage-400 mt-2">Validate your booking proof and mint an on-chain EcoStamp.</p>
        </div>

        <StepBar current={step} />

        {!walletAddress && step === 'select' && (
          <div className="glass rounded-3xl p-6 mb-6 flex items-center gap-3 border border-amber-500/20">
            <span className="text-amber-400">⚠</span>
            <span className="text-sm text-sage-300">
              You can browse providers without a wallet. Connect to mint stamps on-chain.
            </span>
          </div>
        )}

        <div className="glass rounded-3xl p-6 sm:p-8">
          {step === 'select' && (
            <div className="animate-fade-up">
              <div className="flex items-end justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-display text-xl text-cream-100">Select your provider</h3>
                  <p className="text-xs text-sage-500 mt-1">
                    {providersLoading ? 'Syncing provider registry…' : `${approvedCount} verified provider${approvedCount === 1 ? '' : 's'} ready to mint.`}
                  </p>
                </div>
              </div>

              {providersLoading ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-[76px] rounded-2xl glass shimmer" />
                  ))}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {providers.map(p => {
                    const disabled = p.status !== 'approved';
                    return (
                      <button
                        key={p.id}
                        onClick={() => !disabled && selectProvider(p)}
                        disabled={disabled}
                        className="group flex items-center gap-4 p-4 rounded-2xl
                                   border border-sage-400/15 hover:border-glow-300/30
                                   hover:bg-forest-700/40 transition-all duration-200 text-left
                                   disabled:opacity-60 disabled:hover:bg-transparent disabled:cursor-not-allowed"
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
                          <div className={`text-[10px] ${p.status === 'approved' ? 'text-glow-400' : 'text-amber-400'}`}>
                            {p.status === 'approved' ? 'Verified' : 'Pending'}
                          </div>
                        </div>
                        <div className="text-sage-600 group-hover:text-glow-400 transition-colors text-xs">→</div>
                      </button>
                    );
                  })}
                </div>
              )}

              <p className="text-center text-xs text-sage-600 mt-4">
                Don&apos;t see your provider? Go to <span className="text-glow-400">Apply</span> to onboard them.
              </p>
            </div>
          )}

          {step === 'upload' && selectedProvider && (
            <div className="animate-fade-up space-y-6">
              <div className="flex items-center gap-3">
                <button onClick={goBack} className="text-sage-500 hover:text-sage-300 transition-colors text-sm">
                  ← Back
                </button>
                <div className="flex items-center gap-2 glass-light rounded-xl px-3 py-2">
                  <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
                    <CategoryIcon category={selectedProvider.category} size={14} className="text-white" />
                  </div>
                  <span className="text-sm text-cream-200">{selectedProvider.name}</span>
                  {selectedProvider.status !== 'approved' && (
                    <span className="text-[10px] text-amber-400/90 ml-1">pending</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs text-sage-500 uppercase tracking-widest">Booking reference</label>
                <input
                  value={bookingRef}
                  onChange={e => setBookingRef(e.target.value)}
                  placeholder="e.g., ABCD-1234"
                  className="eco-input"
                />
                <p className="text-xs text-sage-600">
                  Tip: any unique confirmation string works in demo mode. Production providers validate via their API.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs text-sage-500 uppercase tracking-widest">Optional proof upload</label>
                <div
                  className="glass-light rounded-2xl p-6 border border-dashed border-sage-500/30 text-center cursor-pointer"
                  onDragOver={e => { e.preventDefault(); }}
                  onDrop={e => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
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
                      <span className="truncate max-w-[240px]">{file.name}</span>
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
                  Your booking details are verified off-chain. Only a cryptographic hash is stored on-chain.
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!bookingRef.trim() || selectedProvider.status !== 'approved'}
                className="w-full btn-primary py-4 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                Validate & Mint Stamp
              </button>
            </div>
          )}

          {['validating', 'minting'].includes(step) && (
            <div className="animate-fade-in py-12 text-center space-y-6">
              <div className="relative mx-auto w-20 h-20">
                <div
                  className="absolute inset-0 rounded-full border-2 border-glow-300/20 animate-spin"
                  style={{ borderTopColor: 'rgba(168,230,184,0.8)' }}
                />
                <div className="absolute inset-3 rounded-full bg-forest-gradient flex items-center justify-center">
                  {step === 'validating' && <IconSearch size={22} className="text-white" />}
                  {step === 'minting' && <IconZap size={22} className="text-white" />}
                </div>
              </div>
              <div>
                <div className="font-display text-xl text-cream-100 mb-2">
                  {step === 'validating' ? 'Validating booking proof…' : 'Minting stamp on-chain…'}
                </div>
                <div className="text-sm text-sage-500">
                  {step === 'validating'
                    ? 'Oracle verifies the booking and issues a secp256k1 proof'
                    : `Broadcasting to Stacks ${stacksChain()}`}
                </div>
              </div>
              <ProgressDots step={step} />
            </div>
          )}

          {step === 'success' && selectedProvider && (
            <div className="animate-stamp-drop text-center space-y-6 py-8">
              <div className="relative mx-auto w-32 h-32">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-glow-400/20 to-moss-500/20 animate-pulse-glow" />
                <div
                  className="relative w-32 h-32 rounded-full glass flex flex-col items-center justify-center
                             border border-glow-300/40 shadow-[0_0_60px_rgba(168,230,184,0.2)]"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-1">
                    <CategoryIcon category={selectedProvider.category} size={26} className="text-white" />
                  </div>
                  <span className="text-[10px] text-glow-400 font-mono">minted</span>
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
                  <div className="text-glow-300 font-display text-lg">+{ecoPoints ?? 0}</div>
                  <div className="text-xs text-sage-500">eco points</div>
                </div>
                <div className="glass rounded-xl px-4 py-2 text-center">
                  <div className="text-glow-300 font-display text-lg">{selectedProvider.ecoScore}</div>
                  <div className="text-xs text-sage-500">eco score</div>
                </div>
              </div>

              {bookingHash && (
                <div className="glass-light rounded-2xl p-4 text-left max-w-xl mx-auto">
                  <div className="text-xs text-sage-500 mb-1">Booking hash</div>
                  <div className="font-mono text-xs text-sage-300 break-all">{bookingHash}</div>
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <button onClick={reset} className="btn-ghost text-sm py-2.5 px-5">
                  Earn Another
                </button>
                {mintedTxId ? (
                  <a
                    href={hiroTxUrl(mintedTxId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary text-sm py-2.5 px-5"
                  >
                    View tx ↗
                  </a>
                ) : (
                  <div className="btn-primary text-sm py-2.5 px-5 opacity-60 pointer-events-none">
                    Waiting for tx…
                  </div>
                )}
              </div>

              {mintedTxId && (
                <div className="text-xs text-sage-600 font-mono break-all max-w-xl mx-auto">
                  {mintedTxId}
                </div>
              )}
            </div>
          )}

          {step === 'error' && (
            <div className="animate-fade-in py-10 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto">
                <IconWallet size={28} className="text-red-400" />
              </div>
              <div>
                <div className="font-display text-xl text-cream-100 mb-2">Could not mint stamp</div>
                <div className="text-sm text-sage-500 max-w-md mx-auto">{error || 'Unknown error'}</div>
              </div>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setStep('upload')} className="btn-ghost text-sm py-2.5 px-5">
                  Try again
                </button>
                <button onClick={reset} className="btn-primary text-sm py-2.5 px-5">
                  Start over
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StepBar({ current }: { current: Step }) {
  const steps: Step[] = ['select', 'upload', 'minting', 'success'];
  const idx = steps.indexOf(current);
  const displayIdx = idx >= 0 ? idx : (current === 'validating' ? 2 : current === 'error' ? 1 : 0);

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2 flex-1">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono
                        border transition-all duration-300
                        ${i <= displayIdx
                          ? 'bg-moss-500 border-glow-300/40 text-cream-100'
                          : 'border-sage-500/30 text-sage-600'
                        }`}
          >
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
  const order: Step[] = ['validating', 'minting'];
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
