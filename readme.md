# PolkaInk

> *"When a chain's history begins to be forgotten, its future is already dead."*

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/easyshellworld/polkaink/blob/main/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/easyshellworld/polkaink/pulls)
[![GitHub Repo stars](https://img.shields.io/github/stars/easyshellworld/polkaink?style=social)](https://github.com/easyshellworld/polkaink/stargazers)
[![Open Issues](https://img.shields.io/github/issues/easyshellworld/polkaink)](https://github.com/easyshellworld/polkaink/issues)
[![Last Commit](https://img.shields.io/github/last-commit/easyshellworld/polkaink)](https://github.com/easyshellworld/polkaink/commits/main)

[![Polkadot](https://img.shields.io/badge/Polkadot-Asset_Hub_Testnet-E6007A?logo=polkadot)](https://polkadot.network/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?logo=solidity&logoColor=white)](https://soliditylang.org/)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-UUPS-4E5EE4?logo=openzeppelin)](https://openzeppelin.com/)
[![Hardhat](https://img.shields.io/badge/Hardhat-parity--polkadot-FFF100?logo=hardhat&logoColor=black)](https://hardhat.org/)

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![viem](https://img.shields.io/badge/viem-v2-5C3C8D)](https://viem.sh)

[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=githubactions)](https://github.com/easyshellworld/polkaink/actions)
[![Tests](https://img.shields.io/badge/tests-64%20passing-brightgreen)](https://github.com/easyshellworld/polkaink/actions)
[![Chain ID](https://img.shields.io/badge/Chain_ID-420420417-E6007A)](https://polkadot.testnet.routescan.io/)
[![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20ZH%20%7C%20FR%20%7C%20RU%20%7C%20ES%20%7C%20AR-blueviolet)](#)

---

## 📖 What is PolkaInk?

PolkaInk is an **on-chain, DAO-governed knowledge preservation protocol** built on the Polkadot ecosystem. It is a permanent, community-consensus archive where every edit is transparent, version-controlled, and immutable — engraved into Polkadot Asset Hub as transaction calldata.

No database. No cloud. No IPFS. Only the chain itself.

Every word written through PolkaInk is encoded directly as calldata into Polkadot Asset Hub's block data — independent of external storage protocols, independent of any team, immune to deletion or tampering. When AI-generated disinformation floods the internet and centralized platforms silently rewrite history, PolkaInk builds a human-consensus truth layer that cannot be forged.

> In an age of entropy, we choose to be entropy-reducers.

**Core philosophy**: Rome's history should be carved into columns cast by Romans themselves. Polkadot's history belongs on Polkadot — and nowhere else.

---

## ✨ Core Features

- **📜 Calldata-Native Storage** — Document content written as calldata; permanent as the block itself, verifiable by any full node.
- **🗳️ DAO Governance** — All edits, proposals, and approvals flow through on-chain community voting with full transparency.
- **🛡️ Archive Council** — A 7-member ethics committee with veto power only; they can protect history but never rewrite it.
- **⏳ 48h Timelock** — Every governance action passes through a mandatory delay, preventing rushed or malicious changes.
- **🏅 Author NFT Rewards** — Contributors earn on-chain NFT credentials for verified knowledge contributions.
- **💰 Treasury** — Community-governed fund for sustained protocol development and contributor incentives.
- **🔄 UUPS Upgradeable** — Contracts are upgradeable via proxy pattern, ensuring the protocol can evolve without losing history.
- **🌐 Multilingual** — Interface available in English, 中文, Français, Русский, Español, العربية.

---

## 🏛️ Architecture

```
┌──────────────────────────────────────────────────────┐
│        Frontend · React 18 + Vite + TypeScript       │
│     Tailwind CSS v4 · viem v2 · Zustand              │
└───────────────────────┬──────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────┐
│           Polkadot Asset Hub · Smart Contracts        │
│                                                      │
│  PolkaInkRegistry  VersionStore  GovernanceCore      │
│  ArchiveCouncil    NFTReward     Treasury             │
│  TimelockController              ProxyAdmin           │
│                                                      │
│       Markdown content = transaction calldata        │
└───────────────────────┬──────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────┐
│      Archive Council (Ethics Committee)              │
│      Veto power only — history cannot be rewritten   │
└──────────────────────────────────────────────────────┘
```

| Layer | Technology |
|---|---|
| Contracts | Solidity 0.8.28 / Hardhat / OpenZeppelin UUPS / @parity/hardhat-polkadot |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS v4 + viem v2 |
| State | Zustand + React Query |
| i18n | English / 中文 / Français / Русский / Español / العربية |

---

## 📋 Deployed Contracts (PAS TestNet · Chain ID `420420417`)

| Contract | Address |
|---|---|
| PolkaInkRegistry | [`0x959b25F190189e588DaC814a95fe13a97d5198A1`](https://polkadot.testnet.routescan.io/address/0x959b25F190189e588DaC814a95fe13a97d5198A1) |
| VersionStore | [`0xBB4cccdDb9e3ba74Ae28A412d34801353D1e0Ad6`](https://polkadot.testnet.routescan.io/address/0xBB4cccdDb9e3ba74Ae28A412d34801353D1e0Ad6) |
| GovernanceCore | [`0xae456115ce2897338FE22Cd342312D92D47821Fb`](https://polkadot.testnet.routescan.io/address/0xae456115ce2897338FE22Cd342312D92D47821Fb) |
| ArchiveCouncil | [`0x12771dcae01DEba4757719f7D2bD06D235a9FaD8`](https://polkadot.testnet.routescan.io/address/0x12771dcae01DEba4757719f7D2bD06D235a9FaD8) |
| NFTReward | [`0x58DC769015e5a6bAdC5C56519B5f74F851575bAe`](https://polkadot.testnet.routescan.io/address/0x58DC769015e5a6bAdC5C56519B5f74F851575bAe) |
| Treasury | [`0x10F968271C18FF349a3a67FEE9141F7F4f42AD14`](https://polkadot.testnet.routescan.io/address/0x10F968271C18FF349a3a67FEE9141F7F4f42AD14) |
| TimelockController | [`0x684018c8709105437c277Eec60953cF335EaB5D9`](https://polkadot.testnet.routescan.io/address/0x684018c8709105437c277Eec60953cF335EaB5D9) |
| ProxyAdmin | [`0x646664752E351ecb1f4c3B627Ba7cd76F7fF294c`](https://polkadot.testnet.routescan.io/address/0x646664752E351ecb1f4c3B627Ba7cd76F7fF294c) |

---

## 🚀 Quick Start

```bash
# Contracts
cd contracts && npm install
npx hardhat compile

# Frontend
cd frontend && npm install
npm run dev        # http://localhost:5173
```

> CI/CD pipelines, test results, and deployment workflows are managed via **GitHub Actions**:
> 👉 [View Actions](https://github.com/easyshellworld/polkaink/actions)

---

## 📦 Project Structure

```
contracts/
  contracts/              # 8 Solidity contracts (UUPS proxied)
  scripts/deploy/         # Numbered deploy scripts + deploy_all.ts
  test/                   # Unit + integration tests (64 passing)
frontend/
  src/pages/              # Home, Library, Document, Create, Propose, Governance
  src/hooks/              # useDocuments, useProposals, useVote, useMarkdownContent, ...
  src/lib/contracts/      # Multi-contract ABIs + addresses
  public/locales/         # en, zh, fr, ru, es, ar
skills/
  polkaink_agent_skill.md # Agent-friendly skill file for AI interaction
docs/
  dev_doc.md              # Design specification
  dev_log.md              # Development log
```

---

## 🗺️ Roadmap

| Phase | Milestones |
|---|---|
| **Phase 0** | Contract architecture · PAS Testnet · Treasury Grant application |
| **Phase 1** | Mainnet launch · Markdown browser · Calldata verification tools |
| **Phase 2** | DAO + NFT rewards · 100 inaugural history authors |
| **Phase 3** | Open API · AI-powered summaries · Subscan integration |
| **Phase 4** | Kusama extension · Multi-parachain history archive |

---

## 🤝 Contributing

We welcome contributions of all kinds:

- 🐛 Bug reports
- 💡 Feature suggestions
- 📝 Documentation improvements
- 🔧 Code fixes
- 🌐 Translation contributions

---

## 📄 License

MIT License — open source, forever.

---

## 📞 Contact

- **Repository**: [github.com/easyshellworld/polkaink](https://github.com/easyshellworld/polkaink)
- **Issues**: [github.com/easyshellworld/polkaink/issues](https://github.com/easyshellworld/polkaink/issues)
- **Agent Skill**: [`skills/polkaink_agent_skill.md`](skills/polkaink_agent_skill.md)

---

**Built by PolkaClaw** — *Write Our history on-chain. Memory that cannot be erased.* 🦑✨


