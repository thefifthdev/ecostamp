# EcoStamp — Verifiable Travel Impact Protocol

**Buidl Battle 2026 · Stacks Bitcoin L2 · Best x402 Integration**

Travelers earn SIP-013 SFT stamps from verified eco providers. Stamps accumulate into tiered reputation (Bronze → Silver → Gold) unlocking sBTC rewards. Content is gated behind x402 USDC micro-payments on Base.

## Docs

- Setup: `docs/SETUP.md`
- Testing: `docs/TESTING.md`

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Network Toggle Reference](#network-toggle-reference)
5. [Testnet Setup Guide](#testnet-setup-guide)
6. [Running Locally](#running-locally)
7. [Testnet Testing Guide](#testnet-testing-guide)
8. [Admin Panel](#admin-panel)
9. [Switching to Mainnet](#switching-to-mainnet)
10. [Contract Reference](#contract-reference)
11. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Browser (Next.js 14)                                   │
│  • Stacks wallet: Leather / Xverse  (ST.../SP...)       │
│  • EVM wallet:    MetaMask / Coinbase (0x...)  [prod]   │
└───────────┬──────────────────────────┬──────────────────┘
            │ Stacks txs               │ x402 USDC
            ▼                          ▼
┌───────────────────────┐   ┌──────────────────────────┐
│  Stacks Testnet /     │   │  Content Server :3001     │
│  Mainnet              │   │  eco guides     $0.001    │
│                       │   │  carbon routes  $0.002    │
│  provider-registry    │   │  hotel list     $0.003    │
│  stamp-registry       │   │  listing fee    $0.10     │
│  reward-pool          │   └──────────┬───────────────┘
└───────────────────────┘              │ validates via
                                       ▼
                            ┌──────────────────────────┐
                            │  Oracle Server :3002      │
                            │  secp256k1 booking proofs │
                            └──────────────────────────┘
```

Two independent network dimensions, both controlled entirely by `.env`:

| Dimension | Testnet | Mainnet |
|---|---|---|
| Stacks | `STACKS_NETWORK=testnet` | `STACKS_NETWORK=mainnet` |
| EVM / x402 | `X402_NETWORK=base-sepolia` | `X402_NETWORK=base` |
| Payments | `DEMO_MODE=true` (no wallet needed) | `DEMO_MODE=false` (real USDC) |

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 18.0 | Required by all packages |
| npm | ≥ 9 | Comes with Node 18 |
| Leather wallet | Latest | Chrome extension — [leather.io](https://leather.io) |
| MetaMask | Latest | Only needed when `DEMO_MODE=false` |

---

## Environment Setup

```bash
# 1. Clone and install all packages
git clone <repo> && cd ecostamp
npm run install:all

# 2. Create your .env from the template
cp .env.example .env

# 3. Generate an oracle signing key pair
npm run oracle:keygen
# Prints ORACLE_PRIVATE_KEY and signing-key-hash.
# Copy ORACLE_PRIVATE_KEY into .env.
# Save the signing-key-hash — you paste it when approving providers in the Admin Panel.
```

---

## Network Toggle Reference

These are the **only vars you change** to flip between testnet and mainnet. Everything downstream (USDC contract addresses, API URLs, chain IDs, Leather network resolution, viem chain selection) reads from these.

### Testnet `.env` block

```bash
STACKS_NETWORK=testnet
STACKS_API_URL=https://api.testnet.hiro.so
NEXT_PUBLIC_STACKS_NETWORK=testnet
NEXT_PUBLIC_STACKS_API=https://api.testnet.hiro.so

X402_NETWORK=base-sepolia
NEXT_PUBLIC_X402_NETWORK=base-sepolia

DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true

POOL_SEED_USTX=5000000
```

### Mainnet `.env` block

```bash
STACKS_NETWORK=mainnet
STACKS_API_URL=https://api.hiro.so
NEXT_PUBLIC_STACKS_NETWORK=mainnet
NEXT_PUBLIC_STACKS_API=https://api.hiro.so

X402_NETWORK=base
NEXT_PUBLIC_X402_NETWORK=base

DEMO_MODE=false
NEXT_PUBLIC_DEMO_MODE=false

POOL_SEED_USTX=0
```

### Full parameter table

| Variable | Testnet value | Mainnet value | Used by |
|---|---|---|---|
| `STACKS_PRIVATE_KEY` | ST... wallet key (64 hex) | SP... wallet key | deploy scripts |
| `DEPLOYER_ADDRESS` | `ST...` | `SP...` | display only |
| `STACKS_NETWORK` | `testnet` | `mainnet` | deploy scripts |
| `STACKS_API_URL` | `https://api.testnet.hiro.so` | `https://api.hiro.so` | deploy scripts |
| `HIRO_API_KEY` | optional | recommended | deploy + frontend |
| `NEXT_PUBLIC_STACKS_NETWORK` | `testnet` | `mainnet` | Leather address resolution, contract calls |
| `NEXT_PUBLIC_STACKS_API` | `https://api.testnet.hiro.so` | `https://api.hiro.so` | frontend read-only calls |
| `X402_NETWORK` | `base-sepolia` | `base` | content server payment gate |
| `NEXT_PUBLIC_X402_NETWORK` | `base-sepolia` | `base` | frontend viem chain selection |
| `DEMO_MODE` | `true` | `false` | content server |
| `NEXT_PUBLIC_DEMO_MODE` | `true` | `false` | frontend hooks + Nav EVM chip |
| `X402_WALLET_ADDRESS` | any MetaMask `0x` addr | funded Base mainnet addr | content server receives USDC |
| `NEXT_PUBLIC_X402_WALLET` | same | same | frontend payment prompt display |
| `NEXT_PUBLIC_ADMIN_ADDRESS` | `ST...` testnet addr | `SP...` mainnet addr | admin tab visibility + panel access |
| `NEXT_PUBLIC_PROVIDER_REGISTRY_ADDRESS` | written by `deploy-phase1.js` | written by `deploy-phase-5.js` | frontend contract calls |
| `NEXT_PUBLIC_STAMP_REGISTRY_ADDRESS` | written by `deploy-phase1.js` | written by `deploy-phase-5.js` | frontend contract calls |
| `NEXT_PUBLIC_REWARD_POOL_ADDRESS` | written by `deploy-phase-3.js` | written by `deploy-phase-5.js` | frontend contract calls |
| `POOL_SEED_USTX` | `5000000` (5 STX) | `0` | phase 3 deploy seed |
| `ORACLE_PRIVATE_KEY` | from `npm run oracle:keygen` | same key or new | oracle signing |
| `ORACLE_URL` | `http://localhost:3002` | hosted oracle URL | Next.js oracle proxy |
| `STAMP_JWT_SECRET` | any string | long random string | content server JWT |
| `SBTC_TOKEN_CONTRACT` | not used on testnet | `SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token` | reward pool mainnet claim |

---

## Testnet Setup Guide

Follow these steps in order before running locally.

### Step 1 — Stacks testnet wallet

1. Install [Leather](https://leather.io) in Chrome
2. Create a wallet. Write down your seed phrase.
3. In Leather → Settings → Network → switch to **Testnet**
4. Copy your `ST...` testnet address
5. Request testnet STX at [Hiro faucet](https://explorer.hiro.so/sandbox/faucet?chain=testnet)
6. Wait ~30 seconds — Leather balance should show STX
7. Export your private key: Leather → Secret Key → copy

In `.env`:
```bash
STACKS_PRIVATE_KEY=<64-char hex key>
DEPLOYER_ADDRESS=ST<your address>
NEXT_PUBLIC_ADMIN_ADDRESS=ST<your address>
```

**Verify:** `curl "https://api.testnet.hiro.so/v2/accounts/ST<your-address>?proof=0"` — `balance` should be non-zero.

### Step 2 — Oracle key

```bash
npm run oracle:keygen
```

Example output:
```
Private key (add to .env as ORACLE_PRIVATE_KEY):
  a1b2c3...64 hex chars

Signing key hash (sha256 of pubkey -- register in provider-registry.clar):
  0xdeadbeef...64 hex chars
```

In `.env`:
```bash
ORACLE_PRIVATE_KEY=a1b2c3...
```

**Save the signing key hash** — you paste it into the Admin Panel when approving providers.

**Verify:** Start the oracle with `npm run oracle:dev`, then:
```bash
curl http://localhost:3002/health
# → { ok: true, keyHash: "0x...", publicKey: "0x..." }
```

### Step 3 — Deploy contracts to testnet

```bash
# Phase 1: provider-registry + stamp-registry
node deploy/deploy-phase1.js
# Takes ~3 minutes. Outputs:
#   NEXT_PUBLIC_PROVIDER_REGISTRY_ADDRESS=ST...
#   NEXT_PUBLIC_STAMP_REGISTRY_ADDRESS=ST...
# Written to frontend/.env.contracts

# Phase 3: reward-pool + seed with 5 STX
node deploy/deploy-phase-3.js
# Takes ~2 minutes. Outputs:
#   NEXT_PUBLIC_REWARD_POOL_ADDRESS=ST...
```

Copy the three addresses from `frontend/.env.contracts` into your `.env`:
```bash
NEXT_PUBLIC_PROVIDER_REGISTRY_ADDRESS=ST<deployer>.provider-registry
NEXT_PUBLIC_STAMP_REGISTRY_ADDRESS=ST<deployer>.stamp-registry
NEXT_PUBLIC_REWARD_POOL_ADDRESS=ST<deployer>.reward-pool
```

Note: the frontend auto-loads `frontend/.env.contracts` and `frontend/.env.contracts.phase3` via `frontend/next.config.js`, but you must restart `npm run frontend:dev` (or `npm run dev`) after deploying so the new values get picked up. Copying the values into `.env` is optional.

**Verify:** Open [Hiro Explorer (testnet)](https://explorer.hiro.so/?chain=testnet) and search `ST<your-address>.stamp-registry` — the contract should be visible.

### Step 4 — (Optional) Hiro API key

Free at [platform.hiro.so](https://platform.hiro.so). Prevents rate limiting during rapid testing:
```bash
HIRO_API_KEY=hiro_...
```

### Step 5 — (Optional) Base Sepolia USDC for real x402 testing

Skip this for basic testing — keep `DEMO_MODE=true`.

If you want to test real x402 payment flows:
1. Switch MetaMask to Base Sepolia (chainId 84532)
2. Get test USDC at [faucet.circle.com](https://faucet.circle.com) → select Base Sepolia
3. In `.env`:
   ```bash
   X402_WALLET_ADDRESS=0x<your MetaMask addr>
   NEXT_PUBLIC_X402_WALLET=0x<same>
   DEMO_MODE=false
   NEXT_PUBLIC_DEMO_MODE=false
   ```

---

## Running Locally

**Three terminals:**

```bash
# Terminal 1
npm run oracle:dev        # → http://localhost:3002

# Terminal 2
npm run content-server:dev  # → http://localhost:3001

# Terminal 3
npm run frontend:dev      # → http://localhost:3000
```

Or all in one with:
```bash
npm run dev
```

---

## Testnet Testing Guide

### Test 1 — Wallet connect

1. Open `http://localhost:3000`
2. Click **Connect Wallet** → Leather popup
3. Approve the connection
4. Your `ST...` address appears in the nav bar

**Check admin tab:** The "Admin ⚙" tab is only visible if your connected address exactly matches `NEXT_PUBLIC_ADMIN_ADDRESS`. For any other wallet, it is completely invisible.

---

### Test 2 — Browse (no wallet needed)

- **Providers** tab renders provider cards
- **My Stamps** tab shows empty gallery (stamps load after minting)
- Both work without wallet connection

---

### Test 3 — Earn a stamp (oracle + Stacks tx)

1. Click **Earn Stamp**
2. Select a provider (e.g. The Green Lodge)
3. Enter a booking reference ≥ 4 chars: `TEST-2026-001`
4. Click **Validate & Mint Stamp**

**Expected step sequence:**

| Step | What happens |
|---|---|
| Validating… | Frontend POSTs to `/api/oracle-proxy` → oracle verifies booking ref |
| Oracle signing proof… | Oracle returns 65-byte secp256k1 signature |
| Minting stamp on-chain… | Leather popup opens: `earn-stamp` contract call |
| Confirm in Leather | Tx broadcasts to Stacks testnet |
| Stamp Minted ✓ | Shows stamp ID and eco points awarded |

Click **View on Explorer ↗** — Hiro Explorer shows the `earn-stamp` tx with `Success` status.

> With `DEMO_MODE=true` (server-side), the oracle call returns random bytes. `stamp-registry.clar` accepts them because `sig-verification-enabled` defaults to `false` on testnet — real secp256k1 checking is only activated after `enable-sig-verification` is called during Phase 5 mainnet deploy.

---

### Test 4 — Impact dashboard and tier system

1. Earn 1–2 stamps
2. Click **Impact**
3. Dashboard shows: eco points, tier (Bronze < 20 pts), pool balance, epoch countdown

To reach Silver and test claiming:
- Earn stamps from providers worth 3–5 pts each until total ≥ 20
- Or temporarily lower the threshold by redeploying with a modified contract

---

### Test 5 — Eco guides (x402)

1. Click **Guides**
2. Click any guide card
3. Payment modal appears: "Payment required: $0.0010"

**With `DEMO_MODE=true`:**
- Click **Pay now** → content loads instantly, no wallet interaction needed
- Content server logs show `200 OK`

**With `DEMO_MODE=false` (Base Sepolia):**
- MetaMask opens on Base Sepolia
- Sign the USDC `TransferWithAuthorization` EIP-712 message
- Content unlocks after the CDP facilitator verifies the signature

**Verify:** Check content server terminal — should log `GET /guides/<slug> 200`.

---

### Test 6 — Provider application (x402 listing fee)

1. Click **Apply**
2. Complete the 3-step form (name, category, eco score)
3. Review screen → click **Submit Application**
4. Listing fee prompt: `$0.10 USDC`
5. With `DEMO_MODE=true`: submits immediately
6. Content server terminal logs `POST /provider-listing-fee 200`

---

### Test 7 — Admin panel (full cycle)

**Requirement:** Connected wallet must match `NEXT_PUBLIC_ADMIN_ADDRESS` exactly.

**A. Approve a provider:**
1. Connect the admin wallet
2. Click **Admin ⚙** in the nav
3. **Pending** tab — submitted applications appear here
4. Click **Approve** on any provider
5. In the modal, paste your oracle signing key hash (from `npm run oracle:keygen`)
6. Click **Confirm Approval** → Leather popup: `approve-provider` tx
7. Confirm in Leather
8. Provider moves from Pending → Approved tab
9. Verify on Hiro Explorer: `provider-registry.approve-provider` tx = `Success`

**B. Revoke a provider:**
1. Go to **Approved** tab
2. Click **Revoke** → confirmation guard appears
3. Confirm → Leather popup: `revoke-provider` tx
4. Provider moves to **Revoked** tab

**C. Seed the reward pool:**
1. Go to **Pool Seed** tab
2. Select an amount (e.g. 2 STX)
3. Click **Seed Pool** → Leather popup: `admin-seed-pool` tx
4. After confirmation, go to **Impact** dashboard — pool balance increases

---

### Test 8 — Admin visibility with non-admin wallet

1. Disconnect wallet (✕ button next to address chip)
2. Connect a **different** Leather wallet (not `NEXT_PUBLIC_ADMIN_ADDRESS`)
3. **Admin ⚙** tab is NOT visible in nav
4. Navigate to `/?admin` manually — redirected to home
5. No admin UI is rendered under any circumstances

---

### Test 9 — Full stamp-to-reward cycle

1. Earn 7+ stamps (mix of providers for variety)
2. Check **Impact** → eco points ≥ 20 (Silver tier)
3. Pool balance > 0 (seed from Admin Panel if needed)
4. Click **Claim Reward** → Leather popup: `claim-reward` tx
5. Confirm → pool balance decreases, claim success shown
6. Try claiming again immediately → "Cooldown active, X blocks remaining"

---

## Admin Panel

The Admin Panel is gated by a single env var:

```bash
NEXT_PUBLIC_ADMIN_ADDRESS=ST<your-testnet-address>
```

| Scenario | Admin tab | Panel content |
|---|---|---|
| `NEXT_PUBLIC_ADMIN_ADDRESS` is blank | Never shown | Access denied for everyone |
| Connected wallet ≠ admin address | Not shown | Access denied screen |
| Connected wallet = admin address | Shown (amber tint) | Full panel |
| Admin disconnects while on panel | Tab disappears | Redirects to home |

The guard runs at three independent layers:
- **Nav.tsx** — filters admin from the visible nav items
- **page.tsx** — `safeSetSection` rejects admin route; `useEffect` ejects on disconnect
- **AdminPanel.tsx** — renders access-denied screen as final backstop

---

## Switching to Mainnet

### 1. Update the toggle vars in `.env`

```bash
STACKS_NETWORK=mainnet
STACKS_API_URL=https://api.hiro.so
NEXT_PUBLIC_STACKS_NETWORK=mainnet
NEXT_PUBLIC_STACKS_API=https://api.hiro.so
X402_NETWORK=base
NEXT_PUBLIC_X402_NETWORK=base
DEMO_MODE=false
NEXT_PUBLIC_DEMO_MODE=false
POOL_SEED_USTX=0
NEXT_PUBLIC_ADMIN_ADDRESS=SP<your-mainnet-address>
DEPLOYER_ADDRESS=SP<your-mainnet-address>
X402_WALLET_ADDRESS=0x<funded-base-mainnet-wallet>
NEXT_PUBLIC_X402_WALLET=0x<same>
```

### 2. Fund the deployer

~3–5 STX needed for contract deploy fees.

### 3. Deploy Phase 5 contracts

```bash
node deploy/deploy-phase-5.js
```

Deploys updated `stamp-registry` (secp256k1-recover) and `reward-pool` (real sBTC ft-transfer), then calls `set-provider-registry` and `enable-sig-verification` automatically.

### 4. Register oracle keys

For each approved provider, go to Admin Panel → approve with the correct signing key hash from `npm run oracle:keygen` (or `curl http://localhost:3002/public-key/<id>`).

### 5. Fund the reward pool

Admin Panel → Pool Seed → deposit real sBTC via `deposit-reward`.

### 6. Smoke test

- Earn stamp → mainnet tx on Hiro Explorer
- Buy guide → MetaMask signs, real USDC moves on Base
- Claim reward → real sBTC moves from pool

---

## Contract Reference

### `provider-registry.clar`

| Function | Args | Access |
|---|---|---|
| `apply-provider` | `name, category, eco-score, signing-key-hash` | Public |
| `approve-provider` | `provider-id, signing-key-hash` | CONTRACT_OWNER |
| `revoke-provider` | `provider-id` | CONTRACT_OWNER |
| `get-provider` | `provider-id` | Read-only |
| `get-signing-key-hash` | `provider-id` | Read-only |

### `stamp-registry.clar`

| Function | Args | Notes |
|---|---|---|
| `earn-stamp` | `provider-id, booking-hash, booking-proof, eco-points` | Oracle proof required on mainnet |
| `get-balance` | `owner, token-id` | SIP-013 |
| `get-tier` | `user` | 0=Bronze, 1=Silver, 2=Gold |
| `enable-sig-verification` | — | CONTRACT_OWNER; mainnet post-deploy |
| `set-provider-registry` | `new-registry` | CONTRACT_OWNER |

### `reward-pool.clar`

| Function | Testnet args | Mainnet args |
|---|---|---|
| `admin-seed-pool` | `amount` | removed |
| `claim-reward` | `tier` | `sbtc-contract, tier` |
| `deposit-reward` | `amount, note` | `sbtc-contract, amount, note` |
| `get-reward-summary` | `user, tier` | `user, tier` |

---

## Troubleshooting

**"Oracle unreachable" when minting stamps**
Make sure `npm run oracle:dev` is running and `ORACLE_URL=http://localhost:3002` is in `.env`. With `DEMO_MODE=true` (the server-side var, not `NEXT_PUBLIC_`), the oracle proxy returns random bytes without calling the oracle, so you can test without it running.

**"Content server unreachable" when loading guides**
Start `npm run content-server:dev`. Check `CONTENT_SERVER_URL=http://localhost:3001` in `.env`.

**Leather doesn't open when minting**
`NEXT_PUBLIC_STAMP_REGISTRY_ADDRESS` is blank. Deploy Phase 1 (`npm run deploy:phase1`) and restart the Next.js dev server so it can read `frontend/.env.contracts`, or copy the value into `.env` / `frontend/.env.local`.

**Admin tab not visible**
`NEXT_PUBLIC_ADMIN_ADDRESS` is not set, or does not exactly match the connected wallet address. The comparison is case-sensitive. After changing this var, restart the Next.js dev server (`npm run frontend:dev`).

**Wrong address in Leather after connect**
`NEXT_PUBLIC_STACKS_NETWORK` must match the network Leather is set to. If Leather is on Testnet, set `NEXT_PUBLIC_STACKS_NETWORK=testnet`. The wallet connect code resolves `stxAddress.testnet` or `stxAddress.mainnet` based on this var.

**"nonce too low" during deploy**
A previous transaction is still pending. Wait 1–2 minutes and retry.

**x402 payment rejected in production mode**
Confirm MetaMask is on the correct chain: Base Sepolia (84532) for `X402_NETWORK=base-sepolia`, Base mainnet (8453) for `X402_NETWORK=base`. Confirm test USDC balance is sufficient.

**Claim reward button disabled**
Pool is empty (seed from Admin → Pool Seed), or eco points < 20 (Silver tier required on mainnet; testnet contract has `MIN_CLAIM_TIER=1` too), or cooldown is active (1008 blocks ≈ 1 week — check Impact dashboard for blocks remaining).
