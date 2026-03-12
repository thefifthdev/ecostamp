#!/usr/bin/env node
/**
 * approve-provider
 *
 * Approves a provider and registers their signing key hash in provider-registry.
 *
 * Env vars (from repo root `.env`):
 * - STACKS_PRIVATE_KEY              (required)
 * - STACKS_NETWORK                  (testnet|mainnet)
 * - STACKS_API_URL                  (optional; defaults to Hiro)
 * - NEXT_PUBLIC_PROVIDER_REGISTRY_ADDRESS  (required; e.g. ST.../SP....provider-registry)
 * - PROVIDER_ID                     (required; uint)
 * - SIGNING_KEY_HASH                (required; 0x-prefixed 32-byte hex)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const {
  makeContractCall,
  uintCV,
  bufferCV,
} = require('@stacks/transactions');

const { StacksMainnet, StacksTestnet } = require('@stacks/network');

const NETWORK_NAME = (process.env.STACKS_NETWORK || 'testnet').toLowerCase();
const API_URL = process.env.STACKS_API_URL
  || (NETWORK_NAME === 'mainnet' ? 'https://api.hiro.so' : 'https://api.testnet.hiro.so');

const PRIVATE_KEY = process.env.STACKS_PRIVATE_KEY;
const CONTRACT_ID = (process.env.NEXT_PUBLIC_PROVIDER_REGISTRY_ADDRESS || '').trim();

const PROVIDER_ID = Number(process.env.PROVIDER_ID);
const SIGNING_KEY_HASH = String(process.env.SIGNING_KEY_HASH || '').trim();

const bold = t => `\x1b[1m${t}\x1b[0m`;
const red  = t => `\x1b[31m${t}\x1b[0m`;
const green = t => `\x1b[32m${t}\x1b[0m`;
const dim  = t => `\x1b[2m${t}\x1b[0m`;

const NETWORK = NETWORK_NAME === 'mainnet' ? new StacksMainnet() : new StacksTestnet();

function must(cond, msg) {
  if (!cond) {
    console.error(red(`\n  ❌ ${msg}\n`));
    process.exit(1);
  }
}

async function broadcastRaw(tx) {
  const res = await fetch(`${API_URL}/v2/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: tx.serialize(),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(`Non-JSON response (HTTP ${res.status}): ${text.slice(0, 200)}`); }
  if (!res.ok || data.error) {
    throw new Error(`Broadcast rejected (${res.status}): ${data.error ?? data.reason ?? text.slice(0, 200)}`);
  }
  return typeof data === 'string' ? data.replace(/"/g, '') : (data.txid ?? data);
}

function parseHashToBuffer(h) {
  const clean = h.replace(/^0x/i, '');
  must(/^[0-9a-fA-F]{64}$/.test(clean), 'SIGNING_KEY_HASH must be 32 bytes hex (64 chars), optionally 0x-prefixed');
  return Buffer.from(clean, 'hex');
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log(bold('  EcoStamp — approve-provider'));
  console.log('='.repeat(60));
  console.log(`  Network : ${bold(NETWORK_NAME)}`);
  console.log(`  API     : ${dim(API_URL)}`);

  must(PRIVATE_KEY, 'STACKS_PRIVATE_KEY is required in .env');
  must(CONTRACT_ID && CONTRACT_ID.includes('.'), 'NEXT_PUBLIC_PROVIDER_REGISTRY_ADDRESS must be set (e.g. ST...provider-registry)');
  must(Number.isFinite(PROVIDER_ID) && PROVIDER_ID > 0, 'PROVIDER_ID must be a positive integer');
  must(SIGNING_KEY_HASH, 'SIGNING_KEY_HASH is required');

  const [contractAddress, contractName] = CONTRACT_ID.split('.');
  const hashBuf = parseHashToBuffer(SIGNING_KEY_HASH);

  const tx = await makeContractCall({
    contractAddress,
    contractName,
    functionName: 'approve-provider',
    functionArgs: [uintCV(PROVIDER_ID), bufferCV(hashBuf)],
    senderKey: PRIVATE_KEY,
    network: NETWORK,
    anchorMode: 3,         // AnchorMode.Any (v6 numeric)
    postConditionMode: 1,  // PostConditionMode.Allow (v6 numeric)
    fee: 10_000,
  });

  const txid = await broadcastRaw(tx);
  console.log(`\n  ${green('✅')} broadcast: ${dim(txid)}`);
  console.log(`  Explorer: ${dim(`https://explorer.hiro.so/txid/${txid}?chain=${NETWORK_NAME === 'mainnet' ? 'mainnet' : 'testnet'}`)}`);
}

main().catch(e => {
  console.error(red(`\n  ❌ ${e.message}\n`));
  process.exit(1);
});

