/**
 * POST /api/x402/fetch
 *
 * Server-side x402-aware fetch proxy.
 * The browser cannot directly handle x402's 402 -> pay -> retry flow
 * (requires wallet signing of EIP-712 USDC permit), so we proxy through
 * Next.js where the @x402/fetch client can do the full flow using the
 * payment details from the 402 response.
 *
 * Request body:
 *   { url: string, stampToken?: string }
 *
 * The stampToken (from /api/stamp-token) is forwarded as X-EcoStamp-Token
 * to the content server for discounted pricing.
 *
 * Flow:
 *   1. Client hits this route with target URL + optional stamp token
 *   2. We attempt fetch with @x402/fetch (handles 402 automatically)
 *   3. On 402: extracts payment requirements, returns them to client
 *   4. Client signs the USDC permit in their wallet (Leather / Xverse)
 *   5. Client retries with X-PAYMENT header containing signed permit
 *   6. We forward the retry to content server and stream back the response
 *
 * Note: For hackathon demo, step 4-6 is simulated with a demo payment.
 */

import { NextRequest, NextResponse } from 'next/server';

const CONTENT_SERVER = process.env.CONTENT_SERVER_URL || 'http://localhost:3001';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { url, stampToken, paymentHeader } = body;

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  // Only allow fetching from our own content server (security: no SSRF)
  const allowedBase = CONTENT_SERVER.replace(/\/$/, '');
  if (!url.startsWith(allowedBase) && !url.startsWith('/')) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
  }

  const targetUrl = url.startsWith('/') ? `${allowedBase}${url}` : url;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };
  if (stampToken) headers['X-EcoStamp-Token'] = stampToken;
  if (paymentHeader) headers['X-PAYMENT'] = paymentHeader;

  try {
    const upstream = await fetch(targetUrl, { headers });

    // x402 Payment Required — return payment requirements to client
    if (upstream.status === 402) {
      const paymentDetails = await upstream.json().catch(() => ({}));
      return NextResponse.json(
        {
          status:  402,
          payment: paymentDetails,
          message: 'Payment required. Sign the USDC permit in your wallet and retry.',
        },
        {
          // Use 200 so the browser doesn't log "Failed to load resource" for
          // expected payment challenges. Clients must branch on body.status.
          status: 200,
          headers: {
            'X-PAYMENT-RESPONSE': upstream.headers.get('X-PAYMENT-RESPONSE') || '',
          },
        }
      );
    }

    if (!upstream.ok) {
      const err = await upstream.text();
      return NextResponse.json(
        { error: `Content server error: ${upstream.status}`, detail: err.slice(0, 200) },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();
    const paymentReceipt = upstream.headers.get('X-PAYMENT-RESPONSE') || '';
    return NextResponse.json({ ...data, paymentReceipt: paymentReceipt || undefined });

  } catch (err: any) {
    return NextResponse.json(
      { error: 'Content server unreachable', detail: err.message },
      { status: 503 }
    );
  }
}
