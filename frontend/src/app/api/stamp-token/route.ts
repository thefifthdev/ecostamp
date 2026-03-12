/**
 * GET /api/stamp-token?wallet=ST...
 *
 * Reads the wallet's stamp balance + tier from stamp-registry (Stacks read-only call),
 * and returns a signed JWT the client can pass as
 * X-EcoStamp-Token to the content server for discounted x402 prices.
 *
 * This runs server-side so the JWT secret never leaves the Next.js server.
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cvToHex, hexToCV, cvToJSON, standardPrincipalCV } from '@stacks/transactions';

const STAMP_JWT_SECRET  = process.env.STAMP_JWT_SECRET  || 'ecostamp-dev-secret-change-in-prod';
const STACKS_API        = process.env.NEXT_PUBLIC_STACKS_API || 'https://api.testnet.hiro.so';
const STAMP_CONTRACT    = (process.env.NEXT_PUBLIC_STAMP_REGISTRY_ADDRESS || '').trim();

function asTier(tier: number): 'bronze' | 'silver' | 'gold' {
  if (tier >= 2) return 'gold';
  if (tier >= 1) return 'silver';
  return 'bronze';
}

function parseUintFromJson(j: any): number {
  if (!j) return 0;
  if (j.type === 'uint') return Number(j.value);
  if (j.type === 'int') return Number(j.value);
  if (j.type === 'response') {
    return j.value?.success ? parseUintFromJson(j.value.value) : 0;
  }
  if (j.type === 'optional') {
    return j.value ? parseUintFromJson(j.value) : 0;
  }
  return 0;
}

function decodeReadOnlyResult(result: any): any | null {
  const raw = String(result ?? '');
  if (!raw) return null;
  if (raw.startsWith('0x')) {
    try {
      const cv = hexToCV(raw);
      return cvToJSON(cv);
    } catch {
      return null;
    }
  }
  // Fallback: best-effort parsing for repr strings like "(ok u42)".
  const m = raw.match(/u(\d+)/);
  if (m) return { type: 'uint', value: m[1] };
  return null;
}

async function callRead(functionName: string, wallet: string): Promise<any | null> {
  if (!STAMP_CONTRACT.includes('.')) return null;
  const [contractAddress, contractName] = STAMP_CONTRACT.split('.');
  const url = `${STACKS_API}/v2/contracts/call-read/${contractAddress}/${contractName}/${functionName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: wallet,
      arguments: [cvToHex(standardPrincipalCV(wallet))],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return decodeReadOnlyResult(data.result);
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');

  if (!wallet || (!wallet.startsWith('ST') && !wallet.startsWith('SP'))) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
  }

  if (!STAMP_CONTRACT || !STAMP_CONTRACT.includes('.')) {
    return NextResponse.json(
      { error: 'Stamp registry is not configured (NEXT_PUBLIC_STAMP_REGISTRY_ADDRESS missing)' },
      { status: 503 }
    );
  }

  const [stampCountJson, tierJson] = await Promise.all([
    callRead('get-total-stamps', wallet),
    callRead('get-tier', wallet),
  ]);

  const stampCount = parseUintFromJson(stampCountJson);
  const tierNum    = parseUintFromJson(tierJson);
  const tier       = asTier(tierNum);

  const token = jwt.sign(
    { wallet, tier, stampCount, iss: 'ecostamp-oracle' },
    STAMP_JWT_SECRET,
    { expiresIn: '24h' }
  );

  return NextResponse.json({
    token,
    wallet,
    tier,
    stampCount,
    expiresIn: '24h',
  });
}
