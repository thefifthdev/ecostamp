/**
 * GET /api/stamp-token?wallet=ST...
 *
 * Reads the wallet's stamp balance from stamp-registry (Stacks read-only call),
 * derives their tier, and returns a signed JWT the client can pass as
 * X-EcoStamp-Token to the content server for discounted x402 prices.
 *
 * This runs server-side so the JWT secret never leaves the Next.js server.
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const STAMP_JWT_SECRET  = process.env.STAMP_JWT_SECRET  || 'ecostamp-dev-secret-change-in-prod';
const STACKS_API        = process.env.NEXT_PUBLIC_STACKS_API || 'https://api.testnet.hiro.so';
const STAMP_CONTRACT    = process.env.NEXT_PUBLIC_STAMP_REGISTRY_ADDRESS;
const CONTRACT_NAME     = 'stamp-registry';

function getTier(points: number): 'bronze' | 'silver' | 'gold' {
  if (points >= 60) return 'gold';
  if (points >= 20) return 'silver';
  return 'bronze';
}

/**
 * Read stamp count for a wallet from the on-chain stamp-registry.
 * Falls back to 0 on any error (network down, contract not deployed yet).
 */
async function getStampCount(wallet: string): Promise<number> {
  if (!STAMP_CONTRACT) return 0;
  try {
    const url = `${STACKS_API}/v2/contracts/call-read/${STAMP_CONTRACT}/${CONTRACT_NAME}/get-overall-balance`;
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: wallet,
        arguments: [`0x${Buffer.from(serializePrincipal(wallet)).toString('hex')}`],
      }),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    // Clarity response: (ok (some u<count>)) or (ok none)
    const hex = data.result ?? '';
    const match = hex.match(/u(\d+)/);
    return match ? Number(match[1]) : 0;
  } catch {
    return 0;
  }
}

/** Minimal Clarity principal serialisation for read-only call */
function serializePrincipal(address: string): string {
  return address;
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');

  if (!wallet || !wallet.startsWith('ST')) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
  }

  const stampCount = await getStampCount(wallet);
  const tier       = getTier(stampCount);

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