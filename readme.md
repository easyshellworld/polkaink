# PolkaInk

On-chain, decentralized knowledge preservation protocol on Polkadot — a Wikipedia-like system where every edit is permanent and governed by DAO voting.

## Contract

| Network | Chain ID | Address |
|---|---|---|
| PAS (Polkadot Hub TestNet) | 420420417 | [`0x401e00E5b9bAFc674EE804BaBfC18D6eeEE8e49E`](https://polkadot.testnet.routescan.io/address/0x401e00E5b9bAFc674EE804BaBfC18D6eeEE8e49E) |

- **Solidity** `0.8.28` · compiled via `@parity/hardhat-polkadot` (resolc)
- Single contract MVP: document registry + version store + governance

## Tech Stack

- **Contract**: Solidity / Hardhat / @parity/hardhat-polkadot
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + ethers.js
- **Wallet**: MetaMask (EVM-compatible)

## Quick Start

```bash
# Install
npm install
cd frontend && npm install && cd ..

# Compile contract
npx hardhat compile

# Run tests (112 passing)
npx hardhat test

# Deploy
npx hardhat run scripts/deploy.ts --network polkadotTestnet

# Frontend dev
cd frontend && npm run dev
```

## Project Structure

```
contracts/PolkaInk.sol    # Smart contract (single-file MVP)
frontend/                 # React DApp
scripts/deploy.ts         # Deployment script
test/PolkaInk.test.ts     # 112 unit tests
docs/dev_doc.md           # Development specification
docs/dev_log.md           # Development log
```
