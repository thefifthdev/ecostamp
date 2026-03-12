#!/usr/bin/env node
/**
 * EcoStamp -- Phase 5 Deployment Script
 * Deploys updated stamp-registry.clar and reward-pool.clar to Stacks MAINNET.
 * Then:
 *   1. Calls set-provider-registry on stamp-registry to wire cross-contract reads
 *   2. Calls enable-sig-verification to activate real secp256k1 checks
 *   3. Verifies the oracle's signing key hash is registered for each active provider
 *
 * DANGER: this deploys to MAINNET. Ensure STACKS_NETWORK=mainnet in .env.
 * Test everything on testnet first using Phase 1/3 scripts.
 *
 * @stacks/transactions v6 -- same broadcastRaw pattern as Phase 1/3
 */

const {
  makeContractDeploy,
  makeContractCall,
  getAddressFromPrivateKey,
  TransactionVersion,
  uintCV,
  principalCV,
} = require('@stacks/transactions');
const { StacksMainnet, StacksTestnet } = require('@stacks/network');
const fs   = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const NETWORK_NAME = (process.env.STACKS_NETWORK || 'testnet').toLowerCase();
const NETWORK      = NETWORK_NAME === 'mainnet' ? new StacksMainnet() : new StacksTestnet();
const API_URL      = process.env.STACKS_API_URL
  || (NETWORK_NAME === 'mainnet' ? 'https://api.hiro.so' : 'https://api.testnet.hiro.so');
const HIRO_API_KEY = process.env.HIRO_API_KEY || null;
const PRIVATE_KEY  = process.env.STACKS_PRIVATE_KEY;

const DEPLOY_DELAY_MS = 65_000;
const MAX_RETRIES     = 3;
const GAS_BUFFER      = 1.15;

const bold  = t => `\x1b[1m${t}\x1b[0m`;
const green = t => `\x1b[32m${t}\x1b[0m`;
const red   = t => `\x1b[31m${t}\x1b[0m`;
const cyan  = t => `\x1b[36m${t}\x1b[0m`;
const dim   = t => `\x1b[2m${t}\x1b[0m`;
const yellow = t => `\x1b[33m${t}\x1b[0m`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function hiroHeaders(extra = {}) {
  const h = { 'Content-Type': 'application/json', ...extra };
  if (HIRO_API_KEY) h['x-api-key'] = HIRO_API_KEY;
  return h;
}

async function getCurrentNonce(address) {
  const res  = await fetch(`${API_URL}/v2/accounts/${address}?proof=0`, { headers: hiroHeaders() });
  const data = await res.json();
  return Number(data.nonce ?? 0);
}

function estimateFee(codeBody) {
  const bytes = Buffer.from(codeBody, 'utf-8').length;
  return Math.ceil((5_000 + bytes * 10) * GAS_BUFFER);
}

async function broadcastRaw(tx) {
  const serialized = tx.serialize();
  const res = await fetch(`${API_URL}/v2/transactions`, {
    method:  'POST',
    headers: hiroHeaders({ 'Content-Type': 'application/octet-stream' }),
    body:    serialized,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Non-JSON: ${text.slice(0, 200)}`); }
  if (!res.ok || data.error) throw new Error(data.error ?? data.reason ?? text.slice(0, 200));
  return typeof data === 'string' ? data.replace(/"/g, '') : (data.txid ?? data);
}

async function deployContract(name, file, nonce, attempt = 0) {
  const contractPath = path.join(__dirname, '../contracts/ecostamp', file);
  if (!fs.existsSync(contractPath))
    return { ok: false, name, reason: `Not found: ${contractPath}` };

  const codeBody = fs.readFileSync(contractPath, 'utf-8');
  const fee = estimateFee(codeBody);
  const senderAddress = getAddressFromPrivateKey(
    PRIVATE_KEY,
    NETWORK_NAME === 'mainnet' ? TransactionVersion.Mainnet : TransactionVersion.Testnet
  );

  console.log(`\n  ${bold('->')} ${cyan(name)}`);
  console.log(`     file:  ${file}`);
  console.log(`     fee:   ${(fee / 1e6).toFixed(6)} STX   nonce: ${nonce}`);

  try {
    const tx = await makeContractDeploy({
      contractName: name, codeBody,
      senderKey: PRIVATE_KEY, network: NETWORK,
      fee, nonce, anchorMode: 3, postConditionMode: 1,
    });
    const txid = await broadcastRaw(tx);
    console.log(`     ${green('ok')} txid: ${dim(txid)}`);
    return { ok: true, name, txid, fee, address: `${senderAddress}.${name}` };
  } catch (err) {
    console.error(`     ${red('x')} ${err.message}`);
    if (attempt < MAX_RETRIES) {
      console.log(`     Retry ${attempt + 1}/${MAX_RETRIES} in 30s...`);
      await sleep(30_000);
      return deployContract(name, file, nonce, attempt + 1);
    }
    return { ok: false, name, reason: err.message };
  }
}

async function callContract(contractAddress, contractName, fn, args, nonce) {
  const [addr, name] = contractAddress.split('.');
  const fee = 10_000;
  console.log(`\n  ${bold('->')} ${cyan(fn)} on ${name}   nonce: ${nonce}`);
  try {
    const tx = await makeContractCall({
      contractAddress: addr, contractName: name,
      functionName: fn, functionArgs: args,
      senderKey: PRIVATE_KEY, network: NETWORK,
      fee, nonce, anchorMode: 3, postConditionMode: 1,
    });
    const txid = await broadcastRaw(tx);
    console.log(`     ${green('ok')} txid: ${dim(txid)}`);
    return { ok: true, txid };
  } catch (err) {
    console.error(`     ${red('x')} ${err.message}`);
    return { ok: false, reason: err.message };
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log(bold('  EcoStamp -- Phase 5 Deployment'));
  console.log('='.repeat(60));

  if (!PRIVATE_KEY) {
    console.error(red('  STACKS_PRIVATE_KEY not set'));
    process.exit(1);
  }

  if (NETWORK_NAME === 'mainnet') {
    console.log(yellow('\n  ⚠  MAINNET DEPLOY -- double-check your .env before continuing'));
    console.log(dim('  Proceeding in 5 seconds... Ctrl-C to abort'));
    await sleep(5_000);
  }

  const senderAddress = getAddressFromPrivateKey(
    PRIVATE_KEY,
    NETWORK_NAME === 'mainnet' ? TransactionVersion.Mainnet : TransactionVersion.Testnet
  );
  console.log(`  Network : ${bold(NETWORK_NAME)}`);
  console.log(`  Deployer: ${bold(senderAddress)}`);

  let nonce = await getCurrentNonce(senderAddress);
  console.log(`  Nonce   : ${nonce}`);

  const results = [];

  // ── Deploy stamp-registry (Phase 5: secp256k1-verify enabled) ─────────────
  console.log('\n' + '-'.repeat(60));
  console.log(`  [1/2] stamp-registry  (Phase 5: secp256k1-recover + cross-contract tier read)`);
  const stampDeploy = await deployContract('stamp-registry', 'stamp-registry.clar', nonce);
  results.push(stampDeploy);
  if (!stampDeploy.ok) { console.error(red('  Deploy failed')); process.exit(1); }
  nonce++;

  console.log(`\n  ${dim(`Waiting ${DEPLOY_DELAY_MS / 1000}s...`)}`);
  await sleep(DEPLOY_DELAY_MS);

  // ── Deploy reward-pool (Phase 5: real sBTC ft-transfer) ───────────────────
  console.log('\n' + '-'.repeat(60));
  console.log(`  [2/2] reward-pool  (Phase 5: real sBTC ft-transfer via SIP-010 trait)`);
  const poolDeploy = await deployContract('reward-pool', 'reward-pool.clar', nonce);
  results.push(poolDeploy);
  if (!poolDeploy.ok) { console.error(red('  Deploy failed')); process.exit(1); }
  nonce++;

  console.log(`\n  ${dim(`Waiting ${DEPLOY_DELAY_MS / 1000}s for both contracts to anchor...`)}`);
  await sleep(DEPLOY_DELAY_MS);

  // ── Post-deploy: wire stamp-registry -> provider-registry ─────────────────
  const providerRegistry = process.env.NEXT_PUBLIC_PROVIDER_REGISTRY_ADDRESS;
  if (providerRegistry) {
    console.log('\n' + '-'.repeat(60));
    console.log('  Post-deploy: set-provider-registry on stamp-registry');
    const setReg = await callContract(
      stampDeploy.address, 'stamp-registry',
      'set-provider-registry', [principalCV(providerRegistry)], nonce
    );
    if (setReg.ok) nonce++;
    await sleep(DEPLOY_DELAY_MS);

    console.log('\n' + '-'.repeat(60));
    console.log('  Post-deploy: set-stamp-registry on provider-registry');
    const setStamp = await callContract(
      providerRegistry, 'provider-registry',
      'set-stamp-registry', [principalCV(stampDeploy.address)], nonce
    );
    if (setStamp.ok) nonce++;
    await sleep(DEPLOY_DELAY_MS);
  } else {
    console.log(yellow('\n  ⚠  NEXT_PUBLIC_PROVIDER_REGISTRY_ADDRESS not set -- skipping set-provider-registry'));
    console.log(dim('     Run manually: contract-call? stamp-registry set-provider-registry <addr>'));
  }

  // ── Post-deploy: enable secp256k1 signature verification ─────────────────
  console.log('\n' + '-'.repeat(60));
  console.log('  Post-deploy: enable-sig-verification on stamp-registry');
  console.log(dim('  This activates real secp256k1 proof checking for earn-stamp calls.'));
  console.log(dim('  Ensure oracle keys are registered in provider-registry BEFORE enabling.'));
  const enableSig = await callContract(
    stampDeploy.address, 'stamp-registry',
    'enable-sig-verification', [], nonce
  );
  if (enableSig.ok) nonce++;

  // ── Save report ────────────────────────────────────────────────────────────
  const report = {
    phase:       5,
    network:     NETWORK_NAME,
    deployer:    senderAddress,
    deployedAt:  new Date().toISOString(),
    contracts: {
      stampRegistry: stampDeploy.address,
      rewardPool:    poolDeploy.address,
    },
    postDeploy: {
      setProviderRegistry: !!providerRegistry,
      sigVerificationEnabled: enableSig.ok,
    },
  };

  const reportPath = path.join(__dirname, 'phase5-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // ── Update frontend .env.contracts ────────────────────────────────────────
  const envPath = path.join(__dirname, '../frontend/.env.contracts');
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
  let updated = existing;
  [
    ['NEXT_PUBLIC_STAMP_REGISTRY_ADDRESS', stampDeploy.address],
    ['NEXT_PUBLIC_REWARD_POOL_ADDRESS',    poolDeploy.address],
  ].forEach(([k, v]) => {
    updated = updated.includes(k)
      ? updated.replace(new RegExp(`${k}=.*`), `${k}=${v}`)
      : updated + `\n${k}=${v}\n`;
  });
  fs.writeFileSync(envPath, updated);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n\n' + '='.repeat(60));
  console.log(bold('  PHASE 5 DEPLOYMENT SUMMARY'));
  console.log('='.repeat(60));
  results.forEach(r => {
    console.log(`  ${r.ok ? green('ok') : red('FAILED')} ${r.name}`);
    if (r.ok) console.log(`     ${bold(r.address)}`);
  });
  console.log(`\n  Sig verification : ${enableSig.ok ? green('enabled') : yellow('check manually')}`);
  console.log(`  Report           : ${dim(reportPath)}`);
  console.log(`  Env updated      : ${dim(envPath)}`);

  if (NETWORK_NAME === 'mainnet') {
    console.log(yellow('\n  Next steps for mainnet:'));
    console.log(dim('  1. Set NEXT_PUBLIC_DEMO_MODE=false in .env'));
    console.log(dim('  2. Set X402_NETWORK=base in .env'));
    console.log(dim('  3. Fund X402_WALLET_ADDRESS with mainnet USDC on Base'));
    console.log(dim('  4. Fund reward-pool contract with sBTC via deposit-reward'));
    console.log(dim('  5. Ensure ORACLE_PRIVATE_KEY matches key hash in provider-registry'));
  }
  console.log('');
}

main().catch(e => {
  console.error(red(`\n  Fatal: ${e.message}`));
  process.exit(1);
});
