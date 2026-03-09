# 🌿 EcoStamp — Verifiable Travel Impact Protocol

> Earn on-chain proof of your sustainable travel choices.  
> Built on Stacks Bitcoin L2 · Buidl Battle 2026

---

## Overview

EcoStamp mints **Semi-Fungible Token (SIP-013) stamps** for verified eco-friendly travel bookings — hotels, trains, green airlines, and more. Stamps accumulate into a tiered reputation score, unlocking **sBTC rewards** funded by sustainability sponsors.

**Primary bounty:** Best x402 Integration (Phase 2)  
**Phase 1 scope:** Core proof loop — contracts + frontend gallery + submit flow

---

## Project Structure

```
ecostamp/
├── contracts/
│   └── ecostamp/
│       ├── provider-registry.clar   # Verified eco provider listings
│       └── stamp-registry.clar      # SIP-013 SFT stamp minting
│
├── deploy/
│   ├── deploy-phase1.js             # Phase 1 deployment script
│   ├── package.json
│   └── phase1-report.json           # Generated after deployment
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── globals.css
│   │   └── components/
│   │       ├── Nav.tsx
│   │       ├── Hero.tsx
│   │       ├── StampGallery.tsx
│   │       ├── SubmitProof.tsx
│   │       ├── ImpactDashboard.tsx
│   │       ├── Providers.tsx
│   │       ├── ParticleField.tsx
│   │       └── Footer.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── next.config.js
│
├── .env.example                     # Copy to .env and fill in
└── README.md
```

---

## Quick Start

### 1. Environment

```bash
cp .env.example .env
# Fill in STACKS_PRIVATE_KEY, DEPLOYER_ADDRESS, STACKS_NETWORK=testnet
```

Get testnet STX from the faucet:  
https://explorer.stacks.co/sandbox/faucet?chain=testnet

### 2. Deploy contracts

```bash
cd deploy
npm install
node deploy-phase1.js
```

This will:
- Deploy `provider-registry.clar`
- Deploy `stamp-registry.clar`
- Write contract addresses to `frontend/.env.contracts`
- Save a deployment report to `deploy/phase1-report.json`

### 3. Run the frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## Smart Contracts

### `provider-registry.clar`

Manages verified eco travel provider listings.

| Function | Who can call | Description |
|---|---|---|
| `apply-provider` | Anyone | Submit provider application |
| `approve-provider` | Verifier only | Approve + register signing key |
| `revoke-provider` | Verifier only | Remove bad actor |
| `get-provider` | Anyone | Read provider details |
| `is-approved` | Anyone | Check if provider is active |

### `stamp-registry.clar`

SIP-013 Semi-Fungible Token minting with booking proof validation.

| Function | Who can call | Description |
|---|---|---|
| `earn-stamp` | Any user | Submit booking proof → mint SFT stamp |
| `get-balance` | Anyone | Stamps held for a provider type |
| `get-total-stamps` | Anyone | Total stamps across all providers |
| `get-tier` | Anyone | Current tier (0=bronze, 1=silver, 2=gold) |
| `transfer` | Token owner | Transfer stamps (SIP-013) |

**Tier thresholds:**
- 🥉 Bronze: 0+ points
- 🥈 Silver: 20+ points  
- 🥇 Gold: 60+ points

---

## Frontend Screens

| Screen | Route/Tab | User Story |
|---|---|---|
| Home / Hero | Default | — |
| My Stamps | `stamps` tab | US-01 |
| Earn Stamp | `submit` tab | US-01 |
| Impact Dashboard | `impact` tab | US-03 |
| Providers | `providers` tab | US-04 |

---

## Phase Roadmap

| Phase | Scope | Status |
|---|---|---|
| **1 — Core Proof Loop** | Contracts + frontend gallery + submit flow | ✅ This PR |
| 2 — x402 Content | Eco-guide gating, content reader, My Activity | ⏳ Next |
| 3 — Rewards & Tiers | reward-pool.clar, sBTC claim, sponsor deposits | ⏳ |
| 4 — Provider Self-Serve | Application form, admin panel, signing key delivery | ⏳ |
| 5 — Enterprise ESG | Corporate dashboard, PDF/CSV export | ⏳ |

---

## Reference URLs

- **Stacks docs:** https://docs.stacks.co
- **Clarity reference:** https://docs.stacks.co/reference/language-functions
- **SIP-013 SFT standard:** https://github.com/stacksgov/sips/blob/main/sips/sip-013
- **sBTC docs:** https://docs.stacks.co/concepts/sbtc
- **Hiro Chainhooks:** https://docs.hiro.so/chainhooks
- **x402 protocol:** https://docs.x402.org
- **stacks.js connect:** https://docs.stacks.co/guides/tutorials/build-a-frontend/authentication-with-stacksjs
- **Testnet faucet:** https://explorer.stacks.co/sandbox/faucet?chain=testnet

---

## Buidl Battle 2026

> 🏅 Best x402 Integration · 🔥 Most Innovative Use of sBTC  
> Stacks Blockchain · Bitcoin L2 · $20,000 in prizes
