# EcoStamp Setup

This repo runs 3 local services:

- `frontend/` (Next.js) on `http://localhost:3000`
- `content-server/` (x402-gated APIs) on `http://localhost:3001`
- `oracle/` (secp256k1 booking proof signer) on `http://localhost:3002`

## Prereqs

- Node.js `>=18`
- npm `>=9`
- Leather wallet (Stacks) for contract calls
- MetaMask/Coinbase Wallet (EVM) only when `DEMO_MODE=false`

## Install

```bash
cd ecostamp
npm run install:all
cp .env.example .env
```

## Configure `.env`

Minimum recommended local-dev values:

```bash
# Stacks
STACKS_NETWORK=testnet
STACKS_API_URL=https://api.testnet.hiro.so
NEXT_PUBLIC_STACKS_NETWORK=testnet
NEXT_PUBLIC_STACKS_API=https://api.testnet.hiro.so

# x402
X402_NETWORK=base-sepolia
NEXT_PUBLIC_X402_NETWORK=base-sepolia
CONTENT_SERVER_URL=http://localhost:3001

# Demo mode (no real USDC settlement)
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true

# Oracle
ORACLE_URL=http://localhost:3002
ORACLE_PORT=3002
ORACLE_PRIVATE_KEY=<generated>

# Shared secret (Next.js issues JWT; content-server verifies it)
STAMP_JWT_SECRET=<any-long-random-string>
```

Generate the oracle key:

```bash
npm run oracle:keygen
```

Copy the printed `ORACLE_PRIVATE_KEY` into `.env`.

## Deploy Contracts (Testnet)

1. Fund your deployer wallet with testnet STX (Hiro faucet).
2. Set in `.env`:

```bash
STACKS_PRIVATE_KEY=<64-hex>
DEPLOYER_ADDRESS=ST...
NEXT_PUBLIC_ADMIN_ADDRESS=ST...   # same wallet for local admin panel
```

3. Deploy Phase 1:

```bash
npm run deploy:phase1
```

This writes contract IDs to `frontend/.env.contracts` and wires:

- `stamp-registry.set-provider-registry(provider-registry)`
- `provider-registry.set-stamp-registry(stamp-registry)`

4. Deploy Phase 3 (reward pool + seed):

```bash
npm run deploy:phase3
```

This writes `NEXT_PUBLIC_REWARD_POOL_ADDRESS` to `frontend/.env.contracts.phase3`.

## Run Locally

```bash
npm run dev
```

Or run individually:

```bash
npm run content-server:dev
npm run oracle:dev
npm run frontend:dev
```

## Switch To Mainnet

Update `.env`:

```bash
STACKS_NETWORK=mainnet
STACKS_API_URL=https://api.hiro.so
NEXT_PUBLIC_STACKS_NETWORK=mainnet
NEXT_PUBLIC_STACKS_API=https://api.hiro.so

X402_NETWORK=base
NEXT_PUBLIC_X402_NETWORK=base

DEMO_MODE=false
NEXT_PUBLIC_DEMO_MODE=false

X402_WALLET_ADDRESS=0x<funded-base-wallet>
NEXT_PUBLIC_X402_WALLET=0x<same-wallet>
```

Then run the Phase 5 deployment script:

```bash
npm run deploy:phase5
```

That deploys the updated contracts and enables signature verification.

