#!/usr/bin/env node
/**
 * EcoStamp -- Phase 3 Deployment Script
 * Deploys reward-pool.clar and seeds the pool for testnet demo.
 * Requires Phase 1 contracts already deployed.
 */

const {
  makeContractDeploy,
  makeContractCall,
  uintCV,
  getAddressFromPrivateKey,
  TransactionVersion,
} = require('@stacks/transactions');
const { StacksTestnet, StacksMainnet } = require('@stacks/network');
const fs   = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const NETWORK_NAME     = (process.env.STACKS_NETWORK || 'testnet').toLowerCase();
const NETWORK          = NETWORK_NAME === 'mainnet' ? new StacksMainnet() : new StacksTestnet();
const API_URL          = process.env.STACKS_API_URL
  || (NETWORK_NAME === 'mainnet' ? 'https://api.hiro.so' : 'https://api.testnet.hiro.so');
const HIRO_API_KEY     = process.env.HIRO_API_KEY || null;
const PRIVATE_KEY      = process.env.STACKS_PRIVATE_KEY;
const POOL_SEED_AMOUNT = Number(process.env.POOL_SEED_AMOUNT ?? 42_000_000);
const DEPLOY_DELAY_MS  = 65_000;
const GAS_BUFFER       = 1.15;
const MAX_RETRIES      = 3;

const bold  = t => `\x1b[1m${t}\x1b[0m`;
const green = t => `\x1b[32m${t}\x1b[0m`;
const red   = t => `\x1b[31m${t}\x1b[0m`;
const dim   = t => `\x1b[2m${t}\x1b[0m`;
const cyan  = t => `\x1b[36m${t}\x1b[0m`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function hiroHeaders(extra = {}) {
  const h = { 'Content-Type': 'application/json', ...extra };
  if (HIRO_API_KEY) h['x-api-key'] = HIRO_API_KEY;
  return h;
}

async function getCurrentNonce(address) {
  try {
    const res  = await fetch(`${API_URL}/v2/accounts/${address}?proof=0`, { headers: hiroHeaders() });
    const data = await res.json();
    return Number(data.nonce ?? 0);
  } catch { return 0; }
}

function estimateFee(codeBody) {
  return Math.ceil((5_000 + Buffer.from(codeBody, 'utf-8').length * 10) * GAS_BUFFER);
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
  try { data = JSON.parse(text); }
  catch { throw new Error(`Non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`); }
  if (!res.ok || data.error)
    throw new Error(`Broadcast rejected (${res.status}): ${data.error ?? data.reason}`);
  return typeof data === 'string' ? data.replace(/"/g, '') : (data.txid ?? data);
}

async function deployContract(name, file, nonce, attempt = 0) {
  const codeBody = fs.readFileSync(
    path.join(__dirname, '../contracts/ecostamp', file), 'utf-8'
  );
  const fee = estimateFee(codeBody);
  console.log(`\n  ${cyan('--')} ${bold(name)}`);
  console.log(`     fee  : ${dim((fee / 1_000_000).toFixed(6) + ' STX')}`);
  console.log(`     nonce: ${dim(String(nonce))}`);
  try {
    const tx = await makeContractDeploy({
      contractName: name, codeBody,
      senderKey: PRIVATE_KEY, network: NETWORK,
      fee, nonce, anchorMode: 3, postConditionMode: 1,
    });
    const txid = await broadcastRaw(tx);
    console.log(`     ${green('v')} txid: ${dim(txid)}`);
    return { ok: true, name, txid, fee };
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      console.log(`     ${red('x')} ${err.message} -- retry ${attempt + 1} in 30s`);
      await sleep(30_000);
      return deployContract(name, file, nonce, attempt + 1);
    }
    return { ok: false, name, reason: err.message };
  }
}

async function callContract(contractName, fnName, args, nonce, deployerAddress, attempt = 0) {
  console.log(`\n  ${cyan('--')} ${bold(contractName + '.' + fnName)}`);
  try {
    const fee = Math.ceil(5_000 * GAS_BUFFER);
    const tx = await makeContractCall({
      contractAddress: deployerAddress, contractName,
      functionName: fnName, functionArgs: args,
      senderKey: PRIVATE_KEY, network: NETWORK,
      fee, nonce, anchorMode: 3, postConditionMode: 1,
    });
    const txid = await broadcastRaw(tx);
    console.log(`     ${green('v')} txid: ${dim(txid)}`);
    return { ok: true, fnName, txid };
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      console.log(`     ${red('x')} ${err.message} -- retry ${attempt + 1} in 30s`);
      await sleep(30_000);
      return callContract(contractName, fnName, args, nonce, deployerAddress, attempt + 1);
    }
    return { ok: false, fnName, reason: err.message };
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log(bold('  EcoStamp -- Phase 3 Deployment'));
  console.log('  reward-pool.clar + pool seed');
  console.log('='.repeat(60));

  if (!PRIVATE_KEY) { console.error(red('  STACKS_PRIVATE_KEY not set')); process.exit(1); }

  const deployerAddress = getAddressFromPrivateKey(
    PRIVATE_KEY,
    NETWORK_NAME === 'mainnet' ? TransactionVersion.Mainnet : TransactionVersion.Testnet
  );
  console.log(`  Network  : ${bold(NETWORK_NAME)}`);
  console.log(`  Deployer : ${bold(deployerAddress)}`);
  console.log(`  Pool seed: ${bold((POOL_SEED_AMOUNT / 100_000_000).toFixed(8))} sBTC (simulated)`);

  try {
    const probe = await fetch(`${API_URL}/v2/info`, { headers: hiroHeaders() });
    if (!probe.ok) throw new Error(`HTTP ${probe.status}`);
    const info = await probe.json();
    console.log(`  Node     : ${dim(info.server_version ?? 'unknown')}`);
  } catch (e) {
    console.error(red(`\n  Cannot reach API: ${e.message}`)); process.exit(1);
  }

  let nonce = await getCurrentNonce(deployerAddress);
  console.log(`  Nonce    : ${nonce}`);

  // Step 1: Deploy
  console.log('\n' + '-'.repeat(60));
  console.log('  [1/2] Deploy reward-pool.clar');
  const deploy = await deployContract('reward-pool', 'reward-pool.clar', nonce);
  if (!deploy.ok) { console.error(red(`\n  Deploy failed: ${deploy.reason}`)); process.exit(1); }
  nonce++;

  console.log(`\n  Waiting ${DEPLOY_DELAY_MS / 1000}s for block...`);
  await sleep(DEPLOY_DELAY_MS);

  // Step 2: Seed pool
  console.log('\n' + '-'.repeat(60));
  console.log('  [2/2] Seed reward pool');
  const seed = await callContract('reward-pool', 'admin-seed-pool', [uintCV(POOL_SEED_AMOUNT)], nonce, deployerAddress);
  if (seed.ok) nonce++;

  // Report
  console.log('\n' + '='.repeat(60));
  console.log(bold('  SUMMARY'));
  console.log('='.repeat(60));
  const rewardPoolAddr = `${deployerAddress}.reward-pool`;
  console.log(`  reward-pool : ${green('deployed')} -- ${bold(rewardPoolAddr)}`);
  console.log(`  pool seed   : ${seed.ok ? green('seeded') : red('FAILED')}`);

  const report = {
    deployedAt: new Date().toISOString(),
    network: NETWORK_NAME,
    deployer: deployerAddress,
    'reward-pool': { address: rewardPoolAddr, txid: deploy.txid },
    poolSeed: { amount: POOL_SEED_AMOUNT, txid: seed.txid ?? null, ok: seed.ok },
  };
  fs.writeFileSync(path.join(__dirname, 'phase3-report.json'), JSON.stringify(report, null, 2));

  const envLine = `NEXT_PUBLIC_REWARD_POOL_ADDRESS=${rewardPoolAddr}`;
  fs.writeFileSync(path.join(__dirname, '../frontend/.env.contracts.phase3'), envLine);
  console.log(`\n  Add to frontend .env.local:\n    ${envLine}\n`);
}

main().catch(err => { console.error(red(`\nFatal: ${err.message}`)); process.exit(1); });