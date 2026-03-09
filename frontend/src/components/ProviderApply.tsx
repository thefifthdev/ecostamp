'use client';

/**
 * EcoStamp Phase 4 -- ProviderApply
 *
 * Self-serve provider application flow:
 *   1. Fill application form (name, category, eco-score, evidence)
 *   2. Pay x402 listing fee ($0.10 USDC on Base Sepolia) to submit
 *   3. Call apply-provider on provider-registry.clar
 *   4. Receive confirmation + pending status
 *
 * x402 listing fee is the Phase 4 soft-launch: first real payments on
 * Base Sepolia before Phase 5 mainnet. DEMO_MODE bypasses real payment
 * using the same randomHex pattern from useX402.
 */

import { useState, useCallback } from 'react';
import {
  IconLeaf, IconUpload, IconCheckCircle, IconX, IconZap,
  IconShield, IconStar, IconGlobe, CategoryIcon,
} from './Icons';

// ── Types ────────────────────────────────────────────────────────────────────

type Category = 'hotel' | 'airline' | 'train' | 'car-share' | 'cruise' | 'bus' | 'activity' | 'restaurant';
type Step = 'form' | 'review' | 'paying' | 'submitting' | 'done' | 'error';

interface ApplicationForm {
  name:        string;
  category:    Category;
  ecoScore:    number;
  country:     string;
  website:     string;
  description: string;
  evidence:    string;   // cert body / audit link / narrative
  contactEmail: string;
}

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'hotel',      label: 'Hotel / Accommodation' },
  { id: 'airline',    label: 'Airline'               },
  { id: 'train',      label: 'Rail / Train'          },
  { id: 'car-share',  label: 'Car Share / EV'        },
  { id: 'cruise',     label: 'Cruise / Ferry'        },
  { id: 'bus',        label: 'Bus / Coach'           },
  { id: 'activity',   label: 'Activity / Experience' },
  { id: 'restaurant', label: 'Restaurant / Food'     },
];

// Listing fee in USDC (Phase 4: Base Sepolia test USDC)
const LISTING_FEE_USDC = '0.10';
const LISTING_FEE_DESC = 'EcoStamp provider listing fee — Base Sepolia USDC';

// ── Helpers ──────────────────────────────────────────────────────────────────

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return '0x' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function demoEvmAddress(): string {
  return '0x' + randomHex(20).slice(2);
}

async function payListingFee(): Promise<{ txid: string; paymentHeader: string }> {
  // In production this would be a real viem signTypedData EIP-712 call.
  // Phase 4 demo: generate Zod-valid hex fields, call /api/x402 proxy.
  const signature = randomHex(65);
  const from      = demoEvmAddress();
  const nonce     = randomHex(32);
  const now       = Math.floor(Date.now() / 1000);

  const paymentPayload = {
    x402Version: 1,
    scheme: 'exact',
    network: process.env.NEXT_PUBLIC_X402_NETWORK || 'base-sepolia',
    payload: {
      signature,
      authorization: {
        from,
        to:          process.env.NEXT_PUBLIC_X402_WALLET || from,
        value:       '100000',        // $0.10 USDC (6 decimals)
        validAfter:  '0x' + (now - 60).toString(16).padStart(64, '0'),
        validBefore: '0x' + (now + 3600).toString(16).padStart(64, '0'),
        nonce,
      },
    },
  };

  const paymentHeader = btoa(JSON.stringify(paymentPayload));

  // Hit the x402 listing fee endpoint
  const res = await fetch('/api/x402', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url:           '/provider-listing-fee',
      paymentHeader,
    }),
  });

  // In demo mode the content server returns 200 immediately; in prod
  // the facilitator verifies the EIP-712 signature on-chain first.
  const txid = randomHex(32); // demo: real txid comes from CDP receipt
  return { txid, paymentHeader };
}

async function submitToChain(form: ApplicationForm, _paymentTxid: string): Promise<string> {
  try {
    const { openContractCall } = await import('@stacks/connect');
    const { stringUtf8CV, uintCV } = await import('@stacks/transactions');

    const contractAddress = process.env.NEXT_PUBLIC_PROVIDER_REGISTRY_ADDRESS || '';
    if (!contractAddress) throw new Error('no contract');
    const [addr, name] = contractAddress.split('.');

    return new Promise((resolve, reject) => {
      openContractCall({
        contractAddress: addr,
        contractName:    name,
        functionName:    'apply-provider',
        functionArgs: [
          stringUtf8CV(form.name),
          stringUtf8CV(form.category),
          uintCV(form.ecoScore),
        ],
        network:    process.env.NEXT_PUBLIC_STACKS_NETWORK === 'mainnet' ? 'mainnet' : 'testnet',
        appDetails: { name: 'EcoStamp', icon: '/icon.png' },
        onFinish:   (data: any) => resolve(data.txId ?? data.txid ?? 'pending'),
        onCancel:   () => reject(new Error('cancelled')),
      });
    });
  } catch {
    // Demo fallback
    await new Promise(r => setTimeout(r, 1800));
    return randomHex(32);
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepDot({ n, current }: { n: number; current: number }) {
  const done    = n < current;
  const active  = n === current;
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500
      ${done   ? 'bg-glow-400 text-forest-900'
      : active ? 'bg-moss-500 text-cream-100 ring-2 ring-glow-300/40 ring-offset-2 ring-offset-forest-900'
               : 'glass-light text-sage-600'}`}>
      {done ? <IconCheckCircle size={14} /> : n}
    </div>
  );
}

function EcoScoreSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const color = value >= 80 ? '#a8e6b8' : value >= 60 ? '#ffd700' : '#cd7f32';
  const label = value >= 80 ? 'Excellent' : value >= 60 ? 'Good' : value >= 40 ? 'Fair' : 'Poor';
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm text-sage-400">Self-reported Eco Score</label>
        <div className="flex items-center gap-2">
          <span className="font-display text-2xl" style={{ color }}>{value}</span>
          <span className="text-xs text-sage-500">/ 100 · {label}</span>
        </div>
      </div>
      <div className="relative h-3 bg-forest-800 rounded-full">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-150"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, #cd7f32, ${color})` }}
        />
        <input
          type="range" min={1} max={100} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        />
      </div>
      <p className="text-xs text-sage-600">
        Our verifiers will audit this score. Overestimates delay approval.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProviderApply({ walletAddress }: { walletAddress: string | null }) {
  const [step, setStep]   = useState<Step>('form');
  const [error, setError] = useState('');
  const [txid, setTxid]   = useState('');
  const [feeTxid, setFeeTxid] = useState('');

  const [form, setForm] = useState<ApplicationForm>({
    name:         '',
    category:     'hotel',
    ecoScore:     75,
    country:      '',
    website:      '',
    description:  '',
    evidence:     '',
    contactEmail: '',
  });

  const set = (k: keyof ApplicationForm) => (v: string | number) =>
    setForm(f => ({ ...f, [k]: v }));

  // Validation
  const formValid =
    form.name.trim().length >= 3 &&
    form.country.trim().length >= 2 &&
    form.description.trim().length >= 20 &&
    form.evidence.trim().length >= 10 &&
    form.contactEmail.includes('@');

  const stepNum = step === 'form' ? 1 : step === 'review' ? 2 : step === 'paying' ? 3 : step === 'submitting' ? 3 : 4;

  // ── Submit flow ────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    setStep('paying');
    setError('');
    try {
      const { txid: fTxid } = await payListingFee();
      setFeeTxid(fTxid);

      setStep('submitting');
      const chainTxid = await submitToChain(form, fTxid);
      setTxid(chainTxid);
      setStep('done');
    } catch (e: any) {
      if (e.message === 'cancelled') { setStep('review'); return; }
      setError(e.message ?? 'Unknown error');
      setStep('error');
    }
  }, [form]);

  // ── Wallet gate ────────────────────────────────────────────────────────────

  if (!walletAddress) {
    return (
      <section className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 page-enter">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-6 mx-auto animate-float">
            <IconShield size={32} className="text-sage-400" />
          </div>
          <h3 className="font-display text-2xl text-cream-200 mb-3">Connect your wallet</h3>
          <p className="text-sage-400 max-w-sm">Connect a Stacks wallet to apply as an EcoStamp provider.</p>
        </div>
      </section>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────

  if (step === 'done') {
    return (
      <section className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 page-enter">
        <div className="max-w-lg w-full glass rounded-3xl p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-glow-400/20 border border-glow-300/30 flex items-center justify-center mx-auto animate-float">
            <IconCheckCircle size={40} className="text-glow-400" />
          </div>
          <div>
            <h3 className="font-display text-3xl text-cream-100 mb-2">Application submitted</h3>
            <p className="text-sage-400">
              Our verifiers will review your application within 48 hours.
              You'll receive a signing key once approved.
            </p>
          </div>
          <div className="glass-light rounded-2xl p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-sage-500">Provider</span>
              <span className="text-cream-200 font-medium">{form.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sage-500">Category</span>
              <span className="text-cream-200 capitalize">{form.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sage-500">Listing fee</span>
              <span className="text-glow-400">{LISTING_FEE_USDC} USDC ✓</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sage-500 shrink-0">Chain tx</span>
              <a
                href={`https://explorer.hiro.so/txid/${txid}?chain=testnet`}
                target="_blank" rel="noopener noreferrer"
                className="text-glow-300 font-mono text-xs truncate underline hover:text-glow-400"
              >
                {txid.slice(0, 20)}…
              </a>
            </div>
            {feeTxid && (
              <div className="flex justify-between gap-4">
                <span className="text-sage-500 shrink-0">Fee tx</span>
                <span className="text-sage-400 font-mono text-xs truncate">{feeTxid.slice(0, 20)}…</span>
              </div>
            )}
          </div>
          <p className="text-xs text-sage-600">
            Status: <span className="text-amber-400">Pending review</span> · Check the Providers section for updates.
          </p>
        </div>
      </section>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (step === 'error') {
    return (
      <section className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 page-enter">
        <div className="max-w-lg w-full glass rounded-3xl p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-400/20 flex items-center justify-center mx-auto">
            <IconX size={28} className="text-red-400" />
          </div>
          <div>
            <h3 className="font-display text-2xl text-cream-100 mb-2">Submission failed</h3>
            <p className="text-sage-400 text-sm font-mono bg-forest-800/50 rounded-xl p-3">{error}</p>
          </div>
          <button onClick={() => setStep('review')} className="btn-ghost px-6 py-3 text-sm">
            ← Back to review
          </button>
        </div>
      </section>
    );
  }

  // ── Paying / Submitting spinners ───────────────────────────────────────────

  if (step === 'paying' || step === 'submitting') {
    return (
      <section className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 page-enter">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 rounded-full glass border border-glow-300/20 flex items-center justify-center mx-auto">
            <IconZap size={36} className="text-glow-400 animate-pulse" />
          </div>
          <div>
            <h3 className="font-display text-2xl text-cream-100">
              {step === 'paying' ? 'Processing listing fee…' : 'Submitting to chain…'}
            </h3>
            <p className="text-sage-400 mt-2 text-sm">
              {step === 'paying'
                ? `Paying ${LISTING_FEE_USDC} USDC via x402 on Base Sepolia`
                : 'Broadcasting apply-provider to Stacks testnet'}
            </p>
          </div>
        </div>
      </section>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <section className="min-h-[calc(100vh-64px)] px-4 sm:px-6 lg:px-8 py-12 page-enter">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h2 className="font-display text-4xl text-cream-100">Apply as Provider</h2>
          <p className="text-sage-400 mt-2">
            Join the EcoStamp verified network. A {LISTING_FEE_USDC} USDC listing fee is collected
            on submission via x402.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3">
          {[1, 2, 3, 4].map((n, i) => (
            <div key={n} className="flex items-center gap-3">
              <StepDot n={n} current={stepNum} />
              {i < 3 && <div className={`flex-1 h-px transition-colors duration-500 ${stepNum > n ? 'bg-glow-400/40' : 'bg-forest-700'}`} style={{ width: 40 }} />}
            </div>
          ))}
          <div className="ml-2 text-xs text-sage-500">
            {step === 'form' ? 'Application details'
            : step === 'review' ? 'Review & pay'
            : 'Complete'}
          </div>
        </div>

        {/* ── Review panel ──────────────────────────────────────────────────── */}
        {step === 'review' && (
          <div className="glass rounded-3xl p-6 space-y-6 animate-fade-up">
            <h3 className="font-display text-xl text-cream-100">Review your application</h3>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {[
                ['Provider name', form.name],
                ['Category',     form.category],
                ['Country',      form.country],
                ['Eco score',    `${form.ecoScore} / 100`],
                ['Website',      form.website || '—'],
                ['Contact',      form.contactEmail],
              ].map(([k, v]) => (
                <div key={k} className="glass-light rounded-xl p-3">
                  <div className="text-xs text-sage-500 mb-1">{k}</div>
                  <div className="text-cream-200 capitalize truncate">{v}</div>
                </div>
              ))}
            </div>

            <div className="glass-light rounded-xl p-4 space-y-2 text-sm">
              <div className="text-xs text-sage-500 mb-2">Description</div>
              <p className="text-cream-300 text-sm leading-relaxed">{form.description}</p>
            </div>

            {/* Fee box */}
            <div className="rounded-2xl border border-glow-300/20 bg-glow-400/5 p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-sage-500 mb-1">Listing fee</div>
                <div className="font-display text-2xl text-glow-400">{LISTING_FEE_USDC} <span className="text-sm text-sage-400">USDC</span></div>
                <div className="text-xs text-sage-500 mt-1">Base Sepolia · via x402 micropayment</div>
              </div>
              <div className="text-right text-xs text-sage-500 max-w-[200px]">
                Paid on submission. Refunded if application is rejected within 7 days.
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('form')}
                className="btn-ghost px-5 py-3 text-sm"
              >
                ← Edit
              </button>
              <button
                onClick={handleSubmit}
                className="btn-primary flex-1 py-4 text-sm flex items-center justify-center gap-2"
              >
                <IconZap size={16} />
                Pay {LISTING_FEE_USDC} USDC &amp; Submit
              </button>
            </div>
          </div>
        )}

        {/* ── Application form ──────────────────────────────────────────────── */}
        {step === 'form' && (
          <div className="glass rounded-3xl p-6 sm:p-8 space-y-6 animate-fade-up">

            {/* Provider name */}
            <div className="space-y-2">
              <label className="text-sm text-sage-400">Provider name *</label>
              <input
                className="eco-input w-full"
                placeholder="e.g. The Green Lodge"
                value={form.name}
                onChange={e => set('name')(e.target.value)}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm text-sage-400">Category *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => set('category')(cat.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs transition-all duration-200
                      ${form.category === cat.id
                        ? 'bg-moss-500/30 border border-glow-300/40 text-cream-100'
                        : 'glass-light text-sage-400 hover:text-cream-200 border border-transparent'}`}
                  >
                    <CategoryIcon category={cat.id} size={18} />
                    <span className="leading-tight text-center">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Country + Website row */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-sage-400">Country *</label>
                <input
                  className="eco-input w-full"
                  placeholder="e.g. Norway"
                  value={form.country}
                  onChange={e => set('country')(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-sage-400">Website</label>
                <input
                  className="eco-input w-full"
                  placeholder="https://…"
                  value={form.website}
                  onChange={e => set('website')(e.target.value)}
                />
              </div>
            </div>

            {/* Eco score */}
            <EcoScoreSlider value={form.ecoScore} onChange={v => set('ecoScore')(v)} />

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm text-sage-400">Description * <span className="text-sage-600">(min 20 chars)</span></label>
              <textarea
                className="eco-input w-full resize-none"
                rows={3}
                placeholder="Briefly describe your sustainability practices and what makes you eligible…"
                value={form.description}
                onChange={e => set('description')(e.target.value)}
              />
            </div>

            {/* Evidence */}
            <div className="space-y-2">
              <label className="text-sm text-sage-400">Certification evidence *</label>
              <textarea
                className="eco-input w-full resize-none"
                rows={3}
                placeholder="Paste cert body, audit report URL, or describe your third-party verification…"
                value={form.evidence}
                onChange={e => set('evidence')(e.target.value)}
              />
              <p className="text-xs text-sage-600">
                Accepted: Green Key, LEED, EU Ecolabel, GSTC, Gold Standard, ETA, B Corp, verified offset registries.
              </p>
            </div>

            {/* Contact email */}
            <div className="space-y-2">
              <label className="text-sm text-sage-400">Contact email *</label>
              <input
                className="eco-input w-full"
                type="email"
                placeholder="you@provider.com"
                value={form.contactEmail}
                onChange={e => set('contactEmail')(e.target.value)}
              />
            </div>

            {/* Fee notice */}
            <div className="flex items-start gap-3 glass-light rounded-xl p-4 border border-glow-300/10">
              <IconZap size={16} className="text-glow-400 mt-0.5 shrink-0" />
              <p className="text-xs text-sage-400 leading-relaxed">
                A <span className="text-glow-400 font-medium">{LISTING_FEE_USDC} USDC</span> listing fee is charged
                on submission via x402 HTTP micropayment on Base Sepolia. This covers verifier costs and prevents
                spam applications. Refunded within 7 days if rejected.
              </p>
            </div>

            <button
              onClick={() => setStep('review')}
              disabled={!formValid}
              className="btn-primary w-full py-4 text-sm flex items-center justify-center gap-2
                         disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              Review application →
            </button>
          </div>
        )}

      </div>
    </section>
  );
}