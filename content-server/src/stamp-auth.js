/**
 * EcoStamp Phase 2 — Stamp holder auth
 *
 * Verifies an X-EcoStamp-Token, which is a signed JWT containing:
 *   { wallet, tier, stampCount, issuedAt }
 * signed by the EcoStamp oracle with STAMP_JWT_SECRET.
 *
 * The frontend obtains this token by calling GET /api/x402/stamp-token
 * (a Next.js API route) which reads stamp-registry state and signs the JWT.
 *
 * In production this would also do an on-chain read of stamp-registry
 * to verify the stamp count hasn't been spoofed.
 */

import jwt from 'jsonwebtoken';

const STAMP_JWT_SECRET = process.env.STAMP_JWT_SECRET || 'ecostamp-dev-secret-change-in-prod';

/**
 * Verify a stamp token.
 * @param {string} token  — JWT from X-EcoStamp-Token header
 * @returns {{ valid: boolean, wallet: string, tier: string, stampCount: number }}
 */
export async function verifyStampToken(token) {
  try {
    const payload = jwt.verify(token, STAMP_JWT_SECRET, { maxAge: '24h' });
    return {
      valid:      true,
      wallet:     payload.wallet,
      tier:       payload.tier,       // 'bronze' | 'silver' | 'gold'
      stampCount: payload.stampCount,
    };
  } catch (err) {
    return { valid: false, reason: err.message };
  }
}

/**
 * Issue a stamp token for a wallet (called by Next.js API route after
 * reading stamp-registry state from chain).
 *
 * @param {string} wallet      — Stacks principal
 * @param {string} tier        — 'bronze' | 'silver' | 'gold'
 * @param {number} stampCount  — total stamps minted
 * @returns {string}           — signed JWT
 */
export function issueStampToken(wallet, tier, stampCount) {
  return jwt.sign(
    { wallet, tier, stampCount, iss: 'ecostamp-oracle' },
    STAMP_JWT_SECRET,
    { expiresIn: '24h' }
  );
}