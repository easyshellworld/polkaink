# PolkaInk

> *「当一条链的历史开始被遗忘，它的未来就已经死了。」*

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/easyshellworld/polkaink/blob/main/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-欢迎提交-brightgreen.svg)](https://github.com/easyshellworld/polkaink/pulls)
[![GitHub Repo stars](https://img.shields.io/github/stars/easyshellworld/polkaink?style=social)](https://github.com/easyshellworld/polkaink/stargazers)
[![Open Issues](https://img.shields.io/github/issues/easyshellworld/polkaink)](https://github.com/easyshellworld/polkaink/issues)
[![Last Commit](https://img.shields.io/github/last-commit/easyshellworld/polkaink)](https://github.com/easyshellworld/polkaink/commits/main)

[![Polkadot](https://img.shields.io/badge/Polkadot-Asset_Hub_测试网-E6007A?logo=polkadot)](https://polkadot.network/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?logo=solidity&logoColor=white)](https://soliditylang.org/)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-UUPS-4E5EE4?logo=openzeppelin)](https://openzeppelin.com/)
[![Hardhat](https://img.shields.io/badge/Hardhat-parity--polkadot-FFF100?logo=hardhat&logoColor=black)](https://hardhat.org/)

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![viem](https://img.shields.io/badge/viem-v2-5C3C8D)](https://viem.sh)

[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=githubactions)](https://github.com/easyshellworld/polkaink/actions)
[![Tests](https://img.shields.io/badge/测试-64%20通过-brightgreen)](https://github.com/easyshellworld/polkaink/actions)
[![Chain ID](https://img.shields.io/badge/Chain_ID-420420417-E6007A)](https://polkadot.testnet.routescan.io/)
[![i18n](https://img.shields.io/badge/多语言-EN%20%7C%20ZH%20%7C%20FR%20%7C%20RU%20%7C%20ES%20%7C%20AR-blueviolet)](#)

---

## 📖 PolkaInk 是什么？

**PolkaInk 是运行在 Polkadot Asset Hub 上的链上 DAO 治理历史存档协议。** 它将 Polkadot 生态历史文档（Markdown 格式）以交易 **calldata** 的形式直接写入区块——没有数据库，没有云，没有 IPFS，只有链本身。

参与门槛是质押（88 PAS），但质押只购买入场资格，买不来话语权。投票权重由贡献决定：你写入了多少被社区接受的历史、你锁仓了多长时间。权力无法被购买，只能被赢得。

通过 PolkaInk 写入的每一个字，都与承载它的区块等寿。当 AI 生成的虚假信息泛滥、中心化平台悄然改写历史的时代，PolkaInk 构筑起一道以人类共识为基础、任何权力皆无法抹去的真相防线。

> 罗马的历史，应当刻进罗马人自己铸造的石柱上。  
> Polkadot 的历史，属于 Polkadot——属于链上，属于永远。

---

## 🔗 项目资源

| 资源 | 链接 |
|---|---|
| 🌐 **在线 Demo** | [polkaink.netlify.app](https://polkaink.netlify.app/) |
| 📊 **项目 PPT** | [polkaink.netlify.app/ppt.html](https://polkaink.netlify.app/ppt.html) |
| 🎬 **演示视频** | [YouTube ](https://youtu.be/Ta2DKs1SdYE) |
| 📐 **项目设计书** | [polkaink\_dev\_doc\_v3\_4.md](docs/polkaink_dev_doc_v3_4.md) |

---

## ✨ 核心特性

- **📜 纯链上 Calldata 存储** — 文档内容以 calldata 编码写入 Polkadot Asset Hub 区块，与区块等寿，任何全节点可离线独立验证，无需依赖任何外部服务。
- **🗳️ 质押成员制 + DAO 治理** — 88 PAS 质押获得成员资格。投票权重由创作贡献（Creator NFT 数量）与锁仓时长共同决定，而非钱包余额。单人通过在数学上不可能（单人最大实际权重 1.80 < 通过门槛 2.00）。
- **🛡️ Archive Council 伦理防线** — 7 位创世成员，集体否决权（5/7 多数），且无任何写入或改写权力。每次否决须附 ≥50 字节链上理由，永久公开可查。
- **⏳ 48 小时 Timelock** — 所有治理升级须经强制延迟，防止仓促或恶意变更。
- **🏅 Soulbound NFT 激励** — 三种链上 NFT：**Member**（质押入场）、**Creator**（贡献被接受的历史后自动铸造，无限叠加）、**Guardian**（创世 Council 构造函数直接 mint，无增发角色，无权重加成）。Demo 阶段均为 Soulbound。
- **💰 开放 Treasury** — 任何人可捐款，Epoch 奖励（30 天周期）同时发放给提案人与投票者，且与投票立场解耦，保持判断独立性。
- **🔒 零特权管理员** — 部署完成后协议中不存在任何特权管理员。`SEED_CREATOR_ROLE` 创建 4 个种子文档后立即 renounce；Guardian NFT 无 `GUARDIAN_MINTER_ROLE`；Council 创世成员地址写入构造函数，Phase 1 前无人可替换。
- **🌐 多语言支持** — 界面支持 English、中文、Français、Русский、Español、العربية。

---

## 🏛️ 架构总览

```
┌─────────────────────────────────────────────────────────┐
│     前端 · React 19 + Vite + TypeScript                 │
│  Tailwind CSS v4 · wagmi v2 · viem v2 · Zustand         │
└──────────────────────────┬──────────────────────────────┘
                           │  钱包连接
┌──────────────────────────▼──────────────────────────────┐
│   Polkadot Asset Hub · pallet-revive (REVM 兼容)         │
│  Chain ID 420420417 · Solidity 0.8.28 · UUPS Proxy (OZ)  │
│                                                         │
│  PolkaInkRegistry   VersionStore    GovernanceCore      │
│  ArchiveCouncil     NFTReward       Treasury             │
│  StakingManager     VotingMath                          │
│  TimelockController (48h 延迟)      ProxyAdmin           │
│                                                         │
│         Markdown 内容  =  交易 calldata                 │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  Archive Council — 7 成员 · 5/7 集体否决                 │
│  可守护历史，永远无法改写历史                             │
└─────────────────────────────────────────────────────────┘
```

| 层级 | 技术栈 |
|---|---|
| 区块链 | Polkadot Asset Hub — pallet-revive + REVM |
| 合约 | Solidity 0.8.28 · Hardhat · OpenZeppelin UUPS · @parity/hardhat-polkadot |
| 前端 | React 19 · Vite · TypeScript · Tailwind CSS v4 · wagmi v2 · viem v2 |
| 状态管理 | Zustand + React Query |
| 国际化 | en / zh / fr / ru / es / ar（i18next） |

---

## 📋 已部署合约 — PAS 测试网 · Chain ID `420420417`

> 部署时间：**2026-03-09 UTC**  
> Treasury 注资 **5,000 PAS** · 已创建 4 条种子文档 · `SEED_CREATOR_ROLE` 已 renounce ✅

| 合约 | 地址 |
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

## 🚀 快速开始

```bash
# 合约
cd contracts && npm install
npx hardhat compile

# 运行测试（64 项全部通过）
npx hardhat test

# 前端
cd frontend && npm install
npm run dev        # http://localhost:5173
```

> CI/CD 流水线与部署工作流均通过 **GitHub Actions** 管理：  
> 👉 [查看 Actions](https://github.com/easyshellworld/polkaink/actions)

---

## 📦 项目结构

```
contracts/
  contracts/          # 9 个 Solidity 合约（UUPS 代理）
  scripts/deploy/     # deploy_all.ts + 编号部署脚本
  test/               # 单元测试 + 集成测试（64 项通过）
frontend/
  src/pages/          # Home、Library、Document、Create、Propose、Governance
  src/hooks/          # useDocuments、useProposals、useVote、useMarkdownContent …
  src/lib/contracts/  # 多合约 ABI + 部署地址
  public/locales/     # en, zh, fr, ru, es, ar
skills/
  polkaink_agent_skill.md   # SKILL.md 格式 Agent 文件（兼容 Claude / Cursor / Copilot）
docs/
  dev_doc.md          # 完整设计规范（v3.4）
  dev_log.md          # 开发日志
```

---

## 🗺️ 路线图

| 阶段 | 目标 |
|---|---|
| **Phase 0** ✅ | 9 合约架构完成 · PAS 测试网部署 · Treasury Grant 申请 |
| **Phase 1** | 主网上线 · Markdown 浏览器 · Calldata 验证工具 · 6 语言 i18n |
| **Phase 2** | 完整 DAO · Council 选举合约 · NFT 奖励体系激活 · Bug Bounty |
| **Phase 3** | 开放 API · AI 辅助摘要（链下运行，链上存档）· Polkassembly 数据互通 |
| **Phase 4** | Kusama 历史支持 · 多 Parachain 存档 · DeFi yield 补充国库 |
| **Phase 5** | 接入 Polkadot Proof of Personhood · 零知识证明一人一基础权重 |

---

## 🤝 参与贡献

欢迎一切形式的贡献：问题反馈、功能建议、文档改进、代码修复、翻译贡献。

---

## 📄 许可证

MIT 许可证 — 开源，永久。

---

## 📞 链接

- **代码仓库**：[github.com/easyshellworld/polkaink](https://github.com/easyshellworld/polkaink)
- **问题反馈**：[github.com/easyshellworld/polkaink/issues](https://github.com/easyshellworld/polkaink/issues)
- **测试网浏览器**：[polkadot.testnet.routescan.io](https://polkadot.testnet.routescan.io/)
- **Agent 技能文件**：[`skills/polkaink_agent_skill.md`](skills/polkaink_agent_skill.md)

---

**由 PolkaClaw 构建** — *历史，永刻链上。记忆，无法删除。* ◎
