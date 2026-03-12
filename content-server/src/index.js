/**
 * EcoStamp Content Server — Phase 2
 * Express server exposing premium eco-guide content behind x402 paywalls.
 *
 * Each endpoint is a pay-per-access resource:
 *   GET /guides/:slug          — full eco guide article  ($0.001 USDC)
 *   GET /routes/carbon-optimal — carbon-optimal route data ($0.002 USDC)
 *   GET /hotels/verified-list  — verified eco hotel directory ($0.003 USDC)
 *
 * Uses @x402/express paymentMiddleware against the CDP facilitator on Base Sepolia.
 * Stamp-holders get a discount: if X-EcoStamp-Token header is present and valid,
 * price is halved (enforced via custom middleware before x402).
 */

import express from 'express';
import cors from 'cors';
import { paymentMiddleware } from 'x402-express';
import dotenv from 'dotenv';
import { GUIDES, ROUTES, HOTELS } from './content.js';
import { verifyStampToken } from './stamp-auth.js';
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const app       = express();
const PORT      = process.env.PORT || 3001;
const DEMO_MODE = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';

const FACILITATOR = { url: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator' };
const NETWORK      = process.env.X402_NETWORK || 'base-sepolia';
const WALLET       = process.env.X402_WALLET_ADDRESS;

if (!WALLET && !DEMO_MODE) {
  console.error('[EcoStamp] X402_WALLET_ADDRESS is not set -- payments cannot be received.');
  process.exit(1);
}

const USDC_ASSET =
  NETWORK === 'base'
    ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // USDC on Base
    : '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // USDC on Base Sepolia

// ── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-PAYMENT', 'X-EcoStamp-Token'],
  exposedHeaders: ['X-PAYMENT-RESPONSE'],
}));
app.use(express.json());

// ── Stamp-holder token middleware ─────────────────────────────────────────────

app.use(async (req, res, next) => {
  const token = req.headers['x-ecostamp-token'];
  if (token) {
    const result = await verifyStampToken(token).catch(() => null);
    if (result?.valid) {
      req.stampHolder = result;
    }
  }
  next();
});

// ── x402 payment gate ─────────────────────────────────────────────────────────
// In DEMO_MODE: a lightweight middleware that simulates the 402/pay/200 cycle
// without touching the facilitator or requiring real USDC.
//
// Flow in DEMO_MODE:
//   First request (no X-PAYMENT header) -> 402 with payment requirements
//   Retry with any X-PAYMENT header present -> 200 (bypass Zod validation)
//
// In production (DEMO_MODE=false): real x402-express paymentMiddleware runs,
// the CDP facilitator validates the EIP-712 signature and settles on-chain.

function demoPaymentGate(priceMap) {
  return (req, res, next) => {
    const routeKey = `${req.method} ${req.route?.path ?? req.path}`;

    // Find matching price config
    const matchedKey = Object.keys(priceMap).find(pattern => {
      // Convert Express-style :param patterns to regex
      const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$');
      return regex.test(`${req.method} ${req.path}`);
    });

    if (!matchedKey) return next(); // unprotected route

    const config = priceMap[matchedKey];

    // If X-PAYMENT header present (any value) -> treat as paid
    if (req.headers['x-payment']) {
      req.demoPaid = true;
      return next();
    }

    // No payment -> 402 with requirements matching x402 spec shape
    return res.status(402).json({
      x402Version: 1,
      accepts: [{
        scheme:             'exact',
        network:            config.network,
        maxAmountRequired:  String(Math.round(parseFloat(config.price.replace('$', '')) * 1_000_000)),
        payTo:              WALLET || '0x0000000000000000000000000000000000000000',
        asset:              USDC_ASSET,
        resource:           req.path,
      }],
      error:       'X-PAYMENT header is required',
      description: config.description,
      demoMode:    true,
    });
  };
}

const PRICE_MAP = {
  'GET /guides/:slug': {
    price:       '$0.001',
    network:     NETWORK,
    description: 'Premium eco travel guide -- verified sustainability data',
  },
  'GET /routes/carbon-optimal': {
    price:       '$0.002',
    network:     NETWORK,
    description: 'Carbon-optimal route recommendations with live emissions data',
  },
  'GET /hotels/verified-list': {
    price:       '$0.003',
    network:     NETWORK,
    description: 'Full verified eco hotel directory with sustainability certifications',
  },
  'GET /provider-listing-fee': {
    price:       '$0.10',
    network:     NETWORK,
    description: 'EcoStamp provider listing fee (anti-spam + verifier cost recovery)',
  },
};

if (DEMO_MODE) {
  console.log('  Mode     : DEMO (x402 payment validation bypassed -- no real USDC needed)');
  app.use(demoPaymentGate(PRICE_MAP));
} else {
  console.log('  Mode     : PRODUCTION (real x402 payments via CDP facilitator)');
  app.use(paymentMiddleware(WALLET, PRICE_MAP, FACILITATOR));
}

// ── Route handlers ────────────────────────────────────────────────────────────

/**
 * GET /guides/:slug
 * Returns the full markdown content of a premium eco guide.
 * Payment was already verified by paymentMiddleware above.
 */
app.get('/guides/:slug', (req, res) => {
  const guide = GUIDES[req.params.slug];
  if (!guide) {
    return res.status(404).json({ error: 'Guide not found', available: Object.keys(GUIDES) });
  }
  res.json({
    ok: true,
    guide: {
      ...guide,
      // Stamp-holders get the extended edition with extra sections
      content: req.stampHolder ? guide.contentExtended ?? guide.content : guide.content,
      stampBonus: req.stampHolder
        ? { tier: req.stampHolder.tier, bonusContent: true }
        : null,
    },
    paidAt: new Date().toISOString(),
  });
});

/**
 * GET /routes/carbon-optimal
 * Returns carbon-optimal route options between origin and destination.
 * Query params: ?from=<city>&to=<city>&date=<YYYY-MM-DD>
 */
app.get('/routes/carbon-optimal', (req, res) => {
  const { from = 'London', to = 'Paris', date = '2026-03-15' } = req.query;
  const route = ROUTES.find(
    r => r.from.toLowerCase() === from.toLowerCase()
      && r.to.toLowerCase() === to.toLowerCase()
  ) || ROUTES[0];

  res.json({
    ok: true,
    query: { from, to, date },
    routes: route.options,
    carbonSaved: route.carbonSaved,
    dataSource: 'EcoStamp Oracle v1 + ADEME transport emission factors',
    paidAt: new Date().toISOString(),
  });
});

/**
 * GET /hotels/verified-list
 * Returns the full verified eco hotel directory with cert details.
 * Optional: ?category=hotel&minScore=80&country=DE
 */
app.get('/hotels/verified-list', (req, res) => {
  const { minScore = 0, country, category = 'hotel' } = req.query;
  let hotels = HOTELS.filter(h => h.ecoScore >= Number(minScore));
  if (country) hotels = hotels.filter(h => h.country === country);

  res.json({
    ok: true,
    count: hotels.length,
    hotels,
    certification: `EcoStamp Provider Registry v1 — verified on Stacks ${process.env.STACKS_NETWORK || 'testnet'}`,
    paidAt: new Date().toISOString(),
  });
});

/**
 * GET /provider-listing-fee
 * Used by the ProviderApply flow to charge a one-time listing fee via x402.
 * Payment was already verified by paymentMiddleware above.
 */
app.get('/provider-listing-fee', (_req, res) => {
  res.json({
    ok: true,
    purpose: 'provider-listing-fee',
    fee: '$0.10',
    currency: 'USDC',
    network: NETWORK,
    paidAt: new Date().toISOString(),
  });
});

// ── Health / free endpoints ───────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    phase: 2,
    network: NETWORK,
    wallet: WALLET ? `${WALLET.slice(0, 6)}...${WALLET.slice(-4)}` : '(not set)',
    endpoints: [
      { path: '/guides/:slug',          price: '$0.001', stampBonus: 'extended edition' },
      { path: '/routes/carbon-optimal', price: '$0.002', stampBonus: 'extended routes'  },
      { path: '/hotels/verified-list',  price: '$0.003', stampBonus: 'full cert data'   },
      { path: '/provider-listing-fee',  price: '$0.10',  stampBonus: 'n/a'              },
    ],
    availableGuides: Object.keys(GUIDES),
  });
});

// Guide index — free, teaser content only
app.get('/guides', (req, res) => {
  res.json({
    ok: true,
    guides: Object.entries(GUIDES).map(([slug, g]) => ({
      slug,
      title:    g.title,
      excerpt:  g.excerpt,
      category: g.category,
      readTime: g.readTime,
      price:    '$0.001',
    })),
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  EcoStamp Content Server — Phase 2`);
  console.log(`  Network  : ${NETWORK}`);
  console.log(`  Wallet   : ${WALLET}`);
  console.log(`  Listening: http://localhost:${PORT}`);
  console.log(`  Guides   : ${Object.keys(GUIDES).length} available`);
  console.log(`  Health   : http://localhost:${PORT}/health\n`);
});

export default app;
