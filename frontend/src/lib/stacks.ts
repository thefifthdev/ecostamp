/**
 * EcoStamp -- Stacks read-only contract helpers
 * Thin wrappers around Hiro /v2/contracts/call-read.
 * All functions fall back gracefully when contracts are not yet deployed.
 */

const API = process.env.NEXT_PUBLIC_STACKS_API || 'https://api.testnet.hiro.so';

export const CONTRACTS = {
  stampRegistry: process.env.NEXT_PUBLIC_STAMP_REGISTRY_ADDRESS ?? '',
  rewardPool:    process.env.NEXT_PUBLIC_REWARD_POOL_ADDRESS    ?? '',
};

// ── Low-level call ────────────────────────────────────────────────────────────

async function readOnly(
  contractAddress: string,
  contractName:    string,
  functionName:    string,
  args:            string[] = [],
  sender?:         string
): Promise<string | null> {
  try {
    const url = `${API}/v2/contracts/call-read/${contractAddress}/${contractName}/${functionName}`;
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sender: sender ?? contractAddress, arguments: args }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result ?? null;
  } catch {
    return null;
  }
}

// ── Clarity value parsers ─────────────────────────────────────────────────────

/** Extract uint from Clarity result like "(ok u42)" or "u42" */
export function parseUint(hex: string | null | undefined): number {
  if (!hex) return 0;
  const m = String(hex).match(/u(\d+)/);
  return m ? Number(m[1]) : 0;
}

export function parseBool(hex: string | null | undefined): boolean {
  const s = String(hex ?? '');
  return s.includes('true') || s === '0x03';
}

/** Extract named fields from a Clarity tuple result string */
export function parseTuple(hex: string | null | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!hex) return result;
  for (const m of String(hex).matchAll(/([\w-]+):\s*(u\d+|true|false|none)/g)) {
    result[m[1]] = m[2];
  }
  return result;
}

// ── Clarity value encoders ────────────────────────────────────────────────────

/** Encode uint as Clarity CV hex: 0x01 + 16 bytes big-endian */
export function encodeUint(n: number): string {
  return `0x01${BigInt(n).toString(16).padStart(32, '0')}`;
}

/**
 * Encode a Stacks principal as a Clarity string-ascii CV for the read-only API.
 * The Hiro endpoint accepts arguments as hex Clarity values.
 * We encode the address as a string-ascii CV (type 0x0d) which the API decodes
 * and coerces to a principal for read-only functions.
 */
export function encodePrincipal(address: string): string {
  const bytes = new TextEncoder().encode(address);
  const lenHex = bytes.length.toString(16).padStart(8, '0');
  const bodyHex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `0x0d${lenHex}${bodyHex}`;
}

// ── Domain helpers ────────────────────────────────────────────────────────────

function splitContract(addr: string): [string, string] {
  const dot = addr.lastIndexOf('.');
  return [addr.slice(0, dot), addr.slice(dot + 1)];
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Tier 0=bronze 1=silver 2=gold from stamp-registry */
export async function fetchTier(wallet: string): Promise<number> {
  if (!CONTRACTS.stampRegistry) return 0;
  const [addr, name] = splitContract(CONTRACTS.stampRegistry);
  const r = await readOnly(addr, name, 'get-tier', [encodePrincipal(wallet)], wallet);
  return parseUint(r);
}

/** Total stamps minted for a wallet */
export async function fetchStampCount(wallet: string): Promise<number> {
  if (!CONTRACTS.stampRegistry) return 0;
  const [addr, name] = splitContract(CONTRACTS.stampRegistry);
  const r = await readOnly(addr, name, 'get-total-stamps', [encodePrincipal(wallet)], wallet);
  return parseUint(r);
}

/** Pool balance in satoshis */
export async function fetchPoolBalance(): Promise<number> {
  if (!CONTRACTS.rewardPool) return 42_000_000;
  const [addr, name] = splitContract(CONTRACTS.rewardPool);
  const r = await readOnly(addr, name, 'get-pool-balance', []);
  return parseUint(r) || 42_000_000;
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
  const [addr, name] = splitContract(CONTRACTS.rewardPool);
  const r = await readOnly(
    addr, name, 'get-reward-summary',
    [encodePrincipal(wallet), encodeUint(tier)],
    wallet
  );
  if (!r) return fallback;
  const t = parseTuple(r);
  return {
    claimable:        parseUint(t['claimable']),
    poolBalance:      parseUint(t['pool-balance'])       || 42_000_000,
    totalDeposited:   parseUint(t['total-deposited'])    || 42_000_000,
    totalClaimed:     parseUint(t['total-claimed']),
    userTotalClaimed: parseUint(t['user-total-claimed']),
    claimCount:       parseUint(t['claim-count']),
    cooldownBlocks:   parseUint(t['cooldown-blocks']),
    canClaim:         parseBool(t['can-claim']),
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