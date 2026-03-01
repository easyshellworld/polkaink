# PolkaInk

On-chain, DAO-governed knowledge preservation protocol for the Polkadot ecosystem — a permanent, community-consensus archive where every edit is transparent and immutable.

> **Languages**: English (default) · [中文](#中文) · [한국어](#한국어)

## Contracts (PAS TestNet)

| Contract | Address |
|----------|---------|
| PolkaInkRegistry | [`0x959b...8A1`](https://polkadot.testnet.routescan.io/address/0x959b25F190189e588DaC814a95fe13a97d5198A1) |
| VersionStore | [`0xBB4c...0Ad6`](https://polkadot.testnet.routescan.io/address/0xBB4cccdDb9e3ba74Ae28A412d34801353D1e0Ad6) |
| GovernanceCore | [`0xae45...21Fb`](https://polkadot.testnet.routescan.io/address/0xae456115ce2897338FE22Cd342312D92D47821Fb) |
| ArchiveCouncil | [`0x1277...FaD8`](https://polkadot.testnet.routescan.io/address/0x12771dcae01DEba4757719f7D2bD06D235a9FaD8) |
| NFTReward | [`0x58DC...5bAe`](https://polkadot.testnet.routescan.io/address/0x58DC769015e5a6bAdC5C56519B5f74F851575bAe) |
| Treasury | [`0x10F9...D14`](https://polkadot.testnet.routescan.io/address/0x10F968271C18FF349a3a67FEE9141F7F4f42AD14) |
| TimelockController | [`0x6840...5bD9`](https://polkadot.testnet.routescan.io/address/0x684018c8709105437c277Eec60953cF335EaB5D9) |
| ProxyAdmin | [`0x6466...294c`](https://polkadot.testnet.routescan.io/address/0x646664752E351ecb1f4c3B627Ba7cd76F7fF294c) |

Chain ID `420420417` · Solidity `0.8.28` · UUPS upgradeable · 64 tests passing

## Tech Stack

- **Contracts**: Solidity / Hardhat / OpenZeppelin UUPS / @parity/hardhat-polkadot
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS v4 + ethers.js v6
- **State**: Zustand + React Query
- **i18n**: English / 中文 / 한국어

## Quick Start

```bash
# Contracts
cd contracts && npm install
npx hardhat compile
npx hardhat test              # 64 tests

# Deploy (PAS TestNet)
npx hardhat run scripts/deploy/deploy_all.ts --network pasTestnet

# Frontend
cd frontend && npm install
npm run dev                   # http://localhost:5173
```

## Project Structure

```
contracts/
  contracts/                  # 8 Solidity contracts (UUPS proxied)
  scripts/deploy/             # Numbered deploy scripts + deploy_all.ts
  test/                       # Unit + integration tests (64 passing)
frontend/
  src/pages/                  # Home, Library, Document, Create, Propose, Governance
  src/hooks/                  # useDocuments, useProposals, useVote, useMarkdownContent, ...
  src/lib/contracts/          # Multi-contract ABIs + addresses
  public/locales/             # en, zh-CN, kr
skills/
  polkaink_agent_skill.md     # Agent-friendly skill file for AI interaction
docs/
  dev_doc.md                  # Design specification
  dev_log.md                  # Development log
```

## Agent Skill

PolkaInk is agent-friendly. AI agents can interact with all contracts using the skill file:
[`skills/polkaink_agent_skill.md`](skills/polkaink_agent_skill.md)

## Built by PolkaClaw

---

## 中文

# PolkaInk

基于 Polkadot 的链上 DAO 治理知识存档协议——一个永久、透明、不可篡改的社区共识档案馆。

### 技术栈

- **合约**: Solidity / Hardhat / OpenZeppelin UUPS
- **前端**: React 18 + Vite + TypeScript + Tailwind CSS v4 + ethers.js v6
- **状态管理**: Zustand + React Query
- **多语言**: English / 中文 / 한국어

### 快速开始

```bash
# 合约
cd contracts && npm install
npx hardhat compile
npx hardhat test              # 64 项测试

# 部署（PAS 测试网）
npx hardhat run scripts/deploy/deploy_all.ts --network pasTestnet

# 前端
cd frontend && npm install
npm run dev                   # http://localhost:5173
```

合约地址及详细信息请参见上方英文部分。

### 由 PolkaClaw 构建

---

## 한국어

# PolkaInk

폴카닷 생태계를 위한 온체인 DAO 거버넌스 지식 보존 프로토콜 — 모든 편집이 투명하고 영구적인 커뮤니티 합의 아카이브입니다.

### 기술 스택

- **컨트랙트**: Solidity / Hardhat / OpenZeppelin UUPS
- **프론트엔드**: React 18 + Vite + TypeScript + Tailwind CSS v4 + ethers.js v6
- **상태 관리**: Zustand + React Query
- **다국어 지원**: English / 中文 / 한국어

### 빠른 시작

```bash
# 컨트랙트
cd contracts && npm install
npx hardhat compile
npx hardhat test              # 64개 테스트

# 배포 (PAS 테스트넷)
npx hardhat run scripts/deploy/deploy_all.ts --network pasTestnet

# 프론트엔드
cd frontend && npm install
npm run dev                   # http://localhost:5173
```

컨트랙트 주소 및 상세 정보는 상단 영문 섹션을 참조하세요.

### PolkaClaw 제작
