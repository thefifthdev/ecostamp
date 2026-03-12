import { CONTRACTS, fetchProvider, type ProviderRecord } from '@/lib/stacks';

const API = (process.env.NEXT_PUBLIC_STACKS_API || 'https://api.testnet.hiro.so').replace(/\/$/, '');

export interface EarnStampTx {
  txId:       string;
  providerId: number;
  bookingHash: string;
  ecoPoints:  number;
  mintedAt:   string;
}

function parseUintRepr(repr: string | undefined): number {
  const m = String(repr ?? '').match(/u(\d+)/);
  return m ? Number(m[1]) : 0;
}

function parseBuffRepr(repr: string | undefined): string {
  const s = String(repr ?? '');
  const m = s.match(/0x[0-9a-fA-F]+/);
  return m ? m[0] : s;
}

async function fetchAddressTransactions(address: string, limit = 50, offset = 0): Promise<any[]> {
  const url = `${API}/extended/v1/address/${address}/transactions?limit=${limit}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data.results) ? data.results : [];
}

export async function fetchEarnStampTxs(walletAddress: string, limit = 50): Promise<EarnStampTx[]> {
  if (!CONTRACTS.stampRegistry) return [];

  const results = await fetchAddressTransactions(walletAddress, limit);
  const out: EarnStampTx[] = [];

  for (const tx of results) {
    if (tx?.tx_type !== 'contract_call') continue;
    if (tx?.contract_call?.contract_id !== CONTRACTS.stampRegistry) continue;
    if (tx?.contract_call?.function_name !== 'earn-stamp') continue;

    const args = tx?.contract_call?.function_args ?? [];
    const providerId = parseUintRepr(args?.[0]?.repr);
    const bookingHash = parseBuffRepr(args?.[1]?.repr);
    const ecoPoints = parseUintRepr(args?.[3]?.repr);
    const mintedAt = tx?.burn_block_time_iso || tx?.block_time_iso || new Date().toISOString();

    out.push({
      txId: tx?.tx_id,
      providerId,
      bookingHash,
      ecoPoints,
      mintedAt,
    });
  }

  return out;
}

const providerCache = new Map<number, ProviderRecord | null>();

export async function getProviderCached(providerId: number): Promise<ProviderRecord | null> {
  if (providerCache.has(providerId)) return providerCache.get(providerId) ?? null;
  const p = await fetchProvider(providerId).catch(() => null);
  providerCache.set(providerId, p);
  return p;
}

