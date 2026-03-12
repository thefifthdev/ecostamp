'use client';

/**
 * EcoStamp Phase 4 -- AdminPanel
 *
 * Verifier-only dashboard for:
 *   - Viewing pending provider applications
 *   - Approving with a secp256k1 signing key hash
 *   - Revoking approved providers
 *   - Delivering signing keys to approved providers via /api/signing-key
 *   - Seeding the reward pool (admin-seed-pool)
 *
 * Access control: only the verifier wallet (set in provider-registry.clar)
 * can call approve-provider and revoke-provider. The UI gates on wallet
 * address matching NEXT_PUBLIC_VERIFIER_ADDRESS. On-chain, the contract
 * enforces the same check independently.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  IconShield, IconCheckCircle, IconX, IconZap, IconKey,
  IconLeaf, IconSearch, IconBitcoin, CategoryIcon,
} from './Icons';
import { hiroTxUrl } from '@/lib/explorer';
import { stacksNetwork } from '@/lib/stacks-network';
import { bufferCvFromHex } from '@/lib/clarity';

// ── Types ─────────────────────────────────────────────────────────────────────

type ProviderStatus = 'pending' | 'approved' | 'revoked';

interface Provider {
  id:          number;
  name:        string;
  category:    string;
  ecoScore:    number;
  country:     string;
  status:      ProviderStatus;
  owner:       string;
  email?:      string;
  evidence?:   string;
  registeredAt?: number;   // block height
  approvedAt?:   number;
  stampsIssued:  number;
  signingKeyHash?: string;
}

type Tab = 'pending' | 'approved' | 'revoked' | 'pool';

// ── Demo data (replaced by chain reads in Phase 5) ───────────────────────────

const DEMO_PROVIDERS: Provider[] = [
  {
    id: 9,  name: 'Nordic Eco Cabins',  category: 'hotel',    ecoScore: 91, country: 'Finland',
    status: 'pending',  owner: 'ST1ABC...DEF1', email: 'ops@nordic-eco.fi',
    evidence: 'Green Key certified since 2022. Audit ref: GK-FI-2022-0441.',
    registeredAt: 145200, stampsIssued: 0,
  },
  {
    id: 10, name: 'Patagonia Pedal Co.', category: 'activity', ecoScore: 99, country: 'Argentina',
    status: 'pending',  owner: 'ST2DEF...GHI2', email: 'hello@patagoniapedal.ar',
    evidence: 'GSTC-recognised. Leave No Trace certified guides.',
    registeredAt: 145350, stampsIssued: 0,
  },
  {
    id: 11, name: 'Adriatic Sail & Stay', category: 'cruise',  ecoScore: 84, country: 'Croatia',
    status: 'pending',  owner: 'ST3GHI...JKL3', email: 'info@adriaticsail.hr',
    evidence: 'ISO 14001:2015 certified. Blue Flag marina partner.',
    registeredAt: 145480, stampsIssued: 0,
  },
  {
    id: 1,  name: 'The Green Lodge',    category: 'hotel',    ecoScore: 92, country: 'Norway',
    status: 'approved', owner: 'ST4JKL...MNO4',
    registeredAt: 140100, approvedAt: 140800, stampsIssued: 284,
    signingKeyHash: '0xa1b2c3d4e5f6...7890',
  },
  {
    id: 2,  name: 'EcoRail Europe',     category: 'train',    ecoScore: 97, country: 'Germany',
    status: 'approved', owner: 'ST5MNO...PQR5',
    registeredAt: 139200, approvedAt: 139900, stampsIssued: 512,
    signingKeyHash: '0xb2c3d4e5f6a1...8901',
  },
  {
    id: 7,  name: 'Solaris Retreats',   category: 'hotel',    ecoScore: 89, country: 'Portugal',
    status: 'revoked',  owner: 'ST6PQR...STU6',
    registeredAt: 138000, approvedAt: 138700, stampsIssued: 12,
    signingKeyHash: '0xc3d4e5f6a1b2...9012',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(s: string, n = 12): string {
  return s.length > n ? s.slice(0, 6) + '…' + s.slice(-4) : s;
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return '0x' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function callContract(
  fn: string,
  args: any[],
  contractEnvKey: string,
): Promise<string> {
  try {
    const { openContractCall } = await import('@stacks/connect');
    const contractAddress = process.env[contractEnvKey] || '';
    if (!contractAddress) throw new Error('no contract');
    const [addr, name] = contractAddress.split('.');
    return new Promise((resolve, reject) => {
      openContractCall({
        contractAddress: addr, contractName: name,
        functionName: fn, functionArgs: args,
        network:    stacksNetwork(),
        appDetails: { name: 'EcoStamp', icon: '/icon.png' },
        onFinish:   (d: any) => resolve(d.txId ?? d.txid ?? 'pending'),
        onCancel:   () => reject(new Error('cancelled')),
      });
    });
  } catch {
    await new Promise(r => setTimeout(r, 1500));
    return randomHex(32);
  }
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ProviderStatus }) {
  const cfg = {
    pending:  'bg-amber-400/10 text-amber-300 border-amber-400/20',
    approved: 'bg-glow-400/10 text-glow-400 border-glow-300/20',
    revoked:  'bg-red-400/10  text-red-400  border-red-400/20',
  }[status];
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${cfg}`}>
      {status}
    </span>
  );
}

// ── ApproveModal ──────────────────────────────────────────────────────────────

function ApproveModal({
  provider, onClose, onApproved,
}: { provider: Provider; onClose: () => void; onApproved: (id: number, keyHash: string, txid: string) => void }) {
  const [keyHash, setKeyHash]   = useState('');
  const [pending, setPending]   = useState(false);
  const [error, setError]       = useState('');

  const generateKey = () => setKeyHash(randomHex(32));

  const approve = async () => {
    if (!keyHash || keyHash.length < 10) { setError('Enter or generate a signing key hash'); return; }
    setPending(true); setError('');
    try {
      const { uintCV } = await import('@stacks/transactions');
      const txid = await callContract(
        'approve-provider',
        [uintCV(provider.id), bufferCvFromHex(keyHash)],
        'NEXT_PUBLIC_PROVIDER_REGISTRY_ADDRESS',
      );
      onApproved(provider.id, keyHash, txid);
    } catch (e: any) {
      if (e.message !== 'cancelled') setError(e.message);
    } finally { setPending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-forest-900/80 backdrop-blur-sm" />
      <div className="relative glass rounded-3xl p-6 max-w-md w-full space-y-5 animate-fade-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl text-cream-100">Approve provider</h3>
          <button onClick={onClose} className="glass-light rounded-xl p-2 hover:bg-white/10 transition-colors">
            <IconX size={16} />
          </button>
        </div>

        <div className="glass-light rounded-xl p-4 text-sm space-y-1">
          <div className="font-medium text-cream-200">{provider.name}</div>
          <div className="text-sage-400 capitalize">{provider.category} · {provider.country} · Score {provider.ecoScore}</div>
          <div className="text-sage-500 text-xs">{provider.evidence}</div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-sage-400 flex items-center gap-2">
            <IconKey size={14} />
            Signing key hash (32 bytes / 64 hex chars)
          </label>
          <div className="flex gap-2">
            <input
              className="eco-input flex-1 font-mono text-xs"
              placeholder="0x…"
              value={keyHash}
              onChange={e => setKeyHash(e.target.value)}
            />
            <button onClick={generateKey} className="btn-ghost px-3 py-2 text-xs shrink-0">
              Generate
            </button>
          </div>
          <p className="text-xs text-sage-600">
            This is sha256(compressed secp256k1 public key). Generate here for demo — in production the provider generates their own key pair.
          </p>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-ghost px-4 py-3 text-sm flex-1">Cancel</button>
          <button onClick={approve} disabled={pending} className="btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {pending ? <><IconZap size={14} className="animate-pulse" /> Approving…</> : <><IconCheckCircle size={14} /> Approve</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PoolSeedPanel ─────────────────────────────────────────────────────────────

function PoolSeedPanel() {
  const [amount, setAmount] = useState('5000000');
  const [pending, setPending] = useState(false);
  const [txid, setTxid]     = useState('');
  const [error, setError]   = useState('');

  const seed = async () => {
    setPending(true); setError('');
    try {
      const { uintCV } = await import('@stacks/transactions');
      const tx = await callContract('admin-seed-pool', [uintCV(Number(amount))], 'NEXT_PUBLIC_REWARD_POOL_ADDRESS');
      setTxid(tx);
    } catch (e: any) {
      if (e.message !== 'cancelled') setError(e.message);
    } finally { setPending(false); }
  };

  const stx = (Number(amount) / 1_000_000).toFixed(4);

  return (
    <div className="glass rounded-3xl p-6 space-y-5">
      <h3 className="font-display text-xl text-cream-100 flex items-center gap-2">
        <IconBitcoin size={20} className="text-glow-400" />
        Seed Reward Pool
      </h3>
      <p className="text-sm text-sage-400">
        Call admin-seed-pool on reward-pool.clar to add STX to the epoch pool.
        Only callable by the contract owner.
      </p>
      <div className="space-y-2">
        <label className="text-sm text-sage-400">Amount (microSTX)</label>
        <div className="flex gap-3 items-center">
          <input
            className="eco-input w-48 font-mono"
            value={amount}
            onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
          />
          <span className="text-sage-400 text-sm">{stx} STX</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[1_000_000, 5_000_000, 10_000_000, 42_000_000].map(v => (
            <button key={v} onClick={() => setAmount(String(v))}
              className="text-xs glass-light px-2 py-1 rounded-lg text-sage-400 hover:text-cream-200 transition-colors">
              {v / 1_000_000} STX
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {txid && (
        <div className="flex items-center gap-2 text-xs text-glow-400">
          <IconCheckCircle size={14} />
          <a href={hiroTxUrl(txid)}
             target="_blank" rel="noopener noreferrer" className="underline">
            Pool seeded · view tx ↗
          </a>
        </div>
      )}
      <button onClick={seed} disabled={pending || !amount}
        className="btn-primary px-6 py-3 text-sm flex items-center gap-2 disabled:opacity-40">
        {pending ? <><IconZap size={14} className="animate-pulse" /> Seeding…</> : <><IconBitcoin size={14} /> Seed Pool</>}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminPanel({ walletAddress }: { walletAddress: string | null }) {
  const [providers, setProviders] = useState<Provider[]>(DEMO_PROVIDERS);
  const [tab, setTab]             = useState<Tab>('pending');
  const [search, setSearch]       = useState('');
  const [approving, setApproving] = useState<Provider | null>(null);
  const [pendingTxs, setPendingTxs] = useState<Record<number, string>>({});

  // Admin address: single source of truth from NEXT_PUBLIC_ADMIN_ADDRESS.
  // Fail-closed: if blank, nobody can access admin.
  const adminAddress = (process.env.NEXT_PUBLIC_ADMIN_ADDRESS || '').trim();
  const isAdmin = adminAddress !== '' && walletAddress === adminAddress;

  // ── Access gate (belt-and-suspenders: page.tsx also guards this route) ─────

  if (!walletAddress || !isAdmin) {
    return (
      <section className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 page-enter">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-6 mx-auto animate-float">
            <IconShield size={32} className="text-sage-400" />
          </div>
          <h3 className="font-display text-2xl text-cream-200 mb-3">Admin access</h3>
          <p className="text-sage-400 max-w-sm">
            {!walletAddress
              ? 'Connect the admin wallet to access this panel.'
              : 'Connected wallet does not match NEXT_PUBLIC_ADMIN_ADDRESS.'}
          </p>
          {walletAddress && (
            <p className="text-sage-600 text-xs mt-2 font-mono">{truncate(walletAddress, 20)}</p>
          )}
        </div>
      </section>
    );
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleApproved = (id: number, keyHash: string, txid: string) => {
    setProviders(ps => ps.map(p => p.id === id
      ? { ...p, status: 'approved', signingKeyHash: keyHash, approvedAt: Date.now() }
      : p
    ));
    setPendingTxs(t => ({ ...t, [id]: txid }));
    setApproving(null);

    // Deliver signing key via API after approval
    fetch('/api/signing-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: id, keyHash, txid }),
    }).catch(() => {});
  };

  const handleRevoke = async (provider: Provider) => {
    if (!confirm(`Revoke ${provider.name}? This will prevent new stamps from being issued.`)) return;
    try {
      const { uintCV } = await import('@stacks/transactions');
      const txid = await callContract('revoke-provider', [uintCV(provider.id)], 'NEXT_PUBLIC_PROVIDER_REGISTRY_ADDRESS');
      setProviders(ps => ps.map(p => p.id === provider.id ? { ...p, status: 'revoked' } : p));
      setPendingTxs(t => ({ ...t, [provider.id]: txid }));
    } catch {}
  };

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = providers.filter(p =>
    p.status === (tab === 'pool' ? 'approved' : tab) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
     p.country.toLowerCase().includes(search.toLowerCase()))
  );

  const counts = {
    pending:  providers.filter(p => p.status === 'pending').length,
    approved: providers.filter(p => p.status === 'approved').length,
    revoked:  providers.filter(p => p.status === 'revoked').length,
  };

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'pending',  label: 'Pending',  count: counts.pending  },
    { id: 'approved', label: 'Approved', count: counts.approved },
    { id: 'revoked',  label: 'Revoked',  count: counts.revoked  },
    { id: 'pool',     label: 'Pool Seed' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {approving && (
        <ApproveModal
          provider={approving}
          onClose={() => setApproving(null)}
          onApproved={handleApproved}
        />
      )}

      <section className="min-h-[calc(100vh-64px)] px-4 sm:px-6 lg:px-8 py-12 page-enter">
        <div className="max-w-5xl mx-auto space-y-6">

          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-4xl text-cream-100 flex items-center gap-3">
                <IconShield size={32} className="text-glow-400" />
                Admin Panel
              </h2>
              <p className="text-sage-400 mt-2">Verifier dashboard — approve providers, issue signing keys.</p>
            </div>
            <div className="glass-light rounded-xl px-3 py-2 text-xs text-sage-400 font-mono hidden sm:block">
              {truncate(walletAddress, 20)}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-xl text-sm transition-all duration-200 flex items-center gap-2
                  ${tab === t.id
                    ? 'bg-moss-500/40 text-cream-100 border border-glow-300/30'
                    : 'glass-light text-sage-400 hover:text-cream-200'}`}
              >
                {t.label}
                {t.count !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full
                    ${t.id === 'pending' && t.count > 0 ? 'bg-amber-400/20 text-amber-300' : 'bg-white/10 text-sage-500'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Pool seed tab */}
          {tab === 'pool' && <PoolSeedPanel />}

          {/* Provider list tabs */}
          {tab !== 'pool' && (
            <>
              <input
                className="eco-input max-w-xs"
                placeholder="Search providers…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />

              <div className="space-y-3">
                {filtered.length === 0 && (
                  <div className="glass rounded-2xl p-8 text-center text-sage-500">
                    No {tab} providers{search && ` matching "${search}"`}.
                  </div>
                )}

                {filtered.map((p, i) => (
                  <div
                    key={p.id}
                    className="glass rounded-2xl p-5 flex flex-col sm:flex-row gap-4 animate-fade-up"
                    style={{ animationDelay: `${i * 0.04}s`, animationFillMode: 'both' }}
                  >
                    {/* Icon + name */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
                        <CategoryIcon category={p.category} size={18} className="text-white/80" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-cream-200">{p.name}</span>
                          <StatusBadge status={p.status} />
                        </div>
                        <div className="text-xs text-sage-500 mt-0.5 capitalize">
                          {p.category} · {p.country} · Score {p.ecoScore}
                        </div>
                        {p.email && <div className="text-xs text-sage-600 mt-0.5">{p.email}</div>}
                        {p.evidence && <div className="text-xs text-sage-600 mt-1 line-clamp-2">{p.evidence}</div>}
                        {p.signingKeyHash && (
                          <div className="text-xs text-glow-400/60 font-mono mt-1">
                            key: {p.signingKeyHash.slice(0, 20)}…
                          </div>
                        )}
                        {pendingTxs[p.id] && (
                          <a
                            href={hiroTxUrl(pendingTxs[p.id])}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs text-glow-300 underline mt-1 inline-block"
                          >
                            View tx ↗
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-center shrink-0">
                      <div>
                        <div className="font-display text-lg text-cream-100">{p.stampsIssued}</div>
                        <div className="text-xs text-sage-600">stamps</div>
                      </div>
                      <div>
                        <div className="font-display text-lg text-cream-100">{p.ecoScore}</div>
                        <div className="text-xs text-sage-600">eco score</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {p.status === 'pending' && (
                        <button
                          onClick={() => setApproving(p)}
                          className="btn-primary px-4 py-2.5 text-xs flex items-center gap-1.5"
                        >
                          <IconCheckCircle size={13} /> Approve
                        </button>
                      )}
                      {p.status === 'approved' && (
                        <>
                          <button
                            onClick={async () => {
                              await fetch('/api/signing-key', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ providerId: p.id, keyHash: p.signingKeyHash, resend: true }),
                              });
                              alert(`Signing key re-sent to ${p.email || 'provider'}`);
                            }}
                            className="btn-ghost px-3 py-2.5 text-xs flex items-center gap-1.5"
                          >
                            <IconKey size={13} /> Resend key
                          </button>
                          <button
                            onClick={() => handleRevoke(p)}
                            className="glass-light px-3 py-2.5 text-xs rounded-xl text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-1.5"
                          >
                            <IconX size={13} /> Revoke
                          </button>
                        </>
                      )}
                      {p.status === 'revoked' && (
                        <span className="text-xs text-sage-600 italic">No actions available</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </section>
    </>
  );
}
