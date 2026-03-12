#!/usr/bin/env node
/**
 * EcoStamp — Phase 1 Deployment Script
 * @stacks/transactions v6 compatible — manual broadcast via fetch
 */

const {
  makeContractDeploy,
  makeContractCall,
  getAddressFromPrivateKey,
  TransactionVersion,
  principalCV,
} = require('@stacks/transactions');
const { StacksMainnet, StacksTestnet } = require('@stacks/network');
const fs   = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const NETWORK_NAME    = (process.env.STACKS_NETWORK || 'testnet').toLowerCase();
const NETWORK         = NETWORK_NAME === 'mainnet' ? new StacksMainnet() : new StacksTestnet();
const API_URL         = NETWORK_NAME === 'mainnet'
  ? 'https://api.hiro.so'
  : 'https://api.testnet.hiro.so';
const PRIVATE_KEY     = process.env.STACKS_PRIVATE_KEY;
const DEPLOY_DELAY_MS = 65_000;
const MAX_RETRIES     = 3;
const GAS_BUFFER      = 1.15;

const PHASE1_CONTRACTS = [
  { name: 'provider-registry', file: 'provider-registry.clar', description: 'Eco provider verification & signing key registry' },
  { name: 'stamp-registry',    file: 'stamp-registry.clar',    description: 'SIP-013 SFT stamp minting with booking proof validation' },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const bold  = t => `\x1b[1m${t}\x1b[0m`;
const green = t => `\x1b[32m${t}\x1b[0m`;
const red   = t => `\x1b[31m${t}\x1b[0m`;
const cyan  = t => `\x1b[36m${t}\x1b[0m`;
const dim   = t => `\x1b[2m${t}\x1b[0m`;

async function getCurrentNonce(address) {
  try {
    const res  = await fetch(`${API_URL}/v2/accounts/${address}?proof=0`);
    const data = await res.json();
    return Number(data.nonce ?? 0);
  } catch (e) {
    console.warn(`  ⚠  Could not fetch nonce (${e.message}) — defaulting to 0`);
    return 0;
  }
}

function estimateFee(codeBody) {
  const bytes = Buffer.from(codeBody, 'utf-8').length;
  return Math.ceil((5_000 + bytes * 10) * GAS_BUFFER);
}

async function callContract(contractId, functionName, functionArgs, nonce) {
  const [contractAddress, contractName] = contractId.split('.');
  const fee = Math.ceil(5_000 * GAS_BUFFER);
  console.log(`\n  ${bold('→')} call ${cyan(contractName + '.' + functionName)}   nonce: ${nonce}`);
  const tx = await makeContractCall({
    contractAddress,
    contractName,
    functionName,
    functionArgs,
    senderKey: PRIVATE_KEY,
    network: NETWORK,
    anchorMode: 3,
    postConditionMode: 1,
    fee,
    nonce,
  });
  const txId = await broadcastRaw(tx);
  console.log(`     ${green('✓')} broadcast: ${dim(txId)}`);
  console.log(`     ${dim('⏳ Waiting for confirmation...')}`);
  const result = await pollTx(txId);
  if (!result.ok) throw new Error(`TX failed on-chain: ${result.reason}`);
  return txId;
}

/**
 * Broadcast a signed transaction by serializing it and POSTing raw bytes.
 * This bypasses the SDK's broadcastTransaction() which has a hardcoded URL
 * and broken error handling in v6.
 */
async function broadcastRaw(tx) {
  // tx.serialize() is the v6 method — returns Uint8Array directly
  // tx.serialize() is the v6 method — returns Uint8Array directly
  const serialized = tx.serialize();
  const res = await fetch(`${API_URL}/v2/transactions`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body:    serialized,
  });

  const text = await res.text();

  // The API returns JSON on both success and error
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response from API (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok || data.error) {
    throw new Error(`Broadcast rejected (${res.status}): ${data.error ?? data.reason ?? text.slice(0, 200)}`);
  }

  // On success the API returns the txid as a quoted string: "0xabc..."
  // or as { txid: "0xabc..." } depending on version
  const txid = typeof data === 'string' ? data.replace(/"/g, '') : (data.txid ?? data);
  return txid;
}

async function pollTx(txId, timeoutMs = 600_000) {
  const start    = Date.now();
  const interval = 10_000;
  const url      = `${API_URL}/extended/v1/tx/${txId}`;
  while (Date.now() - start < timeoutMs) {
    try {
      const res  = await fetch(url);
      const data = await res.json();
      if (data.tx_status === 'success') return { ok: true, data };
      if (['abort_by_response', 'abort_by_post_condition'].includes(data.tx_status))
        return { ok: false, reason: data.tx_status, data };
    } catch { /* keep polling */ }
    await sleep(interval);
  }
  return { ok: false, reason: 'timeout' };
}

async function deployOne(contractName, contractFile, nonce, attempt = 0) {
  const contractPath = path.join(__dirname, '../contracts/ecostamp', contractFile);
  if (!fs.existsSync(contractPath))
    return { ok: false, contractName, reason: `File not found: ${contractPath}` };

  const codeBody = fs.readFileSync(contractPath, 'utf-8');
  const fee      = estimateFee(codeBody);

  console.log(`\n  ${bold('→')} ${cyan(contractName)}`);
  console.log(`     ${dim('file:')}  ${contractFile}`);
  console.log(`     ${dim('fee:')}   ${(fee / 1_000_000).toFixed(6)} STX`);
  console.log(`     ${dim('nonce:')} ${nonce}`);

  try {
    const tx = await makeContractDeploy({
      contractName,
      codeBody,
      senderKey:         PRIVATE_KEY,
      network:           NETWORK,
      anchorMode:        3,   // AnchorMode.Any (removed from v6 exports)
      postConditionMode: 1,   // PostConditionMode.Allow
      fee,
      nonce,
    });

    const txId = await broadcastRaw(tx);
    console.log(`     ${green('✓')} broadcast: ${dim(txId)}`);
    console.log(`     ${dim('⏳ Waiting for confirmation...')}`);

    const result = await pollTx(txId);
    if (!result.ok) throw new Error(`TX failed on-chain: ${result.reason}`);

    const senderAddress = getAddressFromPrivateKey(
      PRIVATE_KEY,
      NETWORK_NAME === 'mainnet' ? TransactionVersion.Mainnet : TransactionVersion.Testnet
    );
    console.log(`     ${green('✅')} Confirmed! Contract: ${bold(`${senderAddress}.${contractName}`)}`);

    return { ok: true, contractName, txId, fee, address: `${senderAddress}.${contractName}` };

  } catch (err) {
    console.error(`     ${red('✗')} ${err.message}`);
    if (attempt < MAX_RETRIES) {
      console.log(`     ${dim(`↺ Retry ${attempt + 1}/${MAX_RETRIES} in 30s...`)}`);
      await sleep(30_000);
      return deployOne(contractName, contractFile, nonce, attempt + 1);
    }
    return { ok: false, contractName, reason: err.message };
  }
}

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log(bold('  🌿 EcoStamp — Phase 1 Deployment'));
  console.log('═'.repeat(60));
  console.log(`  Network : ${bold(NETWORK_NAME)}`);
  console.log(`  API     : ${dim(API_URL)}`);

  if (!PRIVATE_KEY) {
    console.error(red('\n  ❌  STACKS_PRIVATE_KEY is not set in .env'));
    process.exit(1);
  }

  const senderAddress = getAddressFromPrivateKey(
    PRIVATE_KEY,
    NETWORK_NAME === 'mainnet' ? TransactionVersion.Mainnet : TransactionVersion.Testnet
  );
  console.log(`  Deployer: ${bold(senderAddress)}\n`);

  try {
    const probe = await fetch(`${API_URL}/v2/info`);
    if (!probe.ok) throw new Error(`HTTP ${probe.status}`);
    const info = await probe.json();
    console.log(`  Node version : ${dim(info.server_version ?? 'unknown')}`);
  } catch (e) {
    console.error(red(`\n  ❌  Cannot reach API: ${e.message}`));
    process.exit(1);
  }

  let nonce = await getCurrentNonce(senderAddress);
  console.log(`  Starting nonce: ${nonce}`);

  const results   = { deployed: [], failed: [], totalFees: 0 };
  const startTime = Date.now();

  for (let i = 0; i < PHASE1_CONTRACTS.length; i++) {
    const { name, file, description } = PHASE1_CONTRACTS[i];
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  [${i + 1}/${PHASE1_CONTRACTS.length}] ${bold(name)}`);
    console.log(`  ${dim(description)}`);

    const result = await deployOne(name, file, nonce);

    if (result.ok) {
      results.deployed.push(result);
      results.totalFees += result.fee;
      nonce++;
      if (i < PHASE1_CONTRACTS.length - 1) {
        console.log(`\n  ${dim(`⏸  Waiting ${DEPLOY_DELAY_MS / 1000}s before next deploy...`)}`);
        await sleep(DEPLOY_DELAY_MS);
      }
    } else {
      results.failed.push(result);
      console.error(red(`\n  ❌  ${name} failed — aborting.`));
      console.error(dim(`     Reason: ${result.reason}`));
      break;
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n\n' + '═'.repeat(60));
  console.log(bold('  📊 DEPLOYMENT SUMMARY'));
  console.log('═'.repeat(60));
  console.log(`  ${green('✅')} Deployed : ${results.deployed.length} / ${PHASE1_CONTRACTS.length}`);
  console.log(`  ${red('❌')} Failed   : ${results.failed.length}`);
  console.log(`  💰 Total fees: ${(results.totalFees / 1_000_000).toFixed(6)} STX`);
  console.log(`  ⏱  Duration : ${durationSec}s`);

  if (results.deployed.length > 0) {
    console.log('\n  Deployed contracts:');
    results.deployed.forEach(d => {
      console.log(`    • ${bold(d.contractName)}`);
      console.log(`      ${dim('address:')} ${d.address}`);
      console.log(`      ${dim('tx:')}      ${d.txId}`);
    });
  }

  const report = {
    timestamp: new Date().toISOString(), network: NETWORK_NAME,
    deployer: senderAddress, phase: 1,
    contracts: results.deployed, failed: results.failed,
    totalFees: results.totalFees, totalFeesSTX: results.totalFees / 1_000_000,
    durationSec: Number(durationSec),
  };
  const reportPath = path.join(__dirname, 'phase1-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n  📄 Report saved: ${dim(reportPath)}`);

  if (results.deployed.length === PHASE1_CONTRACTS.length) {
    const envLines = results.deployed.map(d =>
      `NEXT_PUBLIC_${d.contractName.toUpperCase().replace(/-/g, '_')}_ADDRESS=${d.address}`
    );
    const envPath = path.join(__dirname, '../frontend/.env.contracts');
    fs.writeFileSync(envPath, envLines.join('\n') + '\n');
    console.log(`  🔗 Contract addresses → ${dim(envPath)}`);

    // Wire cross-contract pointers for Phase 5 checks:
    // - stamp-registry.set-provider-registry(provider-registry)
    // - provider-registry.set-stamp-registry(stamp-registry)
    try {
      const provider = results.deployed.find(d => d.contractName === 'provider-registry')?.address;
      const stamp    = results.deployed.find(d => d.contractName === 'stamp-registry')?.address;
      if (provider && stamp) {
        console.log(`\n  ${dim(`⏸  Waiting ${DEPLOY_DELAY_MS / 1000}s before wiring contracts...`)}`);
        await sleep(DEPLOY_DELAY_MS);

        await callContract(stamp, 'set-provider-registry', [principalCV(provider)], nonce++);
        await sleep(DEPLOY_DELAY_MS);
        await callContract(provider, 'set-stamp-registry', [principalCV(stamp)], nonce++);

        console.log(`\n  ${green('✅')} Wired provider-registry <-> stamp-registry`);
      }
    } catch (e) {
      console.warn(`\n  ⚠  Wiring skipped/failed: ${e.message}`);
      console.warn(dim('     You can wire manually:'));
      console.warn(dim('       stamp-registry set-provider-registry <provider-registry-principal>'));
      console.warn(dim('       provider-registry set-stamp-registry <stamp-registry-principal>'));
    }
  }

  console.log('═'.repeat(60) + '\n');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(red('\n  ❌  Unexpected error:'), err);
    process.exit(1);
  });
