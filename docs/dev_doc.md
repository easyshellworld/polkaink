# ◎ PolkaInk — 项目设计书

**On-Chain Polkadot History Preservation Protocol**
*Version 1.0 · Draft · 2026-02*

---

## 目录

- [1. 项目概述](#1-项目概述)
- [2. 技术架构总览](#2-技术架构总览)
- [3. 智能合约架构](#3-智能合约架构)
  - [3.1 合约模块总览](#31-合约模块总览)
  - [3.2 Hardhat 项目结构](#32-hardhat-项目结构)
  - [3.3 Hardhat 配置](#33-hardhat-配置)
  - [3.4 完整 ABI 接口定义](#34-完整-abi-接口定义)
    - [3.4.1 IPolkaInkRegistry](#341-ipolkainkregistry)
    - [3.4.2 IVersionStore](#342-iversionstore)
    - [3.4.3 IGovernanceCore](#343-igovernancecore)
    - [3.4.4 IArchiveCouncil](#344-iarchivecouncil)
    - [3.4.5 INFTReward](#345-inftreward)
    - [3.4.6 ITreasury](#346-itreasury)
  - [3.5 合约间调用关系](#35-合约间调用关系)
  - [3.6 DAO 共识升级流程](#36-dao-共识升级流程)
  - [3.7 事件（Events）汇总](#37-事件events汇总)
  - [3.8 错误码（Custom Errors）汇总](#38-错误码custom-errors汇总)
- [4. Revive 执行环境说明](#4-revive-执行环境说明)
- [5. Calldata 存储机制](#5-calldata-存储机制)
- [6. 治理机制设计](#6-治理机制设计)
- [7. Archive Council（伦理守护委员会）](#7-archive-council伦理守护委员会)
- [8. NFT 系统设计](#8-nft-系统设计)
- [9. 经济模型](#9-经济模型)
- [10. 前端设计](#10-前端设计)
  - [10.1 技术选型](#101-技术选型)
  - [10.2 配色方案](#102-配色方案)
  - [10.3 前端目录结构](#103-前端目录结构)
  - [10.4 页面设计规范](#104-页面设计规范)
  - [10.5 国际化（i18n）](#105-国际化i18n)
  - [10.6 移动端适配](#106-移动端适配)
- [11. 安全设计](#11-安全设计)
- [12. 测试策略](#12-测试策略)
- [13. 部署流程](#13-部署流程)
- [14. 项目路线图](#14-项目路线图)
- [15. 风险分析与缓解](#15-风险分析与缓解)
- [16. 长期愿景](#16-长期愿景)
- [附录 A：完整 ABI JSON](#附录-a完整-abi-json)

---

## 1. 项目概述

### 1.1 定位

**PolkaInk** 是完全运行在 Polkadot Asset Hub 区块链上的开放历史记录协议。它以交易 calldata 为存储媒介，将 Polkadot 生态的历史文档（Markdown 格式）直接写入链上，通过智能合约管理版本树，通过 DAO 投票确保内容共识，并由 Archive Council（7人伦理守护委员会）提供底线保障。

> 类比：**链上维基百科（On-chain Wikipedia for Polkadot）**

### 1.2 核心目标

| 目标 | 说明 |
|------|------|
| 📜 数据永久性 | Markdown 内容以 calldata 写入区块链，不可篡改，无需 DB |
| 🧠 版本管理 | 智能合约维护文档版本树，支持分叉、合并、回滚 |
| 🗳️ DAO 治理 | DOT 持币 + NFT 权重投票，60% 赞成 + 5% 参与率通过 |
| 🛡️ 伦理保障 | Archive Council 7 人仅有 veto 权，不能主动决定内容 |
| 💰 可持续激励 | Polkadot Treasury Grant + NFT + DAO Treasury 多元资金 |
| 🌐 去中心化前端 | IPFS 主托管 + GitHub Pages 镜像，任何人可自部署 |

### 1.3 与现有方案差异

| 维度 | GitHub / 论坛 | Polkadot 官方文档 | PolkaInk |
|------|:---:|:---:|:---:|
| 不可篡改 | ❌ | ❌ | ✅ |
| DAO 共识 | ❌ | ❌ | ✅ |
| 版本历史 | ✅ | ✅ | ✅ |
| 社区历史视角 | 分散 | 官方视角 | 社区共识 |
| 长期存续 | 依赖平台 | 依赖组织 | 链上永久 |
| 开放 API | 有限 | 有限 | ✅ 开放 |

---

## 2. 技术架构总览

### 2.1 技术栈

| 层级 | 选型 | 说明 |
|------|------|------|
| 区块链 | Polkadot Asset Hub（Polkadot Hub） | pallet-revive + REVM/PolkaVM |
| 合约语言 | Solidity 0.8.28 | EVM 兼容，Hardhat + @parity/hardhat-polkadot |
| 合约升级 | UUPS Proxy（OpenZeppelin） | DAO 投票 + TimelockController 授权 |
| 前端框架 | React 18 + Vite 5 + TypeScript | SPA，Hash Router（兼容 IPFS） |
| 样式 | Tailwind CSS v4 | Mobile-first，自定义 Polkadot Design Token |
| 状态管理 | Zustand + React Query | 全局状态 + 链数据缓存 |
| 国际化 | i18next + react-i18next | zh-CN / en / kr |
| 钱包连接 | Polkadot.js Extension + wagmi + RainbowKit | 兼容 MetaMask Mobile |
| Markdown | react-markdown + remark-gfm + shiki | 代码高亮 |
| 链上索引 | Subsquid（或自建） | 事件索引，用于前端快速查询 |
| 前端托管 | IPFS（主）+ GitHub Pages（镜像） | 去中心化，任何人可验证 |

### 2.2 开发规范

> ⚠️ **All code, comments, variable names, and commit messages MUST be written in English throughout the entire development process.**

| 规范 | 说明 |
|------|------|
| 代码语言 | 所有代码（合约 + 前端）必须使用 **英文**，包括注释、变量名、函数名、commit message |
| 开发网络 | **PAS（Polkadot Hub Testnet / Paseo Asset Hub）** 作为主要开发测试网络 |
| 交付结构 | 开发阶段围绕 **两个主文件** 展开：一个智能合约（Solidity）+ 一个前端应用（React） |
| Hardhat 插件 | 使用 `@parity/hardhat-polkadot` 插件，确保 Polkadot Hub 兼容性 |

### 2.3 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PolkaInk System Architecture                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                  React + Vite Frontend (SPA)                        │  │
│  │  i18n(zh/en/kr) │ Mobile-first │ IPFS 托管 │ GitHub Pages 镜像     │  │
│  └──────────────────────────────┬─────────────────────────────────────┘  │
│                                 │ Wallet Sign                             │
│                    Polkadot.js Extension / MetaMask / wagmi               │
│                                 ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                 Polkadot Hub — Asset Hub                            │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │               Revive 执行层（pallet-revive）                  │  │  │
│  │  │  ┌───────────────────────┐  ┌──────────────────────────────┐ │  │  │
│  │  │  │  REVM（EVM compat）   │  │  PolkaVM / PVM（RISC-V）     │ │  │  │
│  │  │  │  Hardhat 100% 兼容    │  │  resolc 编译（未来可选）      │ │  │  │
│  │  │  └──────────┬────────────┘  └──────────────────────────────┘ │  │  │
│  │  └─────────────┼────────────────────────────────────────────────┘  │  │
│  │                │  Smart Contracts（Solidity 0.8.24）                │  │
│  │  ┌─────────────▼──────────────────────────────────────────────┐    │  │
│  │  │                                                              │    │  │
│  │  │  PolkaInkRegistry  ←───→  VersionStore                     │    │  │
│  │  │         ↕                      ↕                            │    │  │
│  │  │  GovernanceCore   ←───→  ArchiveCouncil                    │    │  │
│  │  │         ↕                      ↕                            │    │  │
│  │  │  TimelockController ──→  ProxyAdmin (UUPS)                 │    │  │
│  │  │         ↕                                                    │    │  │
│  │  │  NFTReward         ←───→  Treasury                          │    │  │
│  │  │                                                              │    │  │
│  │  └──────────────────────────────────────────────────────────────┘    │  │
│  │           Transaction calldata = Markdown content                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                │ Events                                   │
│                                ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │         Subsquid 索引节点（只读，无链上权限）                       │  │
│  │         提供 GraphQL API → 前端快速查询                             │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 智能合约架构

### 3.1 合约模块总览

| 合约 | 职责 | 升级性 | 依赖 |
|------|------|--------|------|
| `PolkaInkRegistry` | 核心注册表：文档生命周期管理 | UUPS 可升级 | VersionStore, GovernanceCore, NFTReward |
| `VersionStore` | calldata Markdown 版本存储与索引 | UUPS 可升级 | PolkaInkRegistry |
| `GovernanceCore` | DOT/NFT 权重投票、提案生命周期 | UUPS 可升级 | ArchiveCouncil, TimelockController, NFTReward |
| `ArchiveCouncil` | 7 人委员会 veto 逻辑与成员管理 | UUPS 可升级 | GovernanceCore, NFTReward |
| `TimelockController` | 治理延时执行（48h），防治理攻击 | **不可升级**（安全锚） | GovernanceCore |
| `NFTReward` | Author NFT + Guardian NFT（ERC-721） | UUPS 可升级 | PolkaInkRegistry, ArchiveCouncil |
| `Treasury` | DAO 资金池管理、奖励分发 | UUPS 可升级 | GovernanceCore, NFTReward |
| `ProxyAdmin` | UUPS 代理管理入口 | **不可升级** | TimelockController |

### 3.2 Hardhat 项目结构

> **📌 开发阶段简化说明：** 实际开发围绕 **两个主文件** 展开：
> 1. **一个智能合约文件**（`contracts/PolkaInk.sol`）— 包含核心链上逻辑
> 2. **一个前端应用文件**（`frontend/`）— React SPA，与合约交互
>
> 以下完整结构为长期架构设计参考，开发阶段按需逐步拆分。

```
polkaink-contracts/
├── contracts/
│   ├── core/
│   │   ├── PolkaInkRegistry.sol          # 核心注册表（UUPS）
│   │   ├── VersionStore.sol               # 版本存储（UUPS）
│   │   └── interfaces/
│   │       ├── IPolkaInkRegistry.sol
│   │       └── IVersionStore.sol
│   ├── governance/
│   │   ├── GovernanceCore.sol             # 投票治理（UUPS）
│   │   ├── ArchiveCouncil.sol             # 7 人委员会（UUPS）
│   │   ├── TimelockController.sol         # 延时控制器（不可升级）
│   │   └── interfaces/
│   │       ├── IGovernanceCore.sol
│   │       └── IArchiveCouncil.sol
│   ├── token/
│   │   ├── NFTReward.sol                  # ERC-721 双类型 NFT（UUPS）
│   │   └── interfaces/
│   │       └── INFTReward.sol
│   ├── finance/
│   │   ├── Treasury.sol                   # 资金池（UUPS）
│   │   └── interfaces/
│   │       └── ITreasury.sol
│   ├── proxy/
│   │   └── ProxyAdmin.sol                 # UUPS 代理管理（不可升级）
│   └── libraries/
│       ├── CalldataLib.sol                # calldata 编解码工具
│       ├── VotingMath.sol                 # 投票权重计算
│       └── VersionTree.sol               # 版本树操作工具
├── scripts/
│   ├── deploy/
│   │   ├── 01_deploy_proxy_admin.ts
│   │   ├── 02_deploy_timelock.ts
│   │   ├── 03_deploy_nft.ts
│   │   ├── 04_deploy_version_store.ts
│   │   ├── 05_deploy_registry.ts
│   │   ├── 06_deploy_council.ts
│   │   ├── 07_deploy_governance.ts
│   │   ├── 08_deploy_treasury.ts
│   │   └── 09_setup_roles.ts             # 初始化角色权限
│   ├── upgrade/
│   │   ├── propose_upgrade.ts            # 提交升级提案
│   │   └── execute_upgrade.ts            # Timelock 到期后执行
│   └── verify.ts                         # 合约验证（Asset Hub explorer）
├── test/
│   ├── unit/
│   │   ├── registry.test.ts
│   │   ├── versionStore.test.ts
│   │   ├── governance.test.ts
│   │   ├── council.test.ts
│   │   ├── nft.test.ts
│   │   └── treasury.test.ts
│   ├── integration/
│   │   ├── fullProposalFlow.test.ts      # 完整提案→投票→执行流程
│   │   ├── upgradeFlow.test.ts           # 升级流程测试
│   │   └── vetoFlow.test.ts              # Veto 流程测试
│   └── fixtures/
│       └── deployFixture.ts
├── hardhat.config.ts
├── .env.example
├── tsconfig.json
└── package.json
```

### 3.3 Hardhat 配置

```typescript
// hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@parity/hardhat-polkadot";
import "dotenv/config";

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    // Local development (anvil-polkadot)
    // Start with: npx hardhat node
    hardhat: {
      polkadot: true,
      nodeConfig: {
        useAnviL: true,
        nodeBinaryPath: "./bin/anvil-polkadot",
      },
    },
    // PAS — Polkadot Hub Testnet (Paseo Asset Hub) — PRIMARY DEV NETWORK
    // Faucet: https://faucet.polkadot.io/?parachain=1111
    // EVM Explorer: https://blockscout-passet-hub.parity-testnet.parity.io/
    // Substrate Explorer: https://assethub-paseo.subscan.io/
    polkadotHubTestnet: {
      polkadot: true,
      url: process.env.PAS_RPC_URL ||
           "https://services.polkadothub-rpc.com/testnet",
      chainId: 420420422,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    // Westend Asset Hub — Internal Parity Testnet (secondary)
    // Faucet: https://faucet.polkadot.io/westend
    // EVM Explorer: https://blockscout-asset-hub.parity-chains-scw.parity.io/
    // Substrate Explorer: https://assethub-westend.subscan.io/
    westendHub: {
      polkadot: true,
      url: process.env.WESTEND_HUB_RPC_URL ||
           "https://westend-asset-hub-eth-rpc.polkadot.io",
      chainId: 420420421,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    // Kusama Asset Hub — Live Network (future production)
    // EVM Explorer: https://blockscout-kusama-asset-hub.parity-chains-scw.parity.io/
    // Substrate Explorer: https://assethub-kusama.subscan.io/
    kusamaHub: {
      polkadot: true,
      url: "https://kusama-asset-hub-eth-rpc.polkadot.io",
      chainId: 420420418,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      polkadotHubTestnet: process.env.EXPLORER_API_KEY || "no-api-key",
    },
    customChains: [
      {
        network: "polkadotHubTestnet",
        chainId: 420420422,
        urls: {
          apiURL: "https://blockscout-passet-hub.parity-testnet.parity.io/api",
          browserURL: "https://blockscout-passet-hub.parity-testnet.parity.io",
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },
};

export default config;
```

> **📌 开发阶段默认使用 `polkadotHubTestnet`（PAS）网络。** 部署命令示例：
> ```bash
> npx hardhat run scripts/deploy.ts --network polkadotHubTestnet
> ```
> 获取测试代币：https://faucet.polkadot.io/?parachain=1111

---

### 3.4 完整 ABI 接口定义

#### 3.4.1 IPolkaInkRegistry

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IPolkaInkRegistry
/// @notice 核心文档注册表接口：管理文档生命周期和版本树
interface IPolkaInkRegistry {

    // ─── 数据结构 ─────────────────────────────────────────────────────────

    enum DocumentStatus { Active, Archived, Disputed }

    struct Document {
        uint256 id;                  // 文档唯一 ID（自增）
        string  title;               // 文档标题
        address author;              // 初始作者地址
        uint256 currentVersionId;    // 当前正式版本 ID（指向 VersionStore）
        uint256 createdAt;           // 创建时间戳
        uint256 updatedAt;           // 最后更新时间戳
        DocumentStatus status;       // 文档状态
        string[] tags;               // 标签列表（最多 10 个）
    }

    // ─── 写操作 ───────────────────────────────────────────────────────────

    /// @notice 创建新文档（入口，发起初始版本提案）
    /// @param title 文档标题（1~200 字节）
    /// @param tags 文档标签（最多 10 个，每个最多 32 字节）
    /// @return docId 新建文档 ID
    function createDocument(
        string calldata title,
        string[] calldata tags
    ) external returns (uint256 docId);

    /// @notice 提交版本修改提案（Markdown 内容写入 calldata）
    /// @param docId 目标文档 ID
    /// @param parentVersionId 父版本 ID（基于哪个版本修改）
    /// @param contentHash Markdown 内容的 sha256 哈希（完整性校验）
    /// @param markdownCalldata gzip 压缩后的 Markdown 内容（calldata）
    /// @return proposalId 提案 ID（由 GovernanceCore 分配）
    /// @dev 调用方需同时质押 DOT（msg.value），最低质押额由 GovernanceCore 决定
    function proposeVersion(
        uint256 docId,
        uint256 parentVersionId,
        bytes32 contentHash,
        bytes calldata markdownCalldata
    ) external payable returns (uint256 proposalId);

    /// @notice 合并通过的提案（仅 GovernanceCore 可调用）
    /// @param proposalId 已通过的提案 ID
    /// @dev TimelockController 延时到期后由 GovernanceCore 触发
    function mergeProposal(uint256 proposalId) external;

    /// @notice 归档文档（需 DAO 治理提案通过）
    /// @param docId 文档 ID
    function archiveDocument(uint256 docId) external;

    /// @notice 更新文档标签（需 DAO 提案或文档作者 + 社区快速投票）
    /// @param docId 文档 ID
    /// @param newTags 新标签列表
    function updateTags(uint256 docId, string[] calldata newTags) external;

    // ─── 读操作 ───────────────────────────────────────────────────────────

    /// @notice 查询文档信息
    function getDocument(uint256 docId) external view returns (Document memory);

    /// @notice 查询文档总数
    function totalDocuments() external view returns (uint256);

    /// @notice 查询指定文档的所有版本 ID 列表
    function getVersionHistory(uint256 docId) external view returns (uint256[] memory);

    /// @notice 分页查询所有文档
    /// @param offset 起始偏移
    /// @param limit 每页数量（最大 50）
    function listDocuments(
        uint256 offset,
        uint256 limit
    ) external view returns (Document[] memory docs, uint256 total);

    /// @notice 按标签查询文档（链上暴力枚举，建议通过索引节点查询）
    function listDocumentsByTag(
        string calldata tag,
        uint256 offset,
        uint256 limit
    ) external view returns (Document[] memory docs, uint256 total);

    // ─── 事件 ─────────────────────────────────────────────────────────────

    event DocumentCreated(
        uint256 indexed docId,
        address indexed author,
        string title,
        string[] tags,
        uint256 timestamp
    );

    event VersionProposed(
        uint256 indexed proposalId,
        uint256 indexed docId,
        address indexed proposer,
        uint256 parentVersionId,
        bytes32 contentHash,
        uint256 stakeAmount
    );

    event VersionMerged(
        uint256 indexed proposalId,
        uint256 indexed docId,
        uint256 indexed newVersionId,
        address author,
        uint256 timestamp
    );

    event DocumentArchived(
        uint256 indexed docId,
        uint256 timestamp
    );

    event TagsUpdated(
        uint256 indexed docId,
        string[] oldTags,
        string[] newTags
    );
}
```

#### 3.4.2 IVersionStore

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IVersionStore
/// @notice 文档版本存储接口：管理版本树与 calldata 索引
interface IVersionStore {

    // ─── 数据结构 ─────────────────────────────────────────────────────────

    enum CompressionType { None, Gzip, Zstd }

    struct Version {
        uint256 id;                  // 版本 ID（全局自增）
        uint256 docId;               // 所属文档 ID
        uint256 parentVersionId;     // 父版本 ID（0 表示初始版本）
        address author;              // 版本作者地址
        bytes32 contentHash;         // Markdown 内容 sha256 哈希
        uint256 calldataTxHash;      // 存储 Markdown calldata 的交易哈希（bytes32 截断）
        uint256 blockNumber;         // 写入时的区块号
        uint256 timestamp;           // 写入时间戳
        CompressionType compression; // 内容压缩方式
        uint32 contentLength;        // 压缩前原始内容字节长度
        bool isSharded;              // 是否分片存储
        uint8 shardCount;            // 分片数量（isSharded = true 时有效）
    }

    struct Shard {
        uint256 versionId;           // 所属版本 ID
        uint8 shardIndex;            // 分片索引（从 0 开始）
        bytes32 shardHash;           // 分片内容哈希
        uint256 calldataTxHash;      // 分片交易哈希
    }

    // ─── 写操作 ───────────────────────────────────────────────────────────

    /// @notice 存储新版本（仅 PolkaInkRegistry 可调用）
    /// @param docId 文档 ID
    /// @param parentVersionId 父版本 ID
    /// @param author 作者地址
    /// @param contentHash 内容哈希
    /// @param compression 压缩类型
    /// @param contentLength 原始内容长度
    /// @return versionId 新版本 ID
    function storeVersion(
        uint256 docId,
        uint256 parentVersionId,
        address author,
        bytes32 contentHash,
        CompressionType compression,
        uint32 contentLength
    ) external returns (uint256 versionId);

    /// @notice 为版本追加分片信息（分片提交场景）
    /// @param versionId 版本 ID
    /// @param shardIndex 分片索引
    /// @param shardHash 分片哈希
    /// @param calldataTxHash 分片交易哈希
    function appendShard(
        uint256 versionId,
        uint8 shardIndex,
        bytes32 shardHash,
        uint256 calldataTxHash
    ) external;

    // ─── 读操作 ───────────────────────────────────────────────────────────

    /// @notice 查询版本信息
    function getVersion(uint256 versionId) external view returns (Version memory);

    /// @notice 查询版本的所有分片信息
    function getShards(uint256 versionId) external view returns (Shard[] memory);

    /// @notice 获取版本的所有父链（版本祖先列表，从当前到根）
    function getAncestors(uint256 versionId) external view returns (uint256[] memory);

    /// @notice 获取某文档某版本的所有子版本（分叉）
    function getChildren(uint256 versionId) external view returns (uint256[] memory);

    /// @notice 获取文档当前正式版本 ID
    function getCurrentVersion(uint256 docId) external view returns (uint256);

    /// @notice 获取文档的完整版本 DAG（有向无环图）
    /// @return versionIds 所有版本 ID 列表（按创建时间排序）
    /// @return parentIds 对应的父版本 ID 列表
    function getVersionDAG(
        uint256 docId
    ) external view returns (uint256[] memory versionIds, uint256[] memory parentIds);

    /// @notice 总版本数
    function totalVersions() external view returns (uint256);

    // ─── 事件 ─────────────────────────────────────────────────────────────

    event VersionStored(
        uint256 indexed versionId,
        uint256 indexed docId,
        uint256 indexed parentVersionId,
        address author,
        bytes32 contentHash,
        uint256 blockNumber
    );

    event ShardAppended(
        uint256 indexed versionId,
        uint8 shardIndex,
        bytes32 shardHash
    );
}
```

#### 3.4.3 IGovernanceCore

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IGovernanceCore
/// @notice 治理投票核心接口：管理提案生命周期与投票权重计算
interface IGovernanceCore {

    // ─── 数据结构 ─────────────────────────────────────────────────────────

    enum ProposalType {
        VersionUpdate,     // 普通文档版本更新
        UpgradeContract,   // 合约升级
        ParameterChange,   // 治理参数调整
        CouncilElection,   // Archive Council 选举
        EmergencyVeto,     // 紧急 veto（由 Archive Council 发起）
        TreasurySpend      // Treasury 资金支出
    }

    enum ProposalStatus {
        Pending,           // 已提交，等待投票开始
        Active,            // 投票进行中
        Passed,            // 投票通过，等待 Archive Council 审查
        TimelockQueued,    // 进入 TimelockController 队列
        Executed,          // 已执行
        Rejected,          // 投票否决
        Vetoed,            // Archive Council veto
        Cancelled,         // 提案人取消（仅 Pending 状态可取消）
        Expired            // 超过最长等待期，自动过期
    }

    struct Proposal {
        uint256 id;                  // 提案 ID（全局自增）
        ProposalType proposalType;   // 提案类型
        address proposer;            // 提案人地址
        uint256 docId;               // 关联文档 ID（非文档类提案为 0）
        uint256 targetVersionId;     // 目标版本 ID（VersionUpdate 类型）
        uint256 stakeAmount;         // 质押 DOT 数量（wei）
        uint256 yesVotes;            // 赞成票权重总和
        uint256 noVotes;             // 反对票权重总和
        uint256 abstainVotes;        // 弃权票权重总和
        uint256 totalVotingPower;    // 已参与投票的总权重
        uint256 snapshotBlock;       // 投票权重快照区块号
        uint256 startTime;           // 投票开始时间
        uint256 endTime;             // 投票结束时间（默认 7 天）
        ProposalStatus status;
        bytes callData;              // 提案执行的 calldata（升级/参数变更类）
        string description;          // 提案说明（IPFS 链接或简短描述）
        bytes32 timelockId;          // TimelockController 中的操作 ID
    }

    struct VoteRecord {
        bool hasVoted;
        bool support;                // true=赞成，false=反对（abstain 单独标记）
        bool abstain;
        uint256 votingPower;         // 投票时的有效权重
        uint256 timestamp;
    }

    // ─── 治理参数（可通过 ParameterChange 提案修改） ─────────────────────

    struct GovernanceParams {
        uint256 minStake;            // 最低质押额（默认 5 DOT = 5e12 planck）
        uint256 votingPeriod;        // 投票周期（默认 7 天，秒）
        uint256 timelockDelay;       // Timelock 延时（默认 48 小时，秒）
        uint256 quorumNumerator;     // 参与率分子（默认 5，即 5%）
        uint256 passingThreshold;    // 通过率（默认 60，即 60%）
        uint256 superMajority;       // 超级多数（用于反 veto，默认 80%）
        uint256 nftVoteMultiplier;   // Author NFT 投票倍数（默认 150，即 1.5x，基数 100）
        uint256 guardianVoteMultiplier; // Guardian NFT 投票倍数（默认 200，即 2x）
        uint256 slashRatioNormal;    // 普通否决扣罚比例（默认 30%，基数 100）
        uint256 slashRatioVeto;      // Veto 扣罚比例（默认 50%）
        uint256 maxTagsPerDoc;       // 每文档最大标签数（默认 10）
        uint256 lockBonus30d;        // 30 天锁仓投票加成（120 = 1.2x）
        uint256 lockBonus90d;        // 90 天锁仓投票加成（150 = 1.5x）
        uint256 lockBonus180d;       // 180 天锁仓投票加成（200 = 2x）
    }

    // ─── 写操作 ───────────────────────────────────────────────────────────

    /// @notice 创建提案（通用入口）
    /// @param proposalType 提案类型
    /// @param docId 关联文档 ID（非文档提案传 0）
    /// @param targetVersionId 目标版本 ID（非 VersionUpdate 传 0）
    /// @param callData 执行 calldata（VersionUpdate 类传空）
    /// @param description 提案描述（最多 500 字节，或 IPFS CID）
    /// @return proposalId 提案 ID
    function createProposal(
        ProposalType proposalType,
        uint256 docId,
        uint256 targetVersionId,
        bytes calldata callData,
        string calldata description
    ) external payable returns (uint256 proposalId);

    /// @notice 对提案投票
    /// @param proposalId 提案 ID
    /// @param support true=赞成，false=反对
    /// @param abstain 是否弃权（abstain=true 时 support 参数忽略）
    /// @param lockDays 锁仓天数（0/30/90/180），用于获得投票加成，需提前批准 token 转移
    function vote(
        uint256 proposalId,
        bool support,
        bool abstain,
        uint256 lockDays
    ) external;

    /// @notice 取消提案（仅提案人可操作，仅限 Pending 状态）
    function cancelProposal(uint256 proposalId) external;

    /// @notice 排队执行（投票通过且无 veto 后，将提案提交到 TimelockController）
    function queueProposal(uint256 proposalId) external;

    /// @notice 执行提案（TimelockController 到期后调用）
    function executeProposal(uint256 proposalId) external;

    /// @notice 提交合约升级提案（UpgradeContract 类型的快捷方法）
    /// @param contractName 合约名称（如 "PolkaInkRegistry"）
    /// @param newImplementation 新实现合约地址
    /// @param description 升级说明
    function proposeUpgrade(
        string calldata contractName,
        address newImplementation,
        string calldata description
    ) external payable returns (uint256 proposalId);

    // ─── 读操作 ───────────────────────────────────────────────────────────

    /// @notice 查询提案信息
    function getProposal(uint256 proposalId) external view returns (Proposal memory);

    /// @notice 查询提案状态
    function getProposalStatus(uint256 proposalId) external view returns (ProposalStatus);

    /// @notice 查询用户对某提案的投票记录
    function getVoteRecord(
        uint256 proposalId,
        address voter
    ) external view returns (VoteRecord memory);

    /// @notice 计算用户当前投票权重（含 NFT 加成 + 锁仓加成）
    /// @param voter 投票人地址
    /// @param snapshotBlock 快照区块
    function getVotingPower(
        address voter,
        uint256 snapshotBlock
    ) external view returns (uint256 power);

    /// @notice 查询当前治理参数
    function getGovernanceParams() external view returns (GovernanceParams memory);

    /// @notice 查询提案总数
    function totalProposals() external view returns (uint256);

    /// @notice 分页查询提案（可按状态过滤）
    function listProposals(
        ProposalStatus statusFilter,
        uint256 offset,
        uint256 limit
    ) external view returns (Proposal[] memory proposals, uint256 total);

    /// @notice 检查提案是否达到通过条件（不改变状态）
    function checkPassed(uint256 proposalId) external view returns (bool passed, string memory reason);

    // ─── 事件 ─────────────────────────────────────────────────────────────

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        ProposalType proposalType,
        uint256 indexed docId,
        uint256 stakeAmount,
        uint256 startTime,
        uint256 endTime
    );

    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        bool abstain,
        uint256 votingPower,
        uint256 lockDays
    );

    event ProposalQueued(
        uint256 indexed proposalId,
        bytes32 timelockId,
        uint256 executeAfter
    );

    event ProposalExecuted(
        uint256 indexed proposalId,
        uint256 timestamp
    );

    event ProposalRejected(
        uint256 indexed proposalId,
        uint256 yesVotes,
        uint256 noVotes,
        uint256 totalVotingPower
    );

    event ProposalCancelled(
        uint256 indexed proposalId,
        address cancelledBy
    );

    event StakeSlashed(
        uint256 indexed proposalId,
        address indexed proposer,
        uint256 slashedAmount,
        string reason
    );

    event GovernanceParamsUpdated(
        GovernanceParams oldParams,
        GovernanceParams newParams
    );
}
```

#### 3.4.4 IArchiveCouncil

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IArchiveCouncil
/// @notice Archive Council（7人伦理守护委员会）接口
/// @dev 委员会仅有 veto 权，不能主动决定任何内容
interface IArchiveCouncil {

    // ─── 数据结构 ─────────────────────────────────────────────────────────

    enum CouncilMemberStatus { Active, Suspended, Resigned, Removed, Expired }

    struct CouncilMember {
        address memberAddress;
        uint256 guardianNFTId;       // 绑定的 Guardian NFT ID
        uint256 termStart;           // 任期开始时间戳
        uint256 termEnd;             // 任期结束时间戳（termStart + 6 个月）
        uint256 vetoCount;           // 累计行使 veto 次数
        CouncilMemberStatus status;
    }

    struct VetoRecord {
        uint256 proposalId;          // 被 veto 的提案 ID
        address[] vetoers;           // 行使 veto 的委员地址列表
        string reason;               // veto 理由（需链上记录）
        uint256 timestamp;
    }

    struct Election {
        uint256 id;
        uint256 startTime;
        uint256 endTime;             // 选举投票截止时间（7 天）
        address[] candidates;
        bool executed;               // 是否已执行结果
    }

    // ─── 写操作 ───────────────────────────────────────────────────────────

    /// @notice 委员对提案行使 veto（仅 Active 委员可调用）
    /// @param proposalId 提案 ID（必须处于 Passed 或 TimelockQueued 状态）
    /// @param reason veto 理由（最多 500 字节，链上永久记录）
    function veto(uint256 proposalId, string calldata reason) external;

    /// @notice 委员明确放行提案（可选操作，加速跳过审查期）
    /// @param proposalId 提案 ID
    function approve(uint256 proposalId) external;

    /// @notice 发起 Archive Council 选举（任何人可在任期临近结束时发起）
    /// @param candidates 候选人地址列表（需满足资格要求）
    /// @return electionId 选举 ID
    function initiateElection(address[] calldata candidates) external returns (uint256 electionId);

    /// @notice 对选举候选人投票（DOT 持有者 + Author NFT 持有者参与）
    /// @param electionId 选举 ID
    /// @param candidate 投票支持的候选人地址
    function voteInElection(uint256 electionId, address candidate) external;

    /// @notice 执行选举结果（选举结束后任何人可调用）
    /// @param electionId 选举 ID
    function executeElection(uint256 electionId) external;

    /// @notice 委员主动辞职
    function resign() external;

    // ─── DAO 操控（通过 GovernanceCore 治理提案调用） ─────────────────────

    /// @notice 罢免委员（需 DAO 75% 超级多数提案通过）
    /// @param member 被罢免委员地址
    /// @param reason 罢免原因
    function removeMember(address member, string calldata reason) external;

    /// @notice 委员紧急暂停（GovernanceCore 在委员严重违规时可调用）
    function suspendMember(address member) external;

    // ─── 读操作 ───────────────────────────────────────────────────────────

    /// @notice 查询所有当前委员信息
    function getCouncilMembers() external view returns (CouncilMember[] memory);

    /// @notice 查询某地址是否为 Active 委员
    function isActiveMember(address addr) external view returns (bool);

    /// @notice 查询提案的 veto 状态
    /// @return vetoCount 当前 veto 委员数量
    /// @return vetoed 是否已达 veto 门槛（4/7）
    function getVetoStatus(
        uint256 proposalId
    ) external view returns (uint256 vetoCount, bool vetoed);

    /// @notice 查询提案的 veto 详情
    function getVetoRecord(uint256 proposalId) external view returns (VetoRecord memory);

    /// @notice 查询选举信息
    function getElection(uint256 electionId) external view returns (Election memory);

    /// @notice 查询选举候选人当前得票数
    function getElectionVotes(
        uint256 electionId,
        address candidate
    ) external view returns (uint256 votes);

    /// @notice 当前 veto 门槛（委员总数的 4/7，向上取整）
    function vetoThreshold() external view returns (uint256);

    // ─── 事件 ─────────────────────────────────────────────────────────────

    event VetoCast(
        uint256 indexed proposalId,
        address indexed member,
        string reason,
        uint256 currentVetoCount,
        uint256 threshold
    );

    event ProposalVetoed(
        uint256 indexed proposalId,
        address[] vetoers,
        string reason,
        uint256 timestamp
    );

    event ProposalApproved(
        uint256 indexed proposalId,
        address indexed member
    );

    event ElectionInitiated(
        uint256 indexed electionId,
        address[] candidates,
        uint256 startTime,
        uint256 endTime
    );

    event ElectionVoteCast(
        uint256 indexed electionId,
        address indexed voter,
        address indexed candidate,
        uint256 votingPower
    );

    event ElectionExecuted(
        uint256 indexed electionId,
        address[] newMembers
    );

    event MemberRemoved(
        address indexed member,
        string reason,
        uint256 timestamp
    );

    event MemberResigned(
        address indexed member,
        uint256 timestamp
    );
}
```

#### 3.4.5 INFTReward

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title INFTReward
/// @notice 双类型 NFT 系统接口：Author NFT（历史作者）+ Guardian NFT（委员会成员）
interface INFTReward {

    // ─── 数据结构 ─────────────────────────────────────────────────────────

    enum NFTType { Author, Guardian }

    struct NFTMetadata {
        uint256 tokenId;
        NFTType nftType;
        address recipient;
        uint256 mintedAt;
        uint256 linkedProposalId;    // Author NFT：关联的成功提案 ID
        uint256 linkedDocId;         // Author NFT：关联的文档 ID
        uint256 linkedVersionId;     // Author NFT：关联的版本 ID
        uint256 termEnd;             // Guardian NFT：任期截止（0 = Author NFT）
        bool soulbound;              // Guardian NFT 为 true（不可转让）
        bool active;                 // Guardian NFT 到期后变为 false
    }

    // ─── 写操作 ───────────────────────────────────────────────────────────

    /// @notice 铸造 Author NFT（仅 PolkaInkRegistry 在提案成功合并后调用）
    /// @param recipient 接收者地址（提案人）
    /// @param proposalId 关联提案 ID
    /// @param docId 关联文档 ID
    /// @param versionId 关联版本 ID
    /// @return tokenId 铸造的 Token ID
    function mintAuthorNFT(
        address recipient,
        uint256 proposalId,
        uint256 docId,
        uint256 versionId
    ) external returns (uint256 tokenId);

    /// @notice 铸造 Guardian NFT（仅 ArchiveCouncil 在选举执行后调用）
    /// @param recipient 新委员地址
    /// @param termEnd 任期截止时间戳
    /// @return tokenId 铸造的 Token ID
    function mintGuardianNFT(
        address recipient,
        uint256 termEnd
    ) external returns (uint256 tokenId);

    /// @notice 使 Guardian NFT 失效（任期结束或委员被罢免）
    /// @param tokenId Guardian NFT Token ID
    function deactivateGuardianNFT(uint256 tokenId) external;

    /// @notice 设置 Author NFT 的 Soulbound 状态（投票期间锁定）
    /// @param tokenId Author NFT Token ID
    /// @param locked true = soulbound（锁定），false = 可转让
    function setAuthorNFTLock(uint256 tokenId, bool locked) external;

    // ─── 读操作 ───────────────────────────────────────────────────────────

    /// @notice 查询 Token 元数据
    function getNFTMetadata(uint256 tokenId) external view returns (NFTMetadata memory);

    /// @notice 查询地址持有的所有 Author NFT
    function getAuthorNFTs(address holder) external view returns (uint256[] memory tokenIds);

    /// @notice 查询地址持有的所有 Active Guardian NFT
    function getGuardianNFTs(address holder) external view returns (uint256[] memory tokenIds);

    /// @notice 查询地址是否持有 Active Guardian NFT
    function hasActiveGuardianNFT(address holder) external view returns (bool);

    /// @notice 查询地址持有的 Author NFT 数量（用于投票权重计算）
    function authorNFTCount(address holder) external view returns (uint256);

    /// @notice 查询总铸造量（按类型）
    function totalMinted(NFTType nftType) external view returns (uint256);

    /// @notice tokenURI（链上生成，无需 IPFS）
    function tokenURI(uint256 tokenId) external view returns (string memory);

    // ─── 事件 ─────────────────────────────────────────────────────────────

    event AuthorNFTMinted(
        uint256 indexed tokenId,
        address indexed recipient,
        uint256 indexed proposalId,
        uint256 docId,
        uint256 versionId
    );

    event GuardianNFTMinted(
        uint256 indexed tokenId,
        address indexed recipient,
        uint256 termEnd
    );

    event GuardianNFTDeactivated(
        uint256 indexed tokenId,
        address indexed holder,
        uint256 timestamp
    );

    event AuthorNFTLockChanged(
        uint256 indexed tokenId,
        bool locked
    );
}
```

#### 3.4.6 ITreasury

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title ITreasury
/// @notice DAO 资金池接口：管理 DOT 资金的入账、分配与支出
interface ITreasury {

    // ─── 数据结构 ─────────────────────────────────────────────────────────

    enum SpendCategory {
        ProposerReward,      // 提案人奖励（70%）
        OperationalReserve,  // 运营储备（15%）
        CouncilOperations,   // Archive Council 运营（15%）
        ExternalGrant,       // DAO 批准的外部拨款
        LiquidityDeployment  // 流动性部署（需额外 DAO 授权）
    }

    struct SpendRecord {
        uint256 id;
        SpendCategory category;
        address recipient;
        uint256 amount;          // 单位：planck（DOT 最小单位）
        string description;
        uint256 proposalId;      // 关联的 DAO 提案 ID（0 = 自动奖励）
        uint256 timestamp;
        bool executed;
    }

    // ─── 写操作 ───────────────────────────────────────────────────────────

    /// @notice 接收 DOT 捐赠（任何人可调用）
    receive() external payable;

    /// @notice 自动分发提案奖励（仅 PolkaInkRegistry 在版本合并时调用）
    /// @param proposalId 提案 ID
    /// @param proposer 提案人地址
    /// @param totalReward 本次总奖励金额
    function distributeProposalReward(
        uint256 proposalId,
        address proposer,
        uint256 totalReward
    ) external;

    /// @notice 执行 DAO 批准的支出（仅 TimelockController 可调用）
    /// @param spendId 支出记录 ID
    function executeSpend(uint256 spendId) external;

    /// @notice 创建支出申请（需通过 TreasurySpend 类型 DAO 提案）
    function createSpendRequest(
        SpendCategory category,
        address recipient,
        uint256 amount,
        string calldata description,
        uint256 proposalId
    ) external returns (uint256 spendId);

    /// @notice 将 Treasury DOT 部署到流动性协议（需 DAO 特别授权）
    /// @param protocol 协议合约地址（如 Hydration DEX）
    /// @param amount 部署金额
    /// @param data 协议调用 calldata
    function deployLiquidity(
        address protocol,
        uint256 amount,
        bytes calldata data
    ) external;

    // ─── 读操作 ───────────────────────────────────────────────────────────

    /// @notice 查询 Treasury DOT 余额（planck）
    function balance() external view returns (uint256);

    /// @notice 查询支出记录
    function getSpendRecord(uint256 spendId) external view returns (SpendRecord memory);

    /// @notice 查询历史总收入和总支出
    function getTotals() external view returns (uint256 totalIncome, uint256 totalSpent);

    /// @notice 分页查询支出历史
    function listSpendRecords(
        uint256 offset,
        uint256 limit
    ) external view returns (SpendRecord[] memory records, uint256 total);

    // ─── 事件 ─────────────────────────────────────────────────────────────

    event FundsReceived(
        address indexed sender,
        uint256 amount,
        string note
    );

    event RewardDistributed(
        uint256 indexed proposalId,
        address indexed proposer,
        uint256 proposerAmount,
        uint256 treasuryRetained
    );

    event SpendExecuted(
        uint256 indexed spendId,
        SpendCategory category,
        address indexed recipient,
        uint256 amount
    );

    event LiquidityDeployed(
        address indexed protocol,
        uint256 amount,
        uint256 timestamp
    );
}
```

---

### 3.5 合约间调用关系

```
调用关系图（→ 表示"可以调用"）：

用户
 ├─→ PolkaInkRegistry.createDocument()
 ├─→ PolkaInkRegistry.proposeVersion()         → GovernanceCore.createProposal()
 │                                              → VersionStore.storeVersion()
 ├─→ GovernanceCore.vote()
 ├─→ GovernanceCore.queueProposal()            → TimelockController.schedule()
 ├─→ GovernanceCore.executeProposal()          → TimelockController.execute()
 │                                              → PolkaInkRegistry.mergeProposal()
 │                                              → VersionStore（标记正式版本）
 │                                              → NFTReward.mintAuthorNFT()
 │                                              → Treasury.distributeProposalReward()
 └─→ ArchiveCouncil.veto()                     → GovernanceCore（标记提案 Vetoed）
                                               → Treasury（slash 质押）

ArchiveCouncil
 └─→ NFTReward.mintGuardianNFT()（选举执行后）
 └─→ NFTReward.deactivateGuardianNFT()（任期结束）

GovernanceCore（通过 TimelockController）
 └─→ ProxyAdmin.upgrade()                      → 升级目标合约实现

TimelockController
 └─→ 唯一可以调用 ProxyAdmin.upgrade()
 └─→ 唯一可以调用 Treasury.executeSpend()
 └─→ 唯一可以调用 GovernanceCore.updateParams()
```

### 3.6 DAO 共识升级流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                    合约升级完整流程                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Step 1: 开发者提交升级提案                                          │
│  GovernanceCore.proposeUpgrade(                                       │
│    contractName = "PolkaInkRegistry",                                 │
│    newImplementation = 0xNewImpl...,                                  │
│    description = "修复版本树 bug，详见 GitHub PR #42"                │
│  )                                                                    │
│  → 质押 50 DOT（升级提案要求更高质押）                                │
│                                                                       │
│  Step 2: 社区公开审查（7 天投票期）                                  │
│  要求：YES > 60% AND 参与率 > 5%                                     │
│  升级提案额外要求：代码审计报告链接必须在 description 中             │
│                                                                       │
│  Step 3: Archive Council 审查（48h Timelock 期间）                   │
│  委员可 veto 如发现：安全漏洞、恶意权限提升、中心化风险              │
│                                                                       │
│  Step 4: Timelock 到期，任何人可执行                                 │
│  TimelockController.execute()                                         │
│  → ProxyAdmin.upgradeAndCall(proxyAddr, newImpl, initData)           │
│                                                                       │
│  Step 5: 新实现生效，前端自动检测新 ABI                              │
│  → 链上发出 Upgraded(newImplementation) 事件                         │
│  → 前端订阅事件，提示用户刷新                                        │
│                                                                       │
│  ⚠️  紧急回滚：需新的 UpgradeContract 提案，走相同流程               │
│  ⚠️  TimelockController 本身不可升级，是整个系统的信任根             │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.7 事件（Events）汇总

| 合约 | 事件 | 触发条件 |
|------|------|----------|
| Registry | `DocumentCreated` | 新文档创建 |
| Registry | `VersionProposed` | 版本提案提交 |
| Registry | `VersionMerged` | 版本成功合并 |
| VersionStore | `VersionStored` | 版本数据写入 |
| VersionStore | `ShardAppended` | 分片数据追加 |
| GovernanceCore | `ProposalCreated` | 提案创建 |
| GovernanceCore | `VoteCast` | 用户投票 |
| GovernanceCore | `ProposalQueued` | 进入 Timelock 队列 |
| GovernanceCore | `ProposalExecuted` | 提案执行完成 |
| GovernanceCore | `ProposalRejected` | 投票否决 |
| GovernanceCore | `StakeSlashed` | 质押被扣罚 |
| ArchiveCouncil | `VetoCast` | 委员行使 veto |
| ArchiveCouncil | `ProposalVetoed` | veto 达到门槛 |
| ArchiveCouncil | `ElectionExecuted` | 选举结果执行 |
| NFTReward | `AuthorNFTMinted` | Author NFT 铸造 |
| NFTReward | `GuardianNFTMinted` | Guardian NFT 铸造 |
| Treasury | `RewardDistributed` | 奖励分发 |
| Treasury | `SpendExecuted` | DAO 支出执行 |

### 3.8 错误码（Custom Errors）汇总

```solidity
// 所有合约统一使用 Custom Errors（节省 Gas）

// Registry 错误
error Registry__DocumentNotFound(uint256 docId);
error Registry__DocumentArchived(uint256 docId);
error Registry__InvalidParentVersion(uint256 versionId);
error Registry__InvalidTitle();              // 标题为空或超长
error Registry__TooManyTags(uint256 max);
error Registry__InsufficientStake(uint256 required, uint256 provided);
error Registry__Unauthorized();

// GovernanceCore 错误
error Gov__ProposalNotFound(uint256 proposalId);
error Gov__ProposalNotActive(uint256 proposalId, ProposalStatus status);
error Gov__AlreadyVoted(address voter, uint256 proposalId);
error Gov__VotingEnded(uint256 proposalId);
error Gov__QuorumNotReached(uint256 actual, uint256 required);
error Gov__ThresholdNotMet(uint256 yesPercent, uint256 required);
error Gov__TimelockPending(bytes32 timelockId);
error Gov__NotProposer(address caller, address proposer);
error Gov__InvalidProposalType();

// ArchiveCouncil 错误
error Council__NotActiveMember(address caller);
error Council__AlreadyVetoed(address member, uint256 proposalId);
error Council__VetoWindowClosed(uint256 proposalId);
error Council__ElectionNotFound(uint256 electionId);
error Council__ElectionStillActive(uint256 electionId);
error Council__AlreadyVotedInElection(address voter);
error Council__InvalidCandidateCount(uint256 count, uint256 required);

// NFTReward 错误
error NFT__Soulbound(uint256 tokenId);
error NFT__NotOwner(uint256 tokenId, address caller);
error NFT__GuardianNFTExpired(uint256 tokenId);
error NFT__Unauthorized();

// Treasury 错误
error Treasury__InsufficientBalance(uint256 requested, uint256 available);
error Treasury__SpendNotApproved(uint256 spendId);
error Treasury__Unauthorized();
```

---

## 4. Revive 执行环境说明

### 4.1 技术背景核实

Polkadot Hub 上的智能合约执行环境体系如下：

```
pallet-revive（Polkadot Hub 上的合约托管 pallet）
  │
  ├── REVM（Rust EVM）
  │     完整以太坊字节码兼容
  │     支持 Hardhat / Foundry / MetaMask / Ethers.js 等全部工具链
  │     Solidity 正常编译，无需特殊处理
  │     ← PolkaInk 当前选用此路径
  │
  └── PolkaVM / PVM（基于 RISC-V 的原生高性能 VM）
        Solidity 通过 resolc（Revive Compiler）编译为 PVM 字节码
        性能更高，Gas 成本更低（未来方向）
        工具链支持仍在建设中
```

### 4.2 PolkaInk 的选择

**当前阶段（Phase 1-2）：使用 REVM 路径**

- 100% Hardhat 兼容，无需修改任何开发工具链
- MetaMask 用户无需安装 Polkadot.js Extension 也可参与投票
- 合约 Solidity 代码无需任何 REVM 专属修改

**未来（Phase 4+）：探索 PVM 迁移**

- 通过 DAO 升级提案迁移至 PVM 后端
- 享受 PolkaVM 的更低 Gas 成本和更高性能
- 需要 resolc 工具链成熟后再评估

### 4.3 链配置参数

| 参数 | PAS（Polkadot Hub Testnet）🔧 开发用 | Westend Hub（内部测试网） | Kusama Hub（正式网络） |
|------|------|------|------|
| Chain ID | `420420422` | `420420421` | `420420418` |
| 原生代币 | PAS（测试代币） | WND | KSM |
| RPC（HTTP） | `https://services.polkadothub-rpc.com/testnet` | `https://westend-asset-hub-eth-rpc.polkadot.io` | `https://kusama-asset-hub-eth-rpc.polkadot.io` |
| Faucet | https://faucet.polkadot.io/?parachain=1111 | https://faucet.polkadot.io/westend | N/A（需购买 KSM） |
| EVM 区块浏览器 | [Blockscout PAS](https://blockscout-passet-hub.parity-testnet.parity.io/) | [Blockscout Westend](https://blockscout-asset-hub.parity-chains-scw.parity.io/) | [Blockscout Kusama](https://blockscout-kusama-asset-hub.parity-chains-scw.parity.io/) |
| Substrate 浏览器 | [Subscan Paseo](https://assethub-paseo.subscan.io/) | [Subscan Westend](https://assethub-westend.subscan.io/) | [Subscan Kusama](https://assethub-kusama.subscan.io/) |
| 钱包兼容 | MetaMask / Polkadot.js | 同左 | 同左 |

> **📌 开发阶段使用 PAS（Polkadot Hub Testnet / Paseo Asset Hub），Chain ID `420420422`。**
> 来源：[paritytech/hardhat-polkadot 官方示例](https://github.com/paritytech/hardhat-polkadot/blob/main/examples/all-polkavm-networks/hardhat.config.ts)

---

## 5. Calldata 存储机制

### 5.1 Markdown 上链数据结构

```json
{
  "schema": "polkaink/v1",
  "docId": 42,
  "versionId": 156,
  "parentVersionId": 143,
  "title": "Polkadot 2024 Governance Crisis",
  "author": "0x1234...abcd",
  "tags": ["governance", "2024", "opengov"],
  "contentHash": "sha256:a3f8b2c1...",
  "encoding": "gzip+utf8",
  "contentLength": 8420,
  "isSharded": false,
  "shardIndex": null,
  "shardCount": null,
  "markdown": "<base64-encoded-gzip-compressed-markdown>",
  "timestamp": 1706745600,
  "clientVersion": "polkaink-client/1.0"
}
```

### 5.2 分片提交（超大文档）

当 Markdown 压缩后超过 100KB 时，自动触发分片：

```
全文 Markdown（800KB）
  ↓ gzip 压缩
压缩内容（约 280KB）
  ↓ 按 80KB 分片
  ├── Shard 0：交易 Tx1（含 shard_index=0, shard_count=4）
  ├── Shard 1：交易 Tx2
  ├── Shard 2：交易 Tx3
  └── Shard 3：交易 Tx4

合约端：
  - storeVersion() 创建版本记录（isSharded=true, shardCount=4）
  - appendShard() × 4 记录各分片的 TxHash
  - 前端重建：按 TxHash 拉取 calldata → 拼接 → 解压 → 渲染
```

### 5.3 成本估算

| 内容规模 | 压缩后大小 | 预估 Gas 费用（REVM on Asset Hub） |
|---------|-----------|------------------------------|
| 500 字中文 Markdown | ≈ 400B | < 0.01 DOT |
| 2000 字中文 Markdown | ≈ 1.2KB | ≈ 0.03 DOT |
| 10000 字中文 Markdown | ≈ 5KB | ≈ 0.12 DOT |
| 50000 字中文 Markdown | ≈ 22KB | ≈ 0.5 DOT（分片） |

> 注：以上为估算值，实际费用取决于 Asset Hub Gas 价格。相比以太坊主网，Asset Hub 链上存储成本显著更低。

### 5.4 历史重建

所有数据均在链上，任何人可完整重建：

```bash
# Example: Rebuild document history from on-chain data
polkaink-cli rebuild \
  --rpc https://services.polkadothub-rpc.com/testnet \
  --registry 0xRegistryAddr \
  --doc-id 42 \
  --output ./exported/doc_42/
```

---

## 6. 治理机制设计

### 6.1 投票权重体系

```
用户最终投票权重 = 基础权重 × NFT 加成 × 锁仓加成

基础权重：
  - 1 DOT = 1 投票单位（以快照区块余额计算）
  - 快照区块 = 提案创建时的区块号（防闪电贷攻击）

NFT 加成（叠加最高的一种）：
  - 无 NFT：× 1.0
  - 持有 Author NFT（≥1 枚）：× 1.5
  - 持有 Active Guardian NFT：× 2.0（仅普通文档提案）

锁仓加成（自愿锁仓 DOT）：
  - 不锁仓：× 1.0
  - 锁仓 30 天：× 1.2
  - 锁仓 90 天：× 1.5
  - 锁仓 180 天：× 2.0
  （锁仓加成与 NFT 加成可叠加）
```

### 6.2 提案生命周期状态机

```
                    ┌──────────────────────────────────────┐
                    │           提案状态机                  │
                    └──────────────────────────────────────┘

  用户提交 + 质押 DOT
         │
         ▼
    [Pending]  ←── 等待投票开始（可被提案人取消 → [Cancelled]）
         │
         │ 自动（到 startTime）
         ▼
     [Active]  ←── 7 天投票期（DOT + NFT 持有者投票）
         │
    ┌────┴────┐
    │         │
    ▼         ▼
[Rejected] [Passed]  ← 60% YES + 5% 参与率
（扣押30%）    │
               │ 等待 Archive Council 审查（最多 48h）
               │
          ┌───┴───┐
          │       │
          ▼       ▼
       [Vetoed] [TimelockQueued]  ← 无 veto 则进队列
      （扣押50%）      │
                       │ 48h Timelock 到期
                       ▼
                  [Executed]  → NFT 铸造 + 奖励发放 + 版本合并
                  
   特殊情况：
   [Active/Passed/TimelockQueued] → [Expired]（超过最长等待期 30 天）
```

### 6.3 提案通过条件

```
通过条件（全部满足）：
  1. yesVotes / totalVotingPower > 60%
  2. totalVotingPower / snapshotTotalSupply > 5%
  3. councilVetoCount < 4（Archive Council veto 数量未达门槛）
  4. 在投票截止时间之前

质押扣罚规则：
  - 投票通过：全额退还质押 + 奖励
  - 投票否决（60% 条件未达）：扣罚 30%，剩余退还
  - Archive Council Veto：扣罚 50%，剩余退还
  - 提案人主动取消（Pending 状态）：全额退还（鼓励先讨论后提案）
```

---

## 7. Archive Council（伦理守护委员会）

### 7.1 设计原则

Archive Council 是 PolkaInk 的最后一道伦理防线。核心设计原则：

- **仅 veto，不决策**：委员无法主动决定任何内容，只能否决
- **链上透明**：所有 veto 记录永久上链，附理由，任何人可查
- **无固定薪酬**：委员仅获得 Guardian NFT（声誉激励），防腐败
- **社区可罢免**：DAO 75% 超级多数可罢免任何委员
- **任期轮换**：6 个月任期，避免权力固化

### 7.2 委员资格要求

候选人须满足（链上可验证）：

- Polkadot 账户存活 ≥ 12 个月
- 持有 ≥ 100 DOT（防女巫攻击）
- 无活跃的链上违规记录
- 公开 Discord/Element 账号（社区可联系）

### 7.3 选举流程

```
任期临近结束（最后 14 天）→ 任何人可发起选举
  │
  ▼
候选人提名（7 天提名期）
  │
  ▼
社区投票（7 天，DOT 余额 + Author NFT 加成投票）
  │
  ▼
得票最高的 7 人当选（若不足 7 人，减少委员数量）
  │
  ▼
执行选举 → 旧 Guardian NFT 失效 → 新 Guardian NFT 铸造
```

### 7.4 Veto 机制细节

- **触发时机**：提案进入 TimelockQueued 状态后，48h 内可 veto
- **门槛**：7 人中 4 人行使 veto → 提案被否决
- **理由必填**：veto 时必须提供 ≥ 50 字节的链上理由
- **合理 veto 范围**：虚假历史内容、恶意合约升级、法律风险内容、明显歧视内容
- **反 veto 机制**：DAO 可发起反 veto 提案（需 80% 超级多数），若通过则推翻 veto 结论并重启提案

---

## 8. NFT 系统设计

### 8.1 Author NFT（历史作者徽章）

| 属性 | 说明 |
|------|------|
| 标准 | ERC-721 |
| 名称示例 | "PolkaInk Historian #124" |
| 获得方式 | 提案成功合并后自动 mint，无法手动申请 |
| 可转让 | 默认可转让，投票期间可自愿锁定为 Soulbound |
| 投票加成 | 持有 ≥1 枚时，投票权重 ×1.5 |
| 收益权 | 持有时享有对应提案 70% 奖励归属（铸造时已分发） |
| TokenURI | 链上生成（SVG，含文档标题、版本号、时间戳） |
| 视觉风格 | Polkadot 粉色系，◎ 符号，编号徽章 |

### 8.2 Guardian NFT（伦理守护者）

| 属性 | 说明 |
|------|------|
| 标准 | ERC-721（Soulbound） |
| 名称示例 | "PolkaInk Guardian #7" |
| 获得方式 | Archive Council 选举当选后 mint |
| 可转让 | ❌ 不可转让（Soulbound，transferFrom 会 revert） |
| 有效期 | 与委员任期同步，任期结束自动 deactivate |
| veto 权 | Active 状态时可对提案行使 veto |
| 被罢免 | DAO 提案通过后，Guardian NFT 被 deactivate |
| 视觉风格 | Polkadot 紫色系，盾牌图标，任期信息 |

### 8.3 链上 TokenURI 生成（无 IPFS 依赖）

```solidity
// 链上 SVG 生成示例（PolkaInk Historian）
function tokenURI(uint256 tokenId) public view returns (string memory) {
    NFTMetadata memory meta = _metadata[tokenId];
    string memory svg = string(abi.encodePacked(
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">',
        '<rect width="400" height="400" fill="#1A1A1A"/>',
        '<circle cx="200" cy="120" r="60" fill="#E6007A"/>',
        '<text x="200" y="128" font-size="40" fill="white" text-anchor="middle">◎</text>',
        '<text x="200" y="220" font-size="18" fill="white" text-anchor="middle">PolkaInk Historian</text>',
        '<text x="200" y="255" font-size="28" fill="#E6007A" text-anchor="middle">#', Strings.toString(tokenId), '</text>',
        '<text x="200" y="300" font-size="12" fill="#888" text-anchor="middle">Doc #', Strings.toString(meta.linkedDocId), '</text>',
        '</svg>'
    ));
    // 返回 base64 encoded data URI
}
```

---

## 9. 经济模型

### 9.1 资金来源（分阶段）

| 阶段 | 来源 | 金额估算 |
|------|------|---------|
| Phase 0-1 | Polkadot Treasury Grant | 申请 50,000 - 100,000 DOT |
| Phase 1-2 | Author NFT 初始发售（100枚创世 NFT） | 视市场决定 |
| Phase 2+ | 历史文档 API 企业访问费 | 按调用量计费 |
| Phase 3+ | DAO Treasury DOT → 流动性收益 | 保守估算年化 5-8% |
| 持续 | 社区捐赠 | 不设限 |

### 9.2 奖励分配模型

```
每个成功合并的版本提案，奖励来自 Treasury：

  总奖励池（由 DAO 定期从 Treasury 划拨）
  ├── 70% → Author（提案人）
  │          → 直接转账到提案人地址
  │          → 同时触发 Author NFT mint
  └── 30% → DAO Treasury
             ├── 50% → 后续提案奖励池补充
             ├── 30% → 协议运营（前端托管、索引节点）
             └── 20% → Archive Council 运营基金

质押 Slash 去向：
  └── 100% → Treasury（增加公共资金池）
```

### 9.3 流动性策略（可选，需 DAO 授权）

```
Treasury DOT 中 ≤ 20% 可部署到流动性协议：

  Treasury → Hydration DEX（LP）/ Polkadot Staking Derivatives
               ↓
          年化收益（估算 5-8% APR）
               ↓
          自动归入 Treasury → 补充奖励池

风险控制：
  - 每次部署需独立 DAO TreasurySpend 提案
  - 单次部署上限 10% 总资金
  - TimelockController 管理部署权限
  - 紧急赎回：DAO 紧急提案（缩短投票期至 2 天）
```

### 9.4 防冷启动策略

| 措施 | 说明 |
|------|------|
| 创世 Author NFT | 向 100 位 Polkadot 生态贡献者免费空投，赋予初始投票权 |
| Gas 补贴 | 启动期前 50 个成功提案，Treasury 退还 50% Gas 费 |
| 降低初始门槛 | Phase 1 最低质押降至 1 DOT，参与率门槛降至 3% |
| 合作引流 | 与 Polkassembly、SubSquid、Subscan 建立数据互通 |
| Grant 联动 | 与 Polkadot Treasury 现有历史记录类项目合并申请 |

---

## 10. 前端设计

### 10.1 技术选型

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| Vite | 5.x | 构建工具 |
| TypeScript | 5.x | 类型安全 |
| Tailwind CSS | v4 | 样式框架（Mobile-first） |
| Zustand | 4.x | 全局状态（钱包、用户信息） |
| React Query | 5.x | 链数据缓存与请求管理 |
| React Router | 6.x | 路由（Hash Router，IPFS 兼容） |
| i18next | 23.x | 国际化 |
| wagmi | 2.x | 以太坊钱包连接（REVM 兼容） |
| RainbowKit | 2.x | 钱包连接 UI |
| @polkadot/extension-dapp | 0.46.x | Polkadot.js Extension 支持 |
| react-markdown | 9.x | Markdown 渲染 |
| remark-gfm | 4.x | GFM 扩展 |
| shiki | 1.x | 代码块高亮 |
| Recharts | 2.x | 投票数据图表 |
| ethers.js | 6.x | 合约交互 |

### 10.2 配色方案

```css
/* Polkadot Design Token — globals.css */
:root {
  /* 品牌主色 */
  --color-primary:        #E6007A;  /* Polkadot 标志粉色 */
  --color-primary-hover:  #CC0068;  /* 悬停深化 */
  --color-primary-10:     #FCE4F1;  /* 10% 浅色背景 */
  --color-primary-20:     #F9CADF;  /* 20% 浅色背景 */

  /* 品牌次色 */
  --color-secondary:      #552BBF;  /* Polkadot 品牌紫 */
  --color-secondary-10:   #EDE8F9;

  /* 语义色 */
  --color-success:        #56C568;  /* 通过/成功 */
  --color-warning:        #F5A623;  /* 待审查/警告 */
  --color-error:          #FF4D4F;  /* 否决/错误 */
  --color-info:           #1890FF;  /* 信息提示 */

  /* 中性色（浅色模式） */
  --color-background:     #FAFAFA;
  --color-surface:        #FFFFFF;
  --color-surface-alt:    #F5F5F5;
  --color-border:         #E5E5E5;
  --color-text-primary:   #1A1A1A;
  --color-text-secondary: #6B6B6B;
  --color-text-disabled:  #BFBFBF;
}

/* 暗色模式 */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background:     #0D0D0D;
    --color-surface:        #1A1A1A;
    --color-surface-alt:    #252525;
    --color-border:         #333333;
    --color-text-primary:   #F5F5F5;
    --color-text-secondary: #999999;
    /* 主色不变 */
  }
}
```

### 10.3 前端目录结构

```
polkaink-frontend/
├── public/
│   ├── locales/
│   │   ├── en/
│   │   │   └── translation.json
│   │   ├── zh-CN/
│   │   │   └── translation.json
│   │   └── 抗日/
│   │       └── translation.json
│   └── favicon.svg                       # Polkadot ◎ 风格图标
├── src/
│   ├── main.tsx                           # 入口，i18n + wagmi + RainbowKit 初始化
│   ├── App.tsx                            # 路由配置（Hash Router）
│   ├── pages/
│   │   ├── Home/
│   │   │   ├── index.tsx                  # 首页
│   │   │   ├── HeroSection.tsx
│   │   │   ├── StatsBar.tsx
│   │   │   ├── LatestProposals.tsx
│   │   │   └── FeaturedDocuments.tsx
│   │   ├── Library/
│   │   │   ├── index.tsx                  # 文档列表（图书馆）
│   │   │   ├── DocumentCard.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   └── TagCloud.tsx
│   │   ├── Document/
│   │   │   ├── index.tsx                  # 文档详情
│   │   │   ├── MarkdownViewer.tsx
│   │   │   ├── VersionTree.tsx            # 版本 DAG 可视化
│   │   │   ├── VersionSelector.tsx
│   │   │   ├── DiffViewer.tsx             # 版本 diff 查看
│   │   │   └── DocSidebar.tsx
│   │   ├── Propose/
│   │   │   ├── index.tsx                  # 提案编辑器
│   │   │   ├── MarkdownEditor.tsx         # 编辑/预览双栏
│   │   │   ├── StakeInput.tsx
│   │   │   ├── ProposalStepper.tsx        # 4步骤引导
│   │   │   └── SubmitConfirm.tsx
│   │   ├── Governance/
│   │   │   ├── index.tsx                  # 治理投票大厅
│   │   │   ├── ProposalList.tsx
│   │   │   ├── ProposalCard.tsx
│   │   │   ├── VotePanel.tsx              # 投票操作面板
│   │   │   ├── VoteProgress.tsx           # 投票进度可视化
│   │   │   └── ProposalDetail.tsx
│   │   ├── Profile/
│   │   │   ├── index.tsx                  # 用户主页
│   │   │   ├── NFTGallery.tsx
│   │   │   ├── ContributionStats.tsx
│   │   │   └── ProposalHistory.tsx
│   │   ├── Council/
│   │   │   ├── index.tsx                  # Archive Council 页面
│   │   │   ├── MemberList.tsx
│   │   │   ├── VetoHistory.tsx
│   │   │   ├── PendingReview.tsx
│   │   │   └── ElectionPanel.tsx
│   │   └── Treasury/
│   │       ├── index.tsx                  # 财库概览
│   │       ├── BalanceCard.tsx
│   │       ├── SpendHistory.tsx
│   │       └── RewardPool.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx                 # 主/次/危险 三种样式
│   │   │   ├── Badge.tsx                  # 状态徽章
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   ├── Progress.tsx               # 投票进度条
│   │   │   ├── Skeleton.tsx               # 加载占位
│   │   │   ├── Toast.tsx                  # 交易状态通知
│   │   │   └── Pagination.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx                 # 顶部导航（含语言切换器）
│   │   │   ├── Footer.tsx
│   │   │   ├── MobileNav.tsx              # 底部 Tab（移动端）
│   │   │   └── PageWrapper.tsx
│   │   ├── wallet/
│   │   │   ├── ConnectButton.tsx          # 钱包连接按钮
│   │   │   └── WalletInfo.tsx             # 已连接钱包信息
│   │   └── governance/
│   │       ├── StatusBadge.tsx            # 提案状态徽章
│   │       └── VotingPowerDisplay.tsx
│   ├── hooks/
│   │   ├── useContract.ts                 # 合约实例（ethers.js）
│   │   ├── useWallet.ts                   # 钱包状态（wagmi + polkadot.js）
│   │   ├── useDocuments.ts                # 文档列表（React Query）
│   │   ├── useDocument.ts                 # 单文档详情
│   │   ├── useProposals.ts                # 提案列表
│   │   ├── useVote.ts                     # 投票操作
│   │   ├── useVersionStore.ts             # 版本数据
│   │   └── useVotingPower.ts              # 投票权重计算
│   ├── store/
│   │   ├── walletStore.ts                 # Zustand：钱包状态
│   │   ├── uiStore.ts                     # Zustand：UI 状态（语言、主题）
│   │   └── notificationStore.ts           # Zustand：交易通知
│   ├── lib/
│   │   ├── contracts/
│   │   │   ├── addresses.ts               # 合约地址（按 chainId）
│   │   │   ├── abis/                      # ABI JSON 文件
│   │   │   │   ├── PolkaInkRegistry.json
│   │   │   │   ├── GovernanceCore.json
│   │   │   │   ├── ArchiveCouncil.json
│   │   │   │   ├── NFTReward.json
│   │   │   │   └── Treasury.json
│   │   │   └── index.ts                   # 合约实例工厂
│   │   ├── i18n.ts                        # i18next 初始化
│   │   ├── wagmiConfig.ts                 # wagmi + RainbowKit 配置
│   │   ├── calldata.ts                    # Markdown calldata 编解码工具
│   │   └── versionTree.ts                 # 版本 DAG 渲染工具
│   └── styles/
│       ├── globals.css                    # Tailwind + Design Token
│       └── markdown.css                   # Markdown 渲染专用样式
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 10.4 页面设计规范

#### 首页（Home）— `/#/`

```
┌──────────────────────────────────────────────────────────────────────┐
│  ◎ PolkaInk         [EN|ZH|kr]   [图书馆]  [治理]  [连接钱包]       │
│  ──────────────────────────────────────────────────────────────────  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ◎                                                                   │
│   把 Polkadot 历史写进区块链本身                                      │
│   Write Polkadot History Into the Blockchain Itself                   │
│                                                                        │
│   The on-chain, DAO-governed, community-consensus                     │
│   historical archive for the Polkadot ecosystem.                      │
│                                                                        │
│   [  📜 探索文档库  ]    [  ✍️ 提交历史文档  ]                        │
│                                                                        │
├───────────┬──────────────────┬──────────────────┬────────────────────┤
│ 📄 文档数  │   🔀 版本数       │   ✍️ 活跃作者     │   🗳️ 进行中提案   │
│   428      │     1,204        │       87         │       12           │
├───────────┴──────────────────┴──────────────────┴────────────────────┤
│                                                                        │
│  🔥 最新提案                                                          │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  [●进行中]  #042 Polkadot 2024 Q3 治理报告                   │    │
│  │  提案人：Historian #44  ·  质押：15 DOT                      │    │
│  │  ████████████░░░░░░  67.2% YES  ·  剩余 2 天 14 小时         │    │
│  │                                          [查看详情 →]         │    │
│  └──────────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  [●待审查]  #041 Substrate 技术演变史 v4                      │    │
│  │  提案人：Historian #12  ·  已通过  ·  等待 Council 审查 38h  │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                        │
│  📌 精选历史文档                                                       │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐        │
│  │ Polkadot 创始故事        │  │ DOT 质押机制演变史           │        │
│  │ v8 · 标签：历史          │  │ v5 · 标签：技术 质押         │        │
│  │ 2024-01-15  [查看 →]    │  │ 2025-09-01  [查看 →]        │        │
│  └─────────────────────────┘  └─────────────────────────────┘        │
│                                                                        │
│  ─────────────────────────────────────────────────────────────────   │
│  Built on Polkadot Hub · Powered by DAO · All data on-chain           │
│  IPFS: Qm... · GitHub: polkaink · Docs                               │
└──────────────────────────────────────────────────────────────────────┘

📱 移动端：单列布局 · 底部 Tab 导航（首页/文档/治理/我的）
```

#### 文档图书馆（Library）— `/#/library`

```
┌──────────────────────────────────────────────────────────────────────┐
│  ◎ PolkaInk  /  文档图书馆                                           │
├──────────────────────────────────────────────────────────────────────┤
│  🔍 [搜索文档标题、标签、作者...]                                     │
│                                                                        │
│  分类：[📂 全部] [⚖️ 治理] [🔧 技术] [📖 历史] [🌐 生态] [🎭 文化]  │
│  排序：[最新更新 ▼] [最多版本] [最多参与者]                           │
│  视图：[≡ 列表] [⊞ 卡片]                                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  📄  Polkadot OpenGov 完整治理历史                            │    │
│  │      [治理] [OpenGov] [2024]                                  │    │
│  │      作者：◎ Historian #12  ·  当前版本：v7                  │    │
│  │      最后更新：2025-11-02  ·  字数：4,200  ·  参与者：15 人  │    │
│  │                              [查看文档 →]  [提案修改 ✍️]      │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  📄  Substrate 框架技术演变史                                 │    │
│  │      [技术] [Substrate] [框架]                                │    │
│  │      作者：◎ Historian #5   ·  当前版本：v3                  │    │
│  │      最后更新：2025-09-14  ·  字数：6,800  ·  参与者：8 人   │    │
│  │                              [查看文档 →]  [提案修改 ✍️]      │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                        │
│  ◀ 1  2  3  ...  18 ▶         显示 1-20 / 共 428 篇                 │
└──────────────────────────────────────────────────────────────────────┘

📱 移动端：卡片式布局 · 标签横向滚动 · 无悬浮操作按钮
```

#### 文档详情（Document）— `/#/document/:id`

```
┌──────────────────────────────────────────────────────────────────────┐
│  ◎ PolkaInk  /  图书馆  /  Polkadot OpenGov 完整治理历史            │
├────────────────────────────────────────┬─────────────────────────────┤
│                                         │                             │
│  📄 文档内容（Markdown 渲染）           │  📊 文档信息                │
│                                         │  ┌───────────────────────┐ │
│  # Polkadot OpenGov 完整治理历史        │  │ 当前版本  v7           │ │
│                                         │  │ 作者  ◎ Historian #12  │ │
│  *最后更新：2025-11-02 by Historian #12*│  │ 创建  2024-03-01       │ │
│                                         │  │ 更新  2025-11-02       │ │
│  ---                                    │  │ 字数  4,200            │ │
│                                         │  └───────────────────────┘ │
│  ## 背景与起源                          │                             │
│                                         │  📜 版本历史               │
│  2022 年，Polkadot 社区...              │  ┌───────────────────────┐ │
│                                         │  │ v7 ◀ 当前            │ │
│  ## OpenGov 的核心创新                  │  │ v6  2025-08-01        │ │
│                                         │  │ v5  2025-03-15        │ │
│  多轨道（multi-track）治理体系...       │  │ v4  2024-11-20        │ │
│                                         │  │  ···                  │ │
│  ### 轨道列表                           │  │ [v6→v7 查看 diff]     │ │
│  | 轨道 | 权限 | 投票期 |               │  └───────────────────────┘ │
│  |------|------|--------|              │                             │
│  | Root | 最高 | 28天  |               │  🏷️ 标签                  │
│                                         │  [治理] [OpenGov] [2024]   │
│  ---                                    │                             │
│  [◀ 上一篇]               [下一篇 ▶]   │  📎 链上信息               │
│                                         │  TxHash: 0x1a2b...         │
│  ─────────────────────────────────────  │  区块: #12,345,678         │
│  [✍️ 提案修改此文档]                    │                             │
│  [📥 导出 Markdown]                     │  [🔗 链上查看]             │
│  [🔗 分享链接]                          │                             │
└────────────────────────────────────────┴─────────────────────────────┘

📱 移动端：版本历史折叠为下拉 · 侧边栏内容置于文档下方 · 操作按钮底部浮动
```

#### 提案编辑器（Propose）— `/#/propose/:docId?`

```
┌──────────────────────────────────────────────────────────────────────┐
│  ◎ PolkaInk  /  提交提案                                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  步骤引导：                                                           │
│  ● 1.编写 ——▶ ○ 2.预览 ——▶ ○ 3.质押 ——▶ ○ 4.提交                   │
│                                                                        │
├───────────────────────────────┬──────────────────────────────────────┤
│  ✍️ Markdown 编辑器             │  👁️ 实时预览                         │
│  ┌─────────────────────────┐  │  ┌────────────────────────────────┐ │
│  │ # 文档标题               │  │  │ 文档标题                        │ │
│  │                          │  │  │ ─────────────────────────────  │ │
│  │ ## 背景                  │  │  │                                  │ │
│  │                          │  │  │ 背景                            │ │
│  │ 内容...                  │  │  │                                  │ │
│  │                          │  │  │ 内容...                         │ │
│  │                          │  │  │                                  │ │
│  └─────────────────────────┘  │  └────────────────────────────────┘ │
│  工具栏：[H1][H2][H3][B][I]   │                                      │
│  [链接][代码块][引用][图片]    │  📊 字数：1,240   估算 Gas：~0.03 DOT│
├───────────────────────────────┴──────────────────────────────────────┤
│  📝 提案说明（修改理由，最多 500 字）：                               │
│  [_______________________________________________________________]    │
│                                                                        │
│  🏷️ 标签（最多 10 个）：[治理 ×] [2024 ×] [+ 添加标签]              │
│                                                                        │
│  基于版本：[v6（当前最新）▼]   如需基于其他版本修改请选择             │
│                                                                        │
│                 [← 上一步]                [预览 →]                    │
└──────────────────────────────────────────────────────────────────────┘

── 步骤 3：质押 ────────────────────────────────────────────────────────
│  💰 质押 DOT（作为提案诚信保证金）                                    │
│                                                                        │
│  最低质押：5 DOT     推荐质押：10 DOT（提升提案可信度）               │
│                                                                        │
│  质押金额：[ 10.0  ] DOT                                             │
│  当前余额：152.4 DOT                                                  │
│                                                                        │
│  质押规则：投票通过→全额退还  否决→扣罚30%  Veto→扣罚50%             │
│                                                                        │
│                 [← 上一步]                [确认质押 →]                │
└──────────────────────────────────────────────────────────────────────┘

📱 移动端：编辑/预览 Tab 切换 · Markdown 工具栏固定底部 · 大号质押输入框
```

#### 治理投票大厅（Governance）— `/#/governance`

```
┌──────────────────────────────────────────────────────────────────────┐
│  ◎ PolkaInk  /  治理大厅                                             │
├──────────────────────────────────────────────────────────────────────┤
│  [全部] [🔵 投票中] [🟡 待审查] [🟢 待执行] [✅ 已完成] [❌ 已否决] │
│  🔍 [搜索提案...]                     排序：[最新] [截止最近]         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ 🔵 投票中   提案 #042                                        │    │
│  │ Polkadot 2024 Q3 治理报告 — 版本 v3 更新                    │    │
│  │ 提案人：◎ Historian #44   质押：15 DOT                       │    │
│  │                                                               │    │
│  │ 投票进度：                                                    │    │
│  │  赞成 ████████████████░░░░  67.2%                           │    │
│  │  反对 ████████░░░░░░░░░░░░  32.8%                           │    │
│  │                                                               │    │
│  │ 参与率：8.4%  ✅（≥5%）  ·  剩余：2 天 14 小时              │    │
│  │ 参与人数：128 人   总投票权：1,240,000 DOT 等价              │    │
│  │                                                               │    │
│  │ 我的投票权：2,400 DOT 等价（含 Author NFT ×1.5 加成）        │    │
│  │                                                               │    │
│  │  [👍 支持投票]   [👎 反对投票]   [📋 查看详情]   [📄 Diff]  │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ 🟡 待 Council 审查   提案 #041                               │    │
│  │ Substrate 技术演变史 v4 修订                                  │    │
│  │  ████████████████░░  82.1% YES  ·  参与率：6.2%  ✅         │    │
│  │  Archive Council 审查剩余：38 小时                           │    │
│  │                                          [查看详情 →]         │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ 🟢 Timelock 排队   提案 #040                                 │    │
│  │ Polkadot 创世历史 v9 补充                                    │    │
│  │  90.3% YES  ·  Timelock 剩余：18 小时                        │    │
│  │  [执行提案]（到期后任何人可执行）                            │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘

📱 移动端：投票按钮为全宽大按钮 · 进度条简化显示 · 滑动切换状态 Tab
```

#### 用户主页（Profile）— `/#/profile/:address`

```
┌──────────────────────────────────────────────────────────────────────┐
│  ◎ PolkaInk  /  个人主页                                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ◎  PolkaInk Historian #12                                           │
│  地址：0xAbCd...1234                                                  │
│  加入时间：2024-03-01  ·  投票权：3,600 DOT 等价（含 NFT 加成）      │
│                                                                        │
├────────────┬─────────────────┬──────────────────┬────────────────────┤
│  提案总数   │   成功提案       │   获得 DOT 奖励   │   NFT 总数         │
│    18       │     15          │     240 DOT       │     15 枚          │
├────────────┴─────────────────┴──────────────────┴────────────────────┤
│                                                                        │
│  🏅 我的 NFT                                                          │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────┐  │     │
│  │  │ ◎ #12      │  │ ◎ #44      │  │ ◎ #67      │  │ +12  │  │     │
│  │  │ Historian  │  │ Historian  │  │ Historian  │  │ 更多  │  │     │
│  │  │ Doc #42    │  │ Doc #38    │  │ Doc #71    │  │      │  │     │
│  │  └────────────┘  └────────────┘  └────────────┘  └──────┘  │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                        │
│  📜 提案历史                                                          │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ ✅ #041  Substrate 技术史 v4   2025-10-01  +18 DOT  [查看]  │    │
│  │ ✅ #035  OpenGov 历史 v3      2025-08-15  +12 DOT  [查看]  │    │
│  │ ❌ #028  待验证内容（被否决）  2025-06-20  -3 DOT   [查看]  │    │
│  │ ✅ #021  Polkadot 创始 v2     2025-04-10  +24 DOT  [查看]  │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

#### Archive Council 页面 — `/#/council`

```
┌──────────────────────────────────────────────────────────────────────┐
│  ◎ PolkaInk  /  Archive Council                                      │
├──────────────────────────────────────────────────────────────────────┤
│  🛡️ Archive Council — 7 人伦理守护委员会                              │
│  任期：2025-10-01 ～ 2026-04-01  ·  下次选举：60 天后               │
│  委员会职责：仅有 veto 权，保障内容伦理底线，所有操作链上公开         │
│                                                                        │
├──────────────────────────────────────────────────────────────────────┤
│  当前委员（7/7 在任）                                                  │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ 🛡️ Guardian #1   0xAbCd...1234   在任  已 veto: 2 次  [详情]│     │
│  │ 🛡️ Guardian #2   0x1234...ABCD   在任  已 veto: 0 次  [详情]│     │
│  │ 🛡️ Guardian #3   0xDEF0...5678   在任  已 veto: 1 次  [详情]│     │
│  │ 🛡️ Guardian #4   0x9ABC...DEF0   在任  已 veto: 0 次  [详情]│     │
│  │ 🛡️ Guardian #5   0x5678...9ABC   在任  已 veto: 3 次  [详情]│     │
│  │ 🛡️ Guardian #6   0xEF01...2345   在任  已 veto: 0 次  [详情]│     │
│  │ 🛡️ Guardian #7   0x2345...EF01   在任  已 veto: 1 次  [详情]│     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                        │
│  ⏳ 待审查提案（Timelock 中）                                          │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ 提案 #041 — Substrate 技术演变史 v4    审查剩余：38h          │    │
│  │ [行使 Veto（填写理由）]  [明确放行（可选，加速处理）]         │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                        │
│  📋 历史 Veto 记录（完全公开透明）                                    │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ 提案 #032  2025-07-15  Veto 理由：内容与链上可查历史明显矛盾  │    │
│  │            Veto 者：Guardian #1, #3, #5, #7  [链上查看]      │    │
│  │ 提案 #018  2025-03-02  Veto 理由：涉及未经核实的个人指控      │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

#### 财库概览（Treasury）— `/#/treasury`

```
┌──────────────────────────────────────────────────────────────────────┐
│  ◎ PolkaInk  /  DAO Treasury                                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │  💰 Treasury 余额                                            │     │
│  │  12,840.5 DOT  ≈  $XX,XXX                                   │     │
│  │  可用余额：10,240.5 DOT  ·  锁定（流动性）：2,600 DOT       │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                        │
│  📊 收支概况                                                          │
│  ┌───────────────────────┬──────────────────────────────────────┐    │
│  │ 累计收入              │ 累计支出                              │    │
│  │ 35,200 DOT            │ 22,360 DOT                            │    │
│  │  - Grant 资助: 30,000 │  - 提案奖励: 18,000                  │    │
│  │  - 捐赠: 3,200        │  - 运营: 3,200                       │    │
│  │  - 流动性收益: 2,000  │  - Council 运营: 1,160               │    │
│  └───────────────────────┴──────────────────────────────────────┘    │
│                                                                        │
│  [申请 Treasury 拨款（发起 DAO 提案）]                                │
│                                                                        │
│  📋 最近支出记录                                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ 提案奖励   ◎ Historian #44   2025-10-01   +18 DOT   #041    │    │
│  │ 提案奖励   ◎ Historian #12   2025-08-15   +12 DOT   #035    │    │
│  │ 运营支出   IPFS 托管费       2025-10-01   -50 DOT   #dao012 │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

### 10.5 国际化（i18n）

#### 初始化配置

```typescript
// src/lib/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: ['en', 'zh-CN', 'kr'],
    fallbackLng: 'en',
    defaultNS: 'translation',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
```

#### 翻译文件结构示例

```json
// public/locales/zh-CN/translation.json
{
  "nav": {
    "library": "文档库",
    "governance": "治理",
    "council": "委员会",
    "treasury": "财库",
    "connect": "连接钱包",
    "disconnect": "断开连接"
  },
  "home": {
    "hero_title": "把 Polkadot 历史写进区块链本身",
    "hero_subtitle": "社区共识的、不可篡改的 Polkadot 生态历史档案",
    "cta_explore": "探索文档库",
    "cta_propose": "提交历史文档",
    "stats_documents": "文档总数",
    "stats_versions": "版本数",
    "stats_authors": "活跃作者",
    "stats_active_proposals": "进行中提案"
  },
  "governance": {
    "status_active": "投票中",
    "status_passed": "已通过",
    "status_rejected": "已否决",
    "status_vetoed": "被否决",
    "status_executed": "已执行",
    "status_queued": "待执行",
    "vote_yes": "支持投票",
    "vote_no": "反对投票",
    "voting_power": "我的投票权",
    "quorum_met": "参与率达标",
    "quorum_not_met": "参与率不足",
    "time_remaining": "剩余时间",
    "proposal_by": "提案人"
  },
  "proposal": {
    "stake_required": "需要质押",
    "stake_info": "投票通过后全额退还，否决将扣罚部分质押",
    "step_write": "编写",
    "step_preview": "预览",
    "step_stake": "质押",
    "step_submit": "提交"
  },
  "error": {
    "connect_wallet": "请先连接钱包",
    "insufficient_dot": "DOT 余额不足",
    "network_wrong": "请切换到 Polkadot Hub 网络"
  }
}
```

#### 语言切换器组件

```tsx
// 右上角语言切换器
const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const langs = [
    { code: 'en', label: 'EN' },
    { code: 'zh-CN', label: '中文' },
    { code: 'kr', label: '日本語' },
  ];
  return (
    <div className="flex gap-1">
      {langs.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => i18n.changeLanguage(code)}
          className={`px-2 py-1 text-sm rounded ${
            i18n.language === code
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
```

### 10.6 移动端适配

| 场景 | PC 端 | 移动端 |
|------|-------|--------|
| 导航 | 顶部 Header | 底部 Tab Bar（首页/文档/治理/我的） |
| 文档详情 | 双栏（内容+侧边栏） | 单栏，侧边栏内容折叠后置 |
| 提案编辑器 | 编辑+预览双栏 | 编辑/预览 Tab 切换 |
| 工具栏 | 编辑器顶部 | 固定底部 |
| 版本树 | 可视化 DAG | 下拉选择器 |
| 投票按钮 | 正常尺寸 | 全宽大按钮，最小 48px 高度 |
| 钱包连接 | 右上角 | 集成到底部 Tab |
| 表格 | 全展示 | 横向滚动 |

```css
/* 移动端断点 */
/* sm: 640px  md: 768px  lg: 1024px  xl: 1280px */

/* 底部 Tab 导航 */
.mobile-tab-bar {
  @apply fixed bottom-0 left-0 right-0 
         flex justify-around items-center
         h-16 bg-[var(--color-surface)] 
         border-t border-[var(--color-border)]
         md:hidden z-50;
}
```

---

## 11. 安全设计

### 11.1 合约安全

| 威胁 | 防护措施 |
|------|---------|
| 重入攻击 | 所有状态变更遵循 Check-Effects-Interactions 模式；关键函数使用 ReentrancyGuard |
| 闪电贷投票操控 | 投票权重使用提案创建时的区块快照，非当前余额 |
| 治理攻击（快速通过恶意提案） | TimelockController 48h 延时 + Archive Council 审查期 |
| 合约升级被滥用 | 升级需要 60% + 5% 参与 + 48h Timelock；TimelockController 本身不可升级 |
| 拒绝服务（DoS） | 限制单次调用 Gas 消耗；分页查询防止链上暴力枚举 |
| 女巫攻击（Archive Council） | 委员候选人需持有 ≥100 DOT + 账户存活 ≥12 个月 |
| 质押操控 | 质押扣罚完全由合约自动执行，无人工干预 |
| 整数溢出 | Solidity 0.8.x 默认 checked arithmetic |

### 11.2 前端安全

- **CSP（内容安全策略）**：限制第三方脚本加载，防止 XSS
- **钱包签名验证**：所有链上操作均需钱包明确签名确认
- **合约地址硬编码**：ABI 和合约地址从 `lib/contracts/addresses.ts` 统一管理，防止钓鱼替换
- **警告未审计合约**：首次连接新网络时提示用户核验合约地址

### 11.3 审计计划

| 阶段 | 内容 | 时间 |
|------|------|------|
| Phase 1 结束 | 核心合约（Registry + VersionStore）内部审查 | M5 |
| Phase 2 前 | 完整合约套件第三方审计（推荐 OpenZeppelin/Peckshield） | M6 |
| 主网上线前 | Bug Bounty 计划（通过 Immunefi 或直接激励） | M6-M7 |
| 持续 | 每次重大升级前必须审计 | 持续 |

---

## 12. 测试策略

### 12.1 单元测试

```typescript
// 示例：governance.test.ts
describe('GovernanceCore', () => {
  it('should create proposal with correct stake', async () => { ... });
  it('should reject proposal below quorum', async () => { ... });
  it('should apply NFT vote multiplier correctly', async () => { ... });
  it('should slash stake on rejection', async () => { ... });
  it('should queue proposal in timelock on pass', async () => { ... });
});
```

### 12.2 集成测试

```typescript
// 完整提案流程测试
describe('Full Proposal Flow', () => {
  it('should execute: create doc → propose version → vote → queue → execute → mint NFT', async () => {
    // 1. 部署所有合约
    // 2. 创建文档
    // 3. 提交版本提案（含 calldata Markdown）
    // 4. 模拟社区投票（60%+ 赞成，5%+ 参与）
    // 5. 通过 Archive Council 审查（无 veto）
    // 6. TimelockController 延时后执行
    // 7. 验证：版本已合并 + Author NFT 已铸造 + 奖励已分发
  });

  it('should handle veto flow correctly', async () => { ... });
  it('should handle upgrade flow correctly', async () => { ... });
});
```

### 12.3 测试覆盖率目标

| 模块 | 目标覆盖率 |
|------|---------|
| PolkaInkRegistry | ≥ 95% |
| GovernanceCore | ≥ 95% |
| ArchiveCouncil | ≥ 90% |
| NFTReward | ≥ 90% |
| Treasury | ≥ 90% |
| 集成测试 | 100%（全主流程） |

---

## 13. 部署流程

### 13.1 部署顺序（有依赖关系）

```bash
# Deploy to PAS (Polkadot Hub Testnet) — development phase
# For local testing, replace --network polkadotHubTestnet with --network hardhat

# 1. Deploy ProxyAdmin (non-upgradeable)
npx hardhat run scripts/deploy/01_deploy_proxy_admin.ts --network polkadotHubTestnet

# 2. Deploy TimelockController (non-upgradeable, min delay 48h)
npx hardhat run scripts/deploy/02_deploy_timelock.ts --network polkadotHubTestnet

# 3. Deploy NFTReward (UUPS)
npx hardhat run scripts/deploy/03_deploy_nft.ts --network polkadotHubTestnet

# 4. Deploy VersionStore (UUPS)
npx hardhat run scripts/deploy/04_deploy_version_store.ts --network polkadotHubTestnet

# 5. Deploy PolkaInkRegistry (UUPS)
npx hardhat run scripts/deploy/05_deploy_registry.ts --network polkadotHubTestnet

# 6. Deploy ArchiveCouncil (UUPS)
npx hardhat run scripts/deploy/06_deploy_council.ts --network polkadotHubTestnet

# 7. Deploy GovernanceCore (UUPS)
npx hardhat run scripts/deploy/07_deploy_governance.ts --network polkadotHubTestnet

# 8. Deploy Treasury (UUPS)
npx hardhat run scripts/deploy/08_deploy_treasury.ts --network polkadotHubTestnet

# 9. Setup roles & permissions
npx hardhat run scripts/deploy/09_setup_roles.ts --network polkadotHubTestnet

# Verify contracts on Blockscout
npx hardhat run scripts/verify.ts --network polkadotHubTestnet
```

### 13.2 初始化权限设置

```
部署完成后，09_setup_roles.ts 执行：

Registry.grantRole(GOVERNANCE_ROLE, GovernanceCore.address)
Registry.grantRole(MINTER_ROLE, GovernanceCore.address)
VersionStore.grantRole(WRITER_ROLE, Registry.address)
GovernanceCore.grantRole(COUNCIL_ROLE, ArchiveCouncil.address)
NFTReward.grantRole(AUTHOR_MINTER_ROLE, Registry.address)
NFTReward.grantRole(GUARDIAN_MINTER_ROLE, ArchiveCouncil.address)
Treasury.grantRole(DISTRIBUTOR_ROLE, Registry.address)
Treasury.grantRole(SPEND_ROLE, TimelockController.address)

# 将 ProxyAdmin 的 owner 移交给 TimelockController（关键步骤）
ProxyAdmin.transferOwnership(TimelockController.address)

# TimelockController 的 proposer/executor 设为 GovernanceCore
TimelockController.grantRole(PROPOSER_ROLE, GovernanceCore.address)
TimelockController.grantRole(EXECUTOR_ROLE, address(0))  # 任何人可执行
```

### 13.3 前端部署

```bash
# 构建
cd polkaink-frontend
npm run build          # 输出到 dist/

# 部署到 IPFS（使用 Web3.Storage 或 Pinata）
npx w3 put dist/ --name polkaink-v1.0

# 部署到 GitHub Pages（镜像）
# .github/workflows/deploy.yml 自动触发

# 更新 ENS/DNS（polkaink.eth → IPFS CID）
```

---

## 14. 项目路线图

| 阶段 | 时间 | 里程碑 | 关键可交付 |
|------|------|--------|-----------|
| **Phase 0**<br>准备期 | M1 ~ M2 | 基础建设 | 合约架构最终确定；Hardhat 环境搭建；Westend Testnet 完整部署测试；申请 Polkadot Treasury Grant |
| **Phase 1**<br>MVP | M3 ~ M5 | 核心上线 | 核心合约主网部署（Registry + VersionStore + 基础治理）；前端 Markdown 浏览器上线；calldata 上链机制验证；i18n 框架（zh/en/kr） |
| **Phase 2**<br>治理 | M6 ~ M8 | 完整 DAO | GovernanceCore + ArchiveCouncil 上线；NFT 奖励系统；邀请首批 100 位作者；Bug Bounty；正式主网运行 |
| **Phase 3**<br>生态 | M9 ~ M12 | 生态扩展 | API 市场开放；移动端 PWA 优化；AI 摘要（链下辅助，链上存档）；Subscan / Polkassembly 数据互通；Subsquid 索引上线 |
| **Phase 4**<br>多链 | M13+ | 多链扩展 | Kusama 历史支持；其他 Parachain 历史；探索 PolkaVM/PVM 原生合约迁移 |

---

## 15. 风险分析与缓解

| 风险类型 | 风险描述 | 等级 | 缓解措施 |
|---------|---------|------|---------|
| **内容风险** | 虚假历史内容通过投票 | 🔴 高 | 60% 高通过门槛 + Archive Council veto + 质押 slash；社区可发起 DisputeProposal 挑战已通过内容 |
| **经济风险** | 奖励来源不足，作者激励缺乏 | 🟡 中 | Polkadot Treasury Grant 打底；NFT 荣誉市场；API 收费；流动性收益补充 |
| **技术风险** | calldata 成本超出预期 | 🟡 中 | gzip 压缩（60-70% 体积缩减）+ 分片提交 + Polkadot Hub 低 Gas 优势（相比以太坊主网） |
| **治理风险** | 投票参与率长期不足 | 🟡 中 | 创世 NFT 空投激励 + NFT 投票加成 + 锁仓激励 + 冷启动 Gas 补贴 |
| **安全风险** | 合约升级被恶意利用 | 🔴 高 | TimelockController 48h 延时不可跳过；升级需 60% 赞成 + Archive Council 审查；核心合约第三方审计 |
| **治理腐败** | Archive Council 委员腐败 | 🟡 中 | 委员无固定薪酬；所有 veto 链上公开附理由；DAO 75% 超级多数可罢免；6 个月任期轮换 |
| **去中心化风险** | 前端单点失败 | 🟢 低 | IPFS 主托管 + GitHub Pages 镜像；完整本地构建文档；任何人可从链上重建所有数据 |
| **兼容性风险** | pallet-revive / Revive 版本变化 | 🟡 中 | 优先使用 REVM 路径（稳定性更高）；与 Parity 技术团队保持沟通；持续 CI 测试 |
| **法律风险** | 历史内容涉及法律争议 | 🟡 中 | Archive Council 的核心用途之一即处理法律风险内容；DAO 可通过归档提案处理争议文档 |

---

## 16. 长期愿景

PolkaInk 不仅仅是一个文档系统，它的终极目标是成为 **Web3 世界第一个完全链上、社区共识、DAO 治理的公共历史档案协议**。

```
短期（1 年）：
  Polkadot Hub 上运行稳定
  100+ 位活跃历史作者
  500+ 篇文档，5000+ 版本
  成功获得 Polkadot Treasury 资助

中期（2-3 年）：
  扩展到 Kusama、主要 Parachain
  PolkaInk 历史 API 被生态项目广泛引用
  成为 Polkadot 生态的"官方民间历史"
  孵化其他链的类似项目

长期（3+ 年）：
  成为 Web3 历史存档的行业标准协议
  协议本身被其他生态（Ethereum、Cosmos 等）Fork 或借鉴
  成为去中心化公共记忆基础设施
  像区块链本身一样，永久运行，无法关闭
```

---

## 附录 A：完整 ABI JSON

> ABI JSON 文件由 Hardhat 编译自动生成，存放于 `polkaink-frontend/src/lib/contracts/abis/`。
> 以下展示 `PolkaInkRegistry.json` 的核心片段结构：

```json
[
  {
    "type": "function",
    "name": "createDocument",
    "inputs": [
      { "name": "title", "type": "string", "internalType": "string" },
      { "name": "tags", "type": "string[]", "internalType": "string[]" }
    ],
    "outputs": [
      { "name": "docId", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "proposeVersion",
    "inputs": [
      { "name": "docId", "type": "uint256", "internalType": "uint256" },
      { "name": "parentVersionId", "type": "uint256", "internalType": "uint256" },
      { "name": "contentHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "markdownCalldata", "type": "bytes", "internalType": "bytes" }
    ],
    "outputs": [
      { "name": "proposalId", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "getDocument",
    "inputs": [
      { "name": "docId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          { "name": "id", "type": "uint256" },
          { "name": "title", "type": "string" },
          { "name": "author", "type": "address" },
          { "name": "currentVersionId", "type": "uint256" },
          { "name": "createdAt", "type": "uint256" },
          { "name": "updatedAt", "type": "uint256" },
          { "name": "status", "type": "uint8" },
          { "name": "tags", "type": "string[]" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "DocumentCreated",
    "inputs": [
      { "name": "docId", "type": "uint256", "indexed": true },
      { "name": "author", "type": "address", "indexed": true },
      { "name": "title", "type": "string", "indexed": false },
      { "name": "tags", "type": "string[]", "indexed": false },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "Registry__DocumentNotFound",
    "inputs": [
      { "name": "docId", "type": "uint256" }
    ]
  }
]
```

---


*PolkaInk Design Document v1.0*
*把历史写进链上，让记忆无法被删除。*
*Write history on-chain. Memory that cannot be erased.*
