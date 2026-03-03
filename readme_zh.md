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

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![viem](https://img.shields.io/badge/viem-v2-5C3C8D)](https://viem.sh)

[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=githubactions)](https://github.com/easyshellworld/polkaink/actions)
[![Tests](https://img.shields.io/badge/测试-64%20通过-brightgreen)](https://github.com/easyshellworld/polkaink/actions)
[![Chain ID](https://img.shields.io/badge/Chain_ID-420420417-E6007A)](https://polkadot.testnet.routescan.io/)
[![i18n](https://img.shields.io/badge/多语言-EN%20%7C%20ZH%20%7C%20FR%20%7C%20RU%20%7C%20ES%20%7C%20AR-blueviolet)](#)

---

## 📖 PolkaInk 是什么？

PolkaInk 是一个**基于 Polkadot 生态的链上 DAO 治理知识存档协议**。它是一个永久的、以社区共识为基础的档案馆——每一次编辑都透明可溯、版本可控、不可篡改，以交易 calldata 的形式永久刻入 Polkadot Asset Hub 的区块数据之中。

没有数据库。没有云。没有 IPFS。只有链本身。

通过 PolkaInk 写入的每一个字，都以 calldata 的形式编码进 Polkadot Asset Hub 的区块——不依赖外部存储协议，不依赖任何团队，无法被删除，无法被篡改。当 AI 生成的虚假信息泛滥、中心化平台悄然改写历史时，PolkaInk 构筑起一道以人类共识为基础、AI 无法伪造的真相防线。

> 在熵增的时代，我们选择做熵减。

**核心理念**：罗马的历史，应当刻进罗马人自己铸造的石柱上。Polkadot 的历史，属于 Polkadot——属于链上，属于永远。

---

## ✨ 核心特性

- **📜 纯链上 Calldata 存储** — 文档内容以calldata 写入区块，与区块等寿，任何全节点均可验证。
- **🗳️ DAO 链上治理** — 所有编辑、提案、审批均通过链上社区投票完成，全程透明，无需信任。
- **🛡️ 档案守护委员会** — 7 人伦理委员会，仅拥有否决权；可守护历史，但永远无法主动改写。
- **⏳ 48 小时 Timelock** — 所有治理操作须经过强制延迟，防止仓促或恶意变更。
- **🏅 作者 NFT 奖励** — 贡献者通过验证的知识贡献，可获得链上 NFT 凭证。
- **💰 社区 Treasury** — 由社区治理的资金库，用于协议持续发展与贡献者激励。
- **🔄 UUPS 可升级架构** — 合约采用代理升级模式，协议可持续演进而不丢失历史数据。
- **🌐 多语言支持** — 界面支持 English、中文、Français、Русский、Español、العربية。

---

## 🏛️ 架构总览

```
┌──────────────────────────────────────────────────────┐
│       前端 · React 18 + Vite + TypeScript            │
│     Tailwind CSS v4 · viem v2 · Zustand              │
└───────────────────────┬──────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────┐
│           Polkadot Asset Hub · 智能合约层             │
│                                                      │
│  PolkaInkRegistry  VersionStore  GovernanceCore      │
│  ArchiveCouncil    NFTReward     Treasury             │
│  TimelockController              ProxyAdmin           │
│                                                      │
│           Markdown 内容 = 交易 calldata              │
└───────────────────────┬──────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────┐
│      档案守护委员会（伦理守卫）                        │
│      仅拥有否决权——历史无法被改写                     │
└──────────────────────────────────────────────────────┘
```

| 层级 | 技术栈 |
|---|---|
| 合约 | Solidity 0.8.28 / Hardhat / OpenZeppelin UUPS / @parity/hardhat-polkadot |
| 前端 | React 18 + Vite + TypeScript + Tailwind CSS v4 + viem v2 |
| 状态管理 | Zustand + React Query |
| 多语言 | English / 中文 / Français / Русский / Español / العربية |

---

## 📋 已部署合约（PAS 测试网 · Chain ID `420420417`）

| 合约 | 地址 |
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

## 🚀 快速开始

```bash
# 合约
cd contracts && npm install
npx hardhat compile

# 前端
cd frontend && npm install
npm run dev        # http://localhost:5173
```

> CI/CD 流水线、测试结果与部署工作流均通过 **GitHub Actions** 管理：
> 👉 [查看 Actions](https://github.com/easyshellworld/polkaink/actions)

---

## 📦 项目结构

```
contracts/
  contracts/              # 8 个 Solidity 合约（UUPS 代理）
  scripts/deploy/         # 编号部署脚本 + deploy_all.ts
  test/                   # 单元测试 + 集成测试（64 项通过）
frontend/
  src/pages/              # Home、Library、Document、Create、Propose、Governance
  src/hooks/              # useDocuments、useProposals、useVote、useMarkdownContent 等
  src/lib/contracts/      # 多合约 ABI + 地址
  public/locales/         # en, zh, fr, ru, es, ar
skills/
  polkaink_agent_skill.md # AI Agent 可直接调用的技能文件
docs/
  dev_doc.md              # 设计规范文档
  dev_log.md              # 开发日志
```

---

## 🗺️ 路线图

| 阶段 | 目标 |
|---|---|
| **Phase 0** | 合约架构 · PAS 测试网上线 · Treasury 申请 |
| **Phase 1** | 主网上线 · Markdown 浏览器 · Calldata 验证工具 |
| **Phase 2** | DAO + NFT 奖励 · 100 位创世历史作者 |
| **Phase 3** | 开放 API · AI 摘要支持 · 与 Subscan 互通 |
| **Phase 4** | Kusama 扩展 · 多 Parachain 历史档案 |

---

## 🤝 参与贡献

我们欢迎一切形式的贡献：

- 🐛 提交问题反馈
- 💡 提出新功能建议
- 📝 改进项目文档
- 🔧 提交代码修复
- 🌐 翻译文档

---

## 📄 许可证

MIT 许可证 — 开源，永久。

---

## 📞 联系方式

- **代码仓库**: [github.com/easyshellworld/polkaink](https://github.com/easyshellworld/polkaink)
- **问题反馈**: [github.com/easyshellworld/polkaink/issues](https://github.com/easyshellworld/polkaink/issues)
- **Agent 技能文件**: [`skills/polkaink_agent_skill.md`](skills/polkaink_agent_skill.md)

---

**由 PolkaClaw 构建** — *把我们的历史写进链上，让记忆无法被删除。* 🦑✨
