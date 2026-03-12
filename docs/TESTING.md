# EcoStamp Testing Guide

This project currently relies on a mix of:

- automated build checks (`next build`)
- manual end-to-end testing (wallet flows + x402)

## Build Verification

From repo root:

```bash
npm run frontend:build
```

Expected: build succeeds. A Google Fonts optimization warning can appear if network access is restricted.

## Local Smoke Test

1. Configure `.env` (see `docs/SETUP.md`)
2. Start all services:

```bash
npm run dev
```

3. Health checks:

```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
```

## User Story Testing (PM Validation)

### US-01 Earn a Stamp After a Verified Eco Stay (P0)

Pre-reqs:

- Phase 1 contracts deployed (provider + stamp registry)
- At least one provider approved in `provider-registry`
- Oracle running with `ORACLE_PRIVATE_KEY`

Steps:

1. Open `http://localhost:3000`
2. Connect Stacks wallet (Leather or Xverse)
3. Go to `Earn Stamp`
4. Select a `Verified` provider
5. Enter a booking reference and submit
6. Confirm the contract call in the wallet

Expected:

- Mint succeeds and shows a tx link (Hiro explorer)
- `My Stamps` shows the new mint pulled from chain
- `My Activity` shows a “Stamp minted” receipt (local)

Failure cases to verify:

- Selecting a `Pending` provider is blocked and explains the reason
- Disconnecting wallet prevents mint and shows a clear error

### US-02 Discover and Pay for Premium Eco Travel Content (P0)

Two modes:

- Demo payments: `DEMO_MODE=true` (no real USDC settlement)
- Real payments: `DEMO_MODE=false` (requires EVM wallet on Base Sepolia/Base)

Steps (demo mode):

1. Connect Stacks wallet
2. Go to `Guides`
3. Open any guide
4. Confirm payment prompt

Expected:

- Content unlocks in the same view (no full reload)
- `My Activity` shows an `x402 purchase` receipt (local)

Steps (real payments):

1. Set `DEMO_MODE=false` and configure `X402_WALLET_ADDRESS`
2. Connect an EVM wallet in the navbar
3. Repeat guide purchase

Expected:

- Wallet signs the EIP-712 USDC authorization
- Content server validates via facilitator and returns `paymentReceipt`

### US-03 Track Impact Score and Claim sBTC Rewards (P1)

Pre-reqs:

- Phase 3 contract deployed (reward pool)
- Pool seeded (testnet) via Admin panel or script

Steps:

1. Connect wallet
2. Go to `Impact`
3. Observe total stamps, eco points, tier progression
4. Click `Claim Reward` (when enabled) and confirm tx

Expected:

- Claim broadcasts successfully and shows an explorer link
- `My Activity` shows a “Reward claim broadcast” receipt (local)

### US-04 Apply and Get Listed as a Verified Eco Provider (P1)

Steps:

1. Connect wallet
2. Go to `Apply`
3. Fill provider application form
4. Pay listing fee (x402) and confirm `apply-provider` tx

Expected:

- Provider Portal shows the created application and status
- Admin can approve it in `Admin` panel with a signing key hash

Note:

- The on-chain contract enforces one application per wallet.

### US-05 Export ESG Travel Report for Corporate Compliance (P2)

This is implemented as a demo “Corporate” view that aggregates a list of employee wallets by:

- contract reads (`get-total-stamps`, `get-eco-points`, `get-tier`)
- explorer tx scan for `earn-stamp` calls (each row includes `stacksTxId`)

Steps:

1. Go to `Corporate`
2. Paste employee wallets (one per line)
3. Optional: set date filters
4. Click `Build Report`
5. Export:
   - `Export CSV` downloads a CSV with txids for auditability
   - `Print PDF` opens a print dialog for a branded PDF snapshot

Expected:

- CSV rows include `stacksTxId` values
- PDF includes a verification link (and QR when network allows)

## Admin Panel

Pre-req:

- Set `NEXT_PUBLIC_ADMIN_ADDRESS` to the admin Stacks address in `.env`

Steps:

1. Connect the admin wallet
2. Open `Admin`
3. Approve providers (writes signing-key-hash on-chain)
4. Seed reward pool (testnet) using `admin-seed-pool`

Expected:

- All tx links go to Hiro explorer matching `NEXT_PUBLIC_STACKS_NETWORK`

