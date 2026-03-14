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

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![viem](https://img.shields.io/badge/viem-v2-5C3C8D)](https://viem.sh)

[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=githubactions)](https://github.com/easyshellworld/polkaink/actions)
[![Tests](https://img.shields.io/badge/tests-64%20passing-brightgreen)](https://github.com/easyshellworld/polkaink/actions)
[![Chain ID](https://img.shields.io/badge/Chain_ID-420420417-E6007A)](https://polkadot.testnet.routescan.io/)
[![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20ZH%20%7C%20FR%20%7C%20RU%20%7C%20ES%20%7C%20AR-blueviolet)](#)

---

## 📖 What is PolkaInk?

**PolkaInk is an on-chain, DAO-governed history preservation protocol built on Polkadot Asset Hub.** It encodes Polkadot ecosystem history documents — written in Markdown — directly as transaction calldata into the chain itself. No database. No cloud. No IPFS. Only the block.

Access is gated by staking (88 PAS), but staking only buys entry — not voice. Voting weight is earned through writing contributions accepted by the community and through lock-up duration. No wallet can buy dominance; power can only be won.

Every word committed through PolkaInk is as permanent as the block that holds it. When AI-generated disinformation floods the internet and centralized platforms silently rewrite history, PolkaInk builds a human-consensus truth layer that no one can forge or erase.

> Rome's history should be carved into columns cast by Romans themselves.  
> Polkadot's history belongs on Polkadot — and nowhere else.

---

## 🔗 Project Resources

| Resource | Link |
|---|---|
| 🌐 **Live Demo** | [polkaink.netlify.app](https://polkaink.netlify.app/) |
| 📊 **Pitch Deck** | [polkaink.netlify.app/ppt.html](https://polkaink.netlify.app/ppt.html) |
| 🎬 **Demo Video** | [YouTube — Coming Soon](https://www.youtube.com/watch?v=polkaink-demo-placeholder) |
| 📐 **Design Document** | [polkaink\_dev\_doc\_v3\_4.md](docs/polkaink_dev_doc_v3_4.md) |

---

## ✨ Core Features

- **📜 Calldata-Native Storage** — Document content is encoded as calldata directly into Polkadot Asset Hub blocks. Permanent as the chain itself; verifiable by any full node offline, no external service required.
- **🗳️ Stake-Gated DAO Governance** — 88 PAS stake grants membership. Voting weight is determined by writing history (Creator NFTs) and lock-up time — not wallet size. Single-actor passage is mathematically impossible (max real weight 1.80 < threshold 2.00).
- **🛡️ Archive Council** — 7 genesis members with collective veto power only (5/7 threshold). They can block harmful content; they cannot write or alter history. Every veto requires a ≥50-byte on-chain reason, permanently recorded.
- **⏳ 48h Timelock** — All governance upgrades pass through a mandatory delay, preventing rushed or malicious changes.
- **🏅 Soulbound NFT Rewards** — Three on-chain NFT types: **Member** (stake to join), **Creator** (earn by contributing accepted history), **Guardian** (genesis council, minted at deploy, non-transferable, no voting bonus). All Soulbound in the demo phase.
- **💰 Open Treasury** — Community-governed reward pool; anyone can donate. Epoch-based rewards (30-day cycle) are distributed to proposers and voters independent of their vote stance, keeping judgment honest.
- **🔄 Zero-Admin Architecture** — After deployment, no privileged admin exists. `SEED_CREATOR_ROLE` is renounced after seeding; Guardian NFT has no `GUARDIAN_MINTER_ROLE`; council membership is frozen until Phase 1 election contracts go live.
- **🌐 Multilingual** — Interface in English, 中文, Français, Русский, Español, العربية.

---

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│      Frontend · React 19 + Vite + TypeScript            │
│  Tailwind CSS v4 · wagmi v2 · viem v2 · Zustand         │
└──────────────────────────┬──────────────────────────────┘
                           │  wallet connect
┌──────────────────────────▼──────────────────────────────┐
│          Polkadot Asset Hub · pallet-revive (REVM)       │
│  Chain ID 420420417 · Solidity 0.8.28 · UUPS Proxy (OZ)  │
│                                                         │
│  PolkaInkRegistry   VersionStore    GovernanceCore      │
│  ArchiveCouncil     NFTReward       Treasury             │
│  StakingManager     VotingMath                          │
│  TimelockController (48h)           ProxyAdmin           │
│                                                         │
│        Markdown content  =  transaction calldata        │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  Archive Council — 7 members · 5/7 collective veto      │
│  Can protect history. Cannot rewrite it.                │
└─────────────────────────────────────────────────────────┘
```

| Layer | Stack |
|---|---|
| Blockchain | Polkadot Asset Hub — pallet-revive + REVM |
| Contracts | Solidity 0.8.28 · Hardhat · OpenZeppelin UUPS · @parity/hardhat-polkadot |
| Frontend | React 19 · Vite · TypeScript · Tailwind CSS v4 · wagmi v2 · viem v2 |
| State | Zustand + React Query |
| i18n | en / zh / fr / ru / es / ar (i18next) |

---

## 📋 Deployed Contracts — PAS Testnet · Chain ID `420420417`

> Deployed: **2026-03-09 UTC**  
> Treasury seeded with **5,000 PAS** · 4 seed documents created · `SEED_CREATOR_ROLE` renounced ✅

| Contract | Address |
|---|---|
| PolkaInkRegistry | [`0xc3C208E3Eba8dC828e3426102AD678D0bFE15eFe`](https://polkadot.testnet.routescan.io/address/0xc3C208E3Eba8dC828e3426102AD678D0bFE15eFe) |
| VersionStore | [`0xb77Eb7703537f8f119C6a9F58Fe2D33BfA383dCd`](https://polkadot.testnet.routescan.io/address/0xb77Eb7703537f8f119C6a9F58Fe2D33BfA383dCd) |
| GovernanceCore | [`0x87Cb963B9A2e35DA5D8342Afa1Cd0D51b1F559aB`](https://polkadot.testnet.routescan.io/address/0x87Cb963B9A2e35DA5D8342Afa1Cd0D51b1F559aB) |
| ArchiveCouncil | [`0xFC107cf84250C022eF13c6F8751AC5321bECD0fc`](https://polkadot.testnet.routescan.io/address/0xFC107cf84250C022eF13c6F8751AC5321bECD0fc) |
| StakingManager | [`0x286301d1585B40c5B88Ff0fbD86E7A70cE8a2443`](https://polkadot.testnet.routescan.io/address/0x286301d1585B40c5B88Ff0fbD86E7A70cE8a2443) |
| NFTReward | [`0x145EA0d74D31dDFC7ce1F95903d8eb9B0d8D72B3`](https://polkadot.testnet.routescan.io/address/0x145EA0d74D31dDFC7ce1F95903d8eb9B0d8D72B3) |
| Treasury | [`0x4c0CdB7a94cD0aF91460186F72F86297a3Ac7285`](https://polkadot.testnet.routescan.io/address/0x4c0CdB7a94cD0aF91460186F72F86297a3Ac7285) |
| TimelockController | [`0x33CC1AF7c7E88704c83bdED1270aa892813Fec61`](https://polkadot.testnet.routescan.io/address/0x33CC1AF7c7E88704c83bdED1270aa892813Fec61) |
| ProxyAdmin | [`0x4EBb5472bd5fFC619cA880447920584977E5fD68`](https://polkadot.testnet.routescan.io/address/0x4EBb5472bd5fFC619cA880447920584977E5fD68) |

---

## 🚀 Quick Start

```bash
# Contracts
cd contracts && npm install
npx hardhat compile

# Run tests (64 passing)
npx hardhat test

# Frontend
cd frontend && npm install
npm run dev        # http://localhost:5173
```

> CI/CD pipelines and deployment workflows are managed via **GitHub Actions**:  
> 👉 [View Actions](https://github.com/easyshellworld/polkaink/actions)

---

## 📦 Project Structure

```
contracts/
  contracts/          # 9 Solidity contracts (UUPS proxied)
  scripts/deploy/     # deploy_all.ts + numbered deploy scripts
  test/               # Unit + integration tests (64 passing)
frontend/
  src/pages/          # Home, Library, Document, Create, Propose, Governance
  src/hooks/          # useDocuments, useProposals, useVote, useMarkdownContent …
  src/lib/contracts/  # Multi-contract ABIs + deployed addresses
  public/locales/     # en, zh, fr, ru, es, ar
skills/
  polkaink_agent_skill.md   # SKILL.md-format agent file (Claude / Cursor / Copilot)
docs/
  dev_doc.md          # Full design specification (v3.4)
  dev_log.md          # Development log
```

---

## 🗺️ Roadmap

| Phase | Milestones |
|---|---|
| **Phase 0** ✅ | 9-contract architecture · PAS Testnet deployment · Treasury Grant application |
| **Phase 1** | Mainnet launch · Markdown browser · Calldata verification · i18n 6 languages |
| **Phase 2** | Full DAO · Council election contracts · NFT reward activation · Bug Bounty |
| **Phase 3** | Open API · AI-assisted summaries (off-chain, on-chain archive) · Polkassembly integration |
| **Phase 4** | Kusama history · Multi-parachain archive · DeFi yield for Treasury |
| **Phase 5** | Polkadot Proof of Personhood integration · ZK-based one-person-one-weight |

---

## 🤝 Contributing

All contributions are welcome: bug reports, feature proposals, documentation improvements, code fixes, and translations.

---

## 📄 License

MIT License — open source, forever.

---

## 📞 Links

- **Repository**: [github.com/easyshellworld/polkaink](https://github.com/easyshellworld/polkaink)
- **Issues**: [github.com/easyshellworld/polkaink/issues](https://github.com/easyshellworld/polkaink/issues)
- **Testnet Explorer**: [polkadot.testnet.routescan.io](https://polkadot.testnet.routescan.io/)
- **Agent Skill**: [`skills/polkaink_agent_skill.md`](skills/polkaink_agent_skill.md)

---

**Built by PolkaClaw** — *History, now it's all ON-CHAIN. Memory that cannot be erased.* ◎
