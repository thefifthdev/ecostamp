/**
 * EcoStamp -- Stacks read-only contract helpers
 * Thin wrappers around Hiro /v2/contracts/call-read.
 * All functions fall back gracefully when contracts are not yet deployed.
 */

import { cvToHex, cvToJSON, hexToCV, standardPrincipalCV, uintCV } from '@stacks/transactions';

const API = process.env.NEXT_PUBLIC_STACKS_API || 'https://api.testnet.hiro.so';

export const CONTRACTS = {
  providerRegistry: process.env.NEXT_PUBLIC_PROVIDER_REGISTRY_ADDRESS ?? '',
  stampRegistry:    process.env.NEXT_PUBLIC_STAMP_REGISTRY_ADDRESS    ?? '',
  rewardPool:       process.env.NEXT_PUBLIC_REWARD_POOL_ADDRESS       ?? '',
};

// ── Low-level call ────────────────────────────────────────────────────────────

type CvJson = any;

function decodeReadOnlyResult(result: any): CvJson | null {
  const raw = String(result ?? '');
  if (!raw) return null;
  if (raw.startsWith('0x')) {
    try {
      return cvToJSON(hexToCV(raw));
    } catch {
      return null;
    }
  }
  // Fallback: best-effort for repr strings like "(ok u42)" or "u42"
  const m = raw.match(/u(\d+)/);
  if (m) return { type: 'uint', value: m[1] };
  if (raw.includes('true')) return { type: 'bool', value: true };
  if (raw.includes('false')) return { type: 'bool', value: false };
  return null;
}

function unwrapResponse(j: CvJson | null): CvJson | null {
  if (!j) return null;
  if (j.type === 'response') return j.value?.success ? (j.value?.value ?? null) : null;
  return j;
}

function asUint(j: CvJson | null | undefined): number {
  if (!j) return 0;
  if (j.type === 'uint' || j.type === 'int') return Number(j.value);
  if (j.type === 'optional') return j.value ? asUint(j.value) : 0;
  if (j.type === 'response') return unwrapResponse(j) ? asUint(unwrapResponse(j)) : 0;
  return 0;
}

function asBool(j: CvJson | null | undefined): boolean {
  if (!j) return false;
  if (j.type === 'bool') return Boolean(j.value);
  if (j.type === 'optional') return j.value ? asBool(j.value) : false;
  if (j.type === 'response') return unwrapResponse(j) ? asBool(unwrapResponse(j)) : false;
  return false;
}

function asTuple(j: CvJson | null | undefined): Record<string, CvJson> {
  if (!j) return {};
  const unwrapped = unwrapResponse(j);
  if (unwrapped?.type !== 'tuple') return {};
  return unwrapped.value ?? {};
}

function splitContract(addr: string): [string, string] {
  const dot = addr.lastIndexOf('.');
  return [addr.slice(0, dot), addr.slice(dot + 1)];
}

async function callRead(
  contractId:   string,
  functionName: string,
  args:         any[] = [],
  sender?:      string
): Promise<CvJson | null> {
  try {
    if (!contractId || !contractId.includes('.')) return null;
    const [contractAddress, contractName] = splitContract(contractId);
    const url = `${API}/v2/contracts/call-read/${contractAddress}/${contractName}/${functionName}`;
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        sender: sender ?? contractAddress,
        arguments: args.map(a => cvToHex(a)),
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return decodeReadOnlyResult(data.result);
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Tier 0=bronze 1=silver 2=gold from stamp-registry */
export async function fetchTier(wallet: string): Promise<number> {
  if (!CONTRACTS.stampRegistry) return 0;
  const j = await callRead(CONTRACTS.stampRegistry, 'get-tier', [standardPrincipalCV(wallet)], wallet);
  return asUint(unwrapResponse(j));
}

/** Total stamps minted for a wallet */
export async function fetchStampCount(wallet: string): Promise<number> {
  if (!CONTRACTS.stampRegistry) return 0;
  const j = await callRead(CONTRACTS.stampRegistry, 'get-total-stamps', [standardPrincipalCV(wallet)], wallet);
  return asUint(unwrapResponse(j));
}

/** Total eco points for a wallet */
export async function fetchEcoPoints(wallet: string): Promise<number> {
  if (!CONTRACTS.stampRegistry) return 0;
  const j = await callRead(CONTRACTS.stampRegistry, 'get-eco-points', [standardPrincipalCV(wallet)], wallet);
  return asUint(unwrapResponse(j));
}

/** Pool balance in satoshis */
export async function fetchPoolBalance(): Promise<number> {
  if (!CONTRACTS.rewardPool) return 42_000_000;
  const j = await callRead(CONTRACTS.rewardPool, 'get-pool-balance', []);
  return asUint(unwrapResponse(j)) || 42_000_000;
}

export interface RewardSummary {
  claimable:        number;
  poolBalance:      number;
  totalDeposited:   number;
  totalClaimed:     number;
  userTotalClaimed: number;
  claimCount:       number;
  cooldownBlocks:   number;
  canClaim:         boolean;
}

/** Full reward summary for a user at a given tier */
export async function fetchRewardSummary(wallet: string, tier: number): Promise<RewardSummary> {
  const fallback: RewardSummary = {
    claimable: 0, poolBalance: 42_000_000, totalDeposited: 42_000_000,
    totalClaimed: 0, userTotalClaimed: 0, claimCount: 0,
    cooldownBlocks: 0, canClaim: false,
  };
  if (!CONTRACTS.rewardPool) return fallback;
  const j = await callRead(
    CONTRACTS.rewardPool,
    'get-reward-summary',
    [standardPrincipalCV(wallet), uintCV(tier)],
    wallet
  );
  if (!j) return fallback;
  const t = asTuple(j);
  return {
    claimable:        asUint(t['claimable']),
    poolBalance:      asUint(t['pool-balance'])       || 42_000_000,
    totalDeposited:   asUint(t['total-deposited'])    || 42_000_000,
    totalClaimed:     asUint(t['total-claimed']),
    userTotalClaimed: asUint(t['user-total-claimed']),
    claimCount:       asUint(t['claim-count']),
    cooldownBlocks:   asUint(t['cooldown-blocks']),
    canClaim:         asBool(t['can-claim']),
  };
}

// ── Tier display helpers ──────────────────────────────────────────────────────

export const TIER_CONFIG = [
  { name: 'Bronze', threshold: 0,  color: '#cd7f32', glow: 'rgba(205,127,50,0.2)'  },
  { name: 'Silver', threshold: 20, color: '#c0c0c0', glow: 'rgba(192,192,192,0.2)' },
  { name: 'Gold',   threshold: 60, color: '#ffd700', glow: 'rgba(255,215,0,0.2)'   },
] as const;

export function tierName(tier: number): string {
  return TIER_CONFIG[tier]?.name ?? 'Bronze';
}

export function satsToBtc(sats: number): string {
  return (sats / 100_000_000).toFixed(8);
}

export function satsToDisplay(sats: number): string {
  if (sats === 0) return '0';
  if (sats < 1000) return `${sats} sats`;
  return `${satsToBtc(sats)} sBTC`;
}

// ── Provider registry (Phase 4/5) ────────────────────────────────────────────

export interface ProviderRecord {
  id:          number;
  name:        string;
  category:    string;
  ecoScore:    number;
  status:      'pending' | 'approved' | 'revoked';
  owner:       string;
  stampsIssued: number;
  signingKeyHash?: string | null;
}

function asString(j: CvJson | null | undefined): string {
  if (!j) return '';
  if (j.type === 'string-ascii' || j.type === 'string-utf8') return String(j.value ?? '');
  if (j.type === 'principal') return String(j.value ?? '');
  if (j.type === 'optional') return j.value ? asString(j.value) : '';
  if (j.type === 'response') return unwrapResponse(j) ? asString(unwrapResponse(j)) : '';
  return '';
}

function asHex(j: CvJson | null | undefined): string {
  if (!j) return '';
  if (j.type === 'buffer') return String(j.value ?? '');
  if (j.type === 'optional') return j.value ? asHex(j.value) : '';
  if (j.type === 'response') return unwrapResponse(j) ? asHex(unwrapResponse(j)) : '';
  return '';
}

function statusFromUint(n: number): ProviderRecord['status'] {
  if (n === 1) return 'approved';
  if (n === 2) return 'revoked';
  return 'pending';
}

export async function fetchNextProviderId(): Promise<number> {
  if (!CONTRACTS.providerRegistry) return 1;
  const j = await callRead(CONTRACTS.providerRegistry, 'get-next-id', []);
  return asUint(unwrapResponse(j)) || 1;
}

export async function fetchProvider(providerId: number): Promise<ProviderRecord | null> {
  if (!CONTRACTS.providerRegistry) return null;
  const j = await callRead(CONTRACTS.providerRegistry, 'get-provider', [uintCV(providerId)]);
  const unwrapped = unwrapResponse(j);
  if (!unwrapped) return null;

  // get-provider returns (optional (tuple ...))
  if (unwrapped.type === 'optional' && !unwrapped.value) return null;
  const tuple = unwrapped.type === 'optional' ? asTuple(unwrapped.value) : asTuple(unwrapped);
  if (!Object.keys(tuple).length) return null;

  return {
    id:          providerId,
    name:        asString(tuple['name']),
    category:    asString(tuple['category']),
    ecoScore:    asUint(tuple['eco-score']),
    status:      statusFromUint(asUint(tuple['status'])),
    owner:       asString(tuple['owner']),
    stampsIssued: asUint(tuple['stamps-issued']),
    signingKeyHash: asHex(tuple['signing-key-hash']) || null,
  };
}

export async function fetchProviderIdByOwner(owner: string): Promise<number | null> {
  if (!CONTRACTS.providerRegistry) return null;
  const j = await callRead(CONTRACTS.providerRegistry, 'get-provider-id-by-owner', [standardPrincipalCV(owner)]);
  const unwrapped = unwrapResponse(j);
  if (!unwrapped || unwrapped.type !== 'optional' || !unwrapped.value) return null;
  const t = asTuple(unwrapped.value);
  const id = asUint(t['provider-id']);
  return id > 0 ? id : null;
}

export async function fetchProviderForOwner(owner: string): Promise<ProviderRecord | null> {
  const id = await fetchProviderIdByOwner(owner);
  if (!id) return null;
  return fetchProvider(id);
}

export async function fetchProviders(limit = 50): Promise<ProviderRecord[]> {
  const next = await fetchNextProviderId();
  const maxId = Math.min(next - 1, limit);
  if (maxId <= 0) return [];

  const ids = Array.from({ length: maxId }, (_, i) => i + 1);
  const records = await Promise.all(ids.map(id => fetchProvider(id)));
  return records.filter(Boolean) as ProviderRecord[];
}
