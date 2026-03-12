/**
 * EcoStamp -- Oracle Server (Phase 5)
 *
 * Issues secp256k1 recoverable signatures over booking proofs.
 * The frontend calls POST /sign-booking and gets back a 65-byte
 * buffer (r+s+v) that is passed to earn-stamp on stamp-registry.clar.
 *
 * Message construction (must match stamp-registry.clar verify-booking-proof):
 *   msgHash = sha256(bookingHash(32 bytes) || providerId(4 bytes BE))
 *
 * The oracle private key must match the signing-key-hash registered
 * in provider-registry.clar for the provider (sha256(compressed-pubkey)).
 *
 * In production each provider has their own key loaded from env.
 * For demo, a single shared key is used for all providers.
 *
 * Endpoints:
 *   POST /sign-booking    -- verify booking ref + issue proof
 *   GET  /public-key/:id  -- return compressed pubkey for a provider
 *   GET  /health          -- server status
 */

import express    from 'express';
import cors       from 'cors';
import dotenv     from 'dotenv';
import secp from 'secp256k1';
import crypto     from 'crypto';

dotenv.config();

const app  = express();
const PORT = process.env.ORACLE_PORT || 3002;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());

// ── Key management ────────────────────────────────────────────────────────────
//
// ORACLE_PRIVATE_KEY: 64 hex chars (32 bytes) -- the secp256k1 private key.
// Generate with: node oracle/src/keygen.js
// The sha256 of the compressed public key (33 bytes) is what goes into
// approve-provider as signing-key-hash in provider-registry.clar.

const ORACLE_KEY_HEX = process.env.ORACLE_PRIVATE_KEY;

if (!ORACLE_KEY_HEX) {
  console.error('[Oracle] ORACLE_PRIVATE_KEY not set. Run: node oracle/src/keygen.js');
  process.exit(1);
}

const privateKey    = Buffer.from(ORACLE_KEY_HEX.replace('0x', ''), 'hex');
const publicKeyComp = Buffer.from(secp.publicKeyCreate(privateKey, true));  // compressed 33 bytes
const keyHash       = crypto.createHash('sha256').update(publicKeyComp).digest('hex');

console.log(`[Oracle] Public key (compressed): 0x${publicKeyComp.toString('hex')}`);
console.log(`[Oracle] Signing key hash (sha256): 0x${keyHash}`);
console.log(`[Oracle] Register this hash in provider-registry.clar via approve-provider`);

// ── Per-provider key map (Phase 5 multi-provider support) ────────────────────
// In production each provider has its own key.
// Keys are loaded from env as ORACLE_KEY_PROVIDER_<ID>=<hex>
// If not found, falls back to the shared ORACLE_PRIVATE_KEY.

function getProviderKey(providerId) {
  const envKey = process.env[`ORACLE_KEY_PROVIDER_${providerId}`];
  if (envKey) return Buffer.from(envKey.replace('0x', ''), 'hex');
  return privateKey;  // fallback to shared key
}

// ── Message hashing (mirrors stamp-registry.clar verify-booking-proof) ───────

function buildMsgHash(bookingHashHex, providerId) {
  const bookingHashBuf = Buffer.from(bookingHashHex.replace('0x', ''), 'hex');

  // Provider ID as 4-byte big-endian (matches to-consensus-buff? on uint in Clarity)
  const providerIdBuf = Buffer.alloc(16);  // Clarity uint is 16 bytes BE
  providerIdBuf.writeBigUInt64BE(BigInt(0), 0);
  providerIdBuf.writeBigUInt64BE(BigInt(providerId), 8);

  const msg = Buffer.concat([bookingHashBuf, providerIdBuf]);
  return crypto.createHash('sha256').update(msg).digest();
}

// ── Booking hash derivation ──────────────────────────────────────────────────
// bookingHash = sha256(bookingRef || providerIdStr || walletAddress)
// This is the value stored in proof-used and passed to earn-stamp.

function deriveBookingHash(bookingRef, providerId, walletAddress) {
  const input = `${bookingRef}:${providerId}:${walletAddress}`;
  return crypto.createHash('sha256').update(input).digest();
}

// ── Provider verification (stub -- replace with real booking API) ────────────
// In production: call the provider's booking API to verify the reference.
// For Phase 5 demo: accept any booking ref that looks plausible.

async function verifyBookingWithProvider(bookingRef, providerId) {
  // Real implementation would:
  // 1. Look up provider's API endpoint from provider-registry
  // 2. Call provider's API: GET /verify?ref=<bookingRef>
  // 3. Return { valid: bool, ecoPoints: number, category: string }
  //
  // Demo: accept anything >= 4 chars
  if (bookingRef.length < 4) {
    return { valid: false, reason: 'Booking reference too short' };
  }
  // Simulate different providers awarding different points
  const PROVIDER_POINTS = { 1: 3, 2: 2, 3: 5, 4: 2, 5: 3, 6: 1 };
  return {
    valid:     true,
    ecoPoints: PROVIDER_POINTS[providerId] ?? 2,
    category:  'verified',
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /sign-booking
 * Body: { bookingRef, providerId, walletAddress }
 *
 * Returns:
 *   { bookingHash, bookingProof, ecoPoints, providerId, expiresAt }
 *
 * bookingHash: 0x-prefixed 32-byte hex -- pass to earn-stamp
 * bookingProof: 0x-prefixed 65-byte hex (r+s+v) -- pass to earn-stamp
 */
app.post('/sign-booking', async (req, res) => {
  const { bookingRef, providerId, walletAddress } = req.body;

  if (!bookingRef || !providerId || !walletAddress) {
    return res.status(400).json({ error: 'bookingRef, providerId, walletAddress required' });
  }
  if (!walletAddress.startsWith('ST') && !walletAddress.startsWith('SP')) {
    return res.status(400).json({ error: 'Invalid Stacks wallet address' });
  }

  try {
    // Verify booking with provider
    const verification = await verifyBookingWithProvider(bookingRef, Number(providerId));
    if (!verification.valid) {
      return res.status(422).json({ error: 'Booking verification failed', reason: verification.reason });
    }

    // Derive booking hash
    const bookingHashBuf = deriveBookingHash(bookingRef, providerId, walletAddress);
    const bookingHashHex = '0x' + bookingHashBuf.toString('hex');

    // Build message hash (mirrors Clarity contract)
    const msgHash = buildMsgHash(bookingHashHex, Number(providerId));

    // Sign with provider key
    const providerKey = getProviderKey(Number(providerId));
    const { signature, recovery } = secp.ecdsaSign(msgHash, providerKey);

    // Recoverable signature: 64 bytes (r+s) + 1 byte recovery flag = 65 bytes total
    const recoverable = Buffer.concat([Buffer.from(signature), Buffer.from([recovery])]);
    const bookingProof = '0x' + recoverable.toString('hex');

    // Expiry: proof is valid for 1 hour (replay protection is on-chain anyway)
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();

    console.log(`[Oracle] Signed booking proof for provider ${providerId} wallet ${walletAddress.slice(0, 10)}...`);

    return res.json({
      ok:           true,
      bookingHash:  bookingHashHex,
      bookingProof,
      ecoPoints:    verification.ecoPoints,
      providerId:   Number(providerId),
      expiresAt,
    });

  } catch (err) {
    console.error('[Oracle] Sign error:', err);
    return res.status(500).json({ error: 'Signing failed', detail: err.message });
  }
});

/**
 * GET /public-key/:providerId
 * Returns the compressed public key and key hash for a provider.
 * Used by the admin panel to register the correct signing-key-hash.
 */
app.get('/public-key/:providerId', (req, res) => {
  const { providerId } = req.params;
  const provKey    = getProviderKey(Number(providerId));
  const provPubKey = Buffer.from(secp.publicKeyCreate(provKey, true));
  const provHash   = crypto.createHash('sha256').update(provPubKey).digest('hex');

  res.json({
    providerId:     Number(providerId),
    publicKey:      '0x' + provPubKey.toString('hex'),
    signingKeyHash: '0x' + provHash,
    note:           'Register signingKeyHash in provider-registry.clar via approve-provider',
  });
});

/**
 * GET /health
 */
app.get('/health', (_req, res) => {
  res.json({
    ok:          true,
    service:     'ecostamp-oracle',
    keyHash:     '0x' + keyHash,
    publicKey:   '0x' + publicKeyComp.toString('hex'),
    endpoints:   ['POST /sign-booking', 'GET /public-key/:id', 'GET /health'],
  });
});

app.listen(PORT, () => {
  console.log(`\n[Oracle] EcoStamp Oracle Server`);
  console.log(`[Oracle] Listening on http://localhost:${PORT}`);
  console.log(`[Oracle] Key hash: 0x${keyHash}`);
});