/**
 * EcoStamp Oracle -- Key Generator
 *
 * Generates a new secp256k1 key pair for the oracle signing service.
 * The signing-key-hash (sha256 of compressed pubkey) is what you register
 * in provider-registry.clar via the approve-provider admin call.
 *
 * Usage:
 *   node oracle/src/keygen.js
 *
 * Output:
 *   Private key -> add to .env as ORACLE_PRIVATE_KEY
 *   Key hash    -> pass to approve-provider as signing-key-hash
 */

import crypto from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const secp = require('secp256k1');

let privateKey;
do {
  privateKey = crypto.randomBytes(32);
} while (!secp.privateKeyVerify(privateKey));

const publicKeyComp = Buffer.from(secp.publicKeyCreate(privateKey, true));
const keyHash       = crypto.createHash('sha256').update(publicKeyComp).digest('hex');

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║         EcoStamp Oracle -- Key Generation                ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');
console.log('Private key (add to .env as ORACLE_PRIVATE_KEY -- keep secret!):');
console.log(`  ${privateKey.toString('hex')}\n`);
console.log('Public key (compressed 33 bytes):');
console.log(`  0x${publicKeyComp.toString('hex')}\n`);
console.log('Signing key hash (sha256 of pubkey -- register in provider-registry.clar):');
console.log(`  0x${keyHash}\n`);
console.log('Add to .env:');
console.log(`  ORACLE_PRIVATE_KEY=${privateKey.toString('hex')}\n`);
console.log('Pass to approve-provider:');
console.log(`  signingKeyHash: "0x${keyHash}"\n`);