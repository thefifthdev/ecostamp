import { NextRequest, NextResponse } from 'next/server';

const ORACLE_URL = (process.env.ORACLE_URL || 'http://localhost:3002').replace(/\/$/, '');

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { bookingRef, providerId, walletAddress } = body ?? {};

  if (!bookingRef || !providerId || !walletAddress) {
    return NextResponse.json(
      { error: 'bookingRef, providerId, walletAddress required' },
      { status: 400 }
    );
  }

  try {
    const upstream = await fetch(`${ORACLE_URL}/sign-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingRef, providerId, walletAddress }),
    });

    const text = await upstream.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { /* keep as null */ }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: data?.error || 'Oracle error', detail: data ?? text.slice(0, 200) },
        { status: upstream.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Oracle unreachable', detail: err?.message ?? String(err) },
      { status: 503 }
    );
  }
}

