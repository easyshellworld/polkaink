# ◎ PolkaInk — 项目设计书 v2

**On-Chain Polkadot History Preservation Protocol**
*Version 2.0 · 2026-03 · Tokenomics v2*

> Stake-based governance. No committee — community votes decide what gets archived.

---

## 1. 项目概述

PolkaInk 是运行在 Polkadot Asset Hub 上的开放历史记录协议。以交易 calldata 为存储媒介，将 Polkadot 生态历史文档（Markdown）直接写入链上，通过 **质押成员制 + 社区投票** 确保内容共识。

核心变化（v2）：移除 Archive Council 7人委员会，改为 **OG Gold 持有者 veto + 社区举报重投** 的轻量治理。

---

## 2. 技术架构

### 2.1 技术栈

| 层级 | 选型 |
|------|------|
| 区块链 | Polkadot Asset Hub — pallet-revive + REVM |
| 合约 | Solidity 0.8.28, Hardhat + @parity/hardhat-polkadot |
| 升级 | UUPS Proxy (OpenZeppelin) |
| 前端 | React 18 + Vite 5 + TypeScript |
| 样式 | Tailwind CSS v4 (Mobile-first) |
| 状态 | Zustand + React Query |
| 国际化 | i18next (en / zh / fr / ru / es / ar) |
| 钱包 | wagmi v2 + viem v2 + MetaMask |
| Markdown | react-markdown + remark-gfm + shiki |

### 2.2 开发规范

> ⚠️ All code, comments, variable names, and commit messages MUST be in English.

| 规范 | 说明 |
|------|------|
| 开发网络 | PAS (Polkadot Hub Testnet), Chain ID `420420417` |
| RPC | `https://services.polkadothub-rpc.com/testnet` |
| Explorer | `https://polkadot.testnet.routescan.io/` |
| Faucet | `https://faucet.polkadot.io/` |

### 2.3 系统架构图

```
┌──────────────────────────────────────────────────────────────────┐
│              React + Vite Frontend (SPA)                          │
│  i18n(6 langs) │ Mobile-first │ IPFS + GitHub Pages              │
└──────────────────────────┬───────────────────────────────────────┘
                           │ wagmi + viem
┌──────────────────────────▼───────────────────────────────────────┐
│             Polkadot Hub — Asset Hub (REVM)                       │
│                                                                    │
│  PolkaInkRegistry  ←→  VersionStore                               │
│         ↕                                                          │
│  GovernanceCore   ←→  VotingMath (library)                        │
│         ↕                                                          │
│  StakingManager   ←→  NFTReward                                   │
│         ↕                                                          │
│  ReportManager         Treasury                                    │
│                                                                    │
│  TimelockController ──→ ProxyAdmin (仅合约升级)                    │
│                                                                    │
│  Transaction calldata = Markdown content                           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. 智能合约架构

### 3.1 合约模块总览

| 合约 | 职责 | 升级 | 状态 |
|------|------|------|------|
| `PolkaInkRegistry` | 文档生命周期：创建、状态管理 | UUPS | 修改（增加 Frozen/Revoked 状态） |
| `VersionStore` | calldata 版本存储与索引 | UUPS | 保留 |
| `GovernanceCore` | 提案投票、权重计算、OG Gold veto | UUPS | **重大修改** |
| `StakingManager` | 88 DOT 质押/解锁、Member NFT | UUPS | **新增** |
| `ReportManager` | 举报/冻结/重投 | UUPS | **新增** |
| `NFTReward` | 6 种 NFT 管理 (ERC-721) | UUPS | **重大修改** |
| `Treasury` | DAO 资金池 | UUPS | 修改 |
| `VotingMath` | 投票权重计算 (library) | N/A | **重大修改** |
| `TimelockController` | 合约升级延时执行 | 不可升级 | 保留（仅用于升级） |
| `ProxyAdmin` | UUPS 代理管理 | 不可升级 | 保留 |
| ~~`ArchiveCouncil`~~ | ~~7人委员会~~ | — | **移除** |

### 3.2 目录结构

```
contracts/
├── contracts/
│   ├── core/
│   │   ├── PolkaInkRegistry.sol
│   │   ├── VersionStore.sol
│   │   └── interfaces/
│   ├── governance/
│   │   ├── GovernanceCore.sol          # 重写
│   │   ├── TimelockController.sol      # 保留
│   │   ├── StakingManager.sol          # 新增
│   │   ├── ReportManager.sol           # 新增
│   │   └── interfaces/
│   ├── token/
│   │   ├── NFTReward.sol               # 重写
│   │   └── interfaces/
│   ├── finance/
│   │   ├── Treasury.sol
│   │   └── interfaces/
│   ├── proxy/
│   │   └── ProxyAdmin.sol
│   └── libraries/
│       ├── CalldataLib.sol
│       ├── VotingMath.sol              # 重写
│       └── VersionTree.sol
├── scripts/
│   └── deploy/
│       └── deploy_all.ts
├── test/
├── hardhat.config.ts
└── package.json
```

### 3.3 Hardhat 配置

```typescript
// hardhat.config.ts (simplified — see actual file for anvil-polkadot local node config)
import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "@parity/hardhat-polkadot";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true },
  },
  networks: {
    // PolkaVM mode (resolc compiler)
    polkadotTestnet: {
      polkadot: true,
      url: "https://services.polkadothub-rpc.com/testnet",
      chainId: 420420417,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    // EVM mode (standard solc) — REVM deployment
    pasTestnet: {
      url: "https://services.polkadothub-rpc.com/testnet",
      chainId: 420420417,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
export default config;
```

---

### 3.4 新增合约接口

#### 3.4.1 IStakingManager

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IStakingManager {

    struct StakeInfo {
        uint256 amount;          // 质押金额 (88 DOT in wei)
        uint256 lockStart;       // 锁仓开始时间
        uint256 lockEnd;         // 锁仓结束时间
        uint8   lockMonths;      // 锁仓月数 (3/6/12/24)
        bool    active;          // 是否活跃（锁仓期内）
        uint256 memberNFTId;     // 对应的 Member NFT tokenId
    }

    /// @notice 质押 88 DOT 成为会员
    /// @param lockMonths 锁仓月数，必须是 3/6/12/24
    /// @dev msg.value 必须等于 STAKE_AMOUNT (88 DOT)
    function stake(uint8 lockMonths) external payable;

    /// @notice 锁仓到期后取回 DOT（需用户主动 claim）
    function unstake() external;

    /// @notice 提前解锁，扣除 10% penalty 进入 Treasury
    function earlyUnstake() external;

    /// @notice 查询质押信息
    function getStake(address user) external view returns (StakeInfo memory);

    /// @notice 是否为活跃会员（持有未过期 Member NFT）
    function isActiveMember(address user) external view returns (bool);

    /// @notice 查询活跃会员总数
    function totalActiveMembers() external view returns (uint256);

    // ─── Constants ───
    // STAKE_AMOUNT = 88e18  (88 DOT)
    // EARLY_UNLOCK_PENALTY = 10  (10%)
    // VALID_LOCK_MONTHS = [3, 6, 12, 24]

    event Staked(address indexed user, uint256 amount, uint8 lockMonths, uint256 lockEnd, uint256 memberNFTId);
    event Unstaked(address indexed user, uint256 amount);
    event EarlyUnstaked(address indexed user, uint256 returned, uint256 penalty);

    error Staking__InvalidLockMonths(uint8 provided);
    error Staking__WrongAmount(uint256 expected, uint256 provided);
    error Staking__AlreadyStaked(address user);
    error Staking__NotStaked(address user);
    error Staking__LockNotExpired(uint256 lockEnd, uint256 now_);
    error Staking__AlreadyExpired(uint256 lockEnd);
}
```

#### 3.4.2 IReportManager

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IReportManager {

    struct ReportStatus {
        uint256 docId;
        uint256 reportCount;        // 当前举报数
        uint256 threshold;          // 触发冻结阈值 max(3, floor(NO_voters × 1.5))
        bool    frozen;             // 是否已冻结
        uint256 freezeEnd;          // 冻结结束时间 (freeze 72h)
        uint256 revoteEnd;          // 重投结束时间 (revote 72h)
        uint256 yesVotes;           // 重投：维持票数
        uint256 noVotes;            // 重投：撤销票数
        uint256 voterCount;         // 重投参与人数
        uint8   reportRound;        // 当前举报轮次 (1 or 2, max 2)
        bool    finalized;
        bool    revoked;
    }

    /// @notice 举报已批准的文档（任何活跃 member）
    function report(uint256 docId) external;

    /// @notice 重新投票（冻结期结束后的 72h 内）
    /// @param support true=维持, false=撤销
    /// @dev 无 boost，无 veto，1 member = 1 vote
    function revote(uint256 docId, bool support) external;

    /// @notice 结算重投结果（重投期结束后任何人可调用）
    function finalize(uint256 docId) external;

    function getReportStatus(uint256 docId) external view returns (ReportStatus memory);

    // ─── Constants ───
    // FREEZE_DURATION = 72 hours
    // REVOTE_DURATION = 72 hours
    // REVOTE_QUORUM = 5
    // MAX_REPORTS_PER_DOC = 2

    event DocReported(uint256 indexed docId, address reporter, uint256 reportCount, uint256 threshold);
    event DocFrozen(uint256 indexed docId, uint256 freezeEnd, uint256 revoteEnd);
    event RevoteCast(uint256 indexed docId, address voter, bool support);
    event DocMaintained(uint256 indexed docId, uint256 yesVotes, uint256 noVotes);
    event DocRevoked(uint256 indexed docId, uint256 yesVotes, uint256 noVotes);

    error Report__DocNotApproved(uint256 docId);
    error Report__NotActiveMember(address caller);
    error Report__MaxReportsReached(uint256 docId);
    error Report__AlreadyReported(address reporter, uint256 docId);
    error Report__NotInRevotePeriod(uint256 docId);
    error Report__AlreadyRevoted(address voter, uint256 docId);
    error Report__RevoteNotEnded(uint256 docId);
    error Report__QuorumNotReached(uint256 actual, uint256 required);
}
```

---

### 3.5 修改合约接口

#### 3.5.1 IGovernanceCore (v2)

关键变更：新投票权重、OG Gold veto、移除提案质押和 Council 审查。

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IGovernanceCore {

    enum ProposalType {
        VersionUpdate,     // 文档版本更新
        UpgradeContract,   // 合约升级（需 Timelock）
        ParameterChange    // 参数变更（需 Timelock）
    }

    enum ProposalStatus {
        Active,            // 投票中 (7 days)
        Approved,          // 通过 (score > T)
        Rejected,          // 否决 (score ≤ T)
        Vetoed,            // OG Gold veto
        Executed,          // 已执行
        Cancelled          // 提案人取消（仅 Active 前可取消）
    }

    struct Proposal {
        uint256 id;
        ProposalType proposalType;
        address proposer;
        uint256 docId;               // 关联文档 (非文档类为 0)
        uint256 targetVersionId;
        int256  score;               // Σ(vote_i × weight_i), scaled 1e18
        uint256 startTime;
        uint256 endTime;
        ProposalStatus status;
        bytes   callData;            // 升级/参数变更用
        string  description;
        bool    goldVetoed;          // 是否被 OG Gold veto
        uint256 noVoterCount;        // NO 投票者数量（用于举报阈值）
    }

    enum VoteChoice { Yes, No, Abstain }

    struct VoteRecord {
        bool       hasVoted;
        VoteChoice choice;
        uint256    weight;           // 投票时的 weight (1e18)
        uint256    timestamp;
    }

    // ─── 写操作 ───

    /// @notice 用户直接创建提案（msg.sender 作为 proposer，需 active Member NFT）
    function createProposal(
        ProposalType proposalType,
        uint256 docId,
        uint256 targetVersionId,
        bytes calldata callData,
        string calldata description
    ) external returns (uint256 proposalId);

    /// @notice Registry 代用户创建提案（仅 REGISTRY_ROLE 可调用）
    /// @param proposer 实际提案人地址（Member NFT 检查针对此地址）
    function createProposalFor(
        address proposer,
        ProposalType proposalType,
        uint256 docId,
        uint256 targetVersionId,
        bytes calldata callData,
        string calldata description
    ) external returns (uint256 proposalId);

    /// @notice 投票 (YES=+weight, NO=-weight, ABSTAIN=0)
    /// @dev OG Gold 投 NO → 直接 veto（仅普通投票，re-vote 不适用）
    function vote(uint256 proposalId, VoteChoice choice) external;

    /// @notice 取消提案（仅提案人，仅 Active 状态）
    function cancelProposal(uint256 proposalId) external;

    /// @notice 结算提案（投票期结束后任何人可调用）
    /// @dev 检查 score > THRESHOLD (2.0) && !goldVetoed
    function finalizeProposal(uint256 proposalId) external;

    /// @notice 执行已通过提案（VersionUpdate: 立即执行; Upgrade/Param: 走 Timelock）
    function executeProposal(uint256 proposalId) external;

    // ─── 读操作 ───

    function getProposal(uint256 proposalId) external view returns (Proposal memory);
    function getVoteRecord(uint256 proposalId, address voter) external view returns (VoteRecord memory);
    function getVotingWeight(address voter, uint256 docId) external view returns (uint256 weight);
    function totalProposals() external view returns (uint256);
    function listProposals(ProposalStatus filter, uint256 offset, uint256 limit)
        external view returns (Proposal[] memory, uint256 total);

    // ─── 治理常量 ───
    // VOTING_PERIOD = 7 days
    // THRESHOLD = 2e18 (2.0 scaled)
    // TIMELOCK_DELAY = 48 hours (仅 Upgrade/Param)

    event ProposalCreated(uint256 indexed proposalId, address indexed proposer,
        ProposalType proposalType, uint256 indexed docId, uint256 startTime, uint256 endTime);
    event VoteCast(uint256 indexed proposalId, address indexed voter,
        VoteChoice choice, uint256 weight);
    event ProposalFinalized(uint256 indexed proposalId, ProposalStatus status, int256 score);
    event ProposalExecuted(uint256 indexed proposalId);
    event GoldVeto(uint256 indexed proposalId, address indexed goldHolder);
}
```

#### 3.5.2 INFTReward (v2)

6 种 NFT 类型，替代旧版双类型系统。

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface INFTReward {

    enum NFTType { Member, Creator, Author, OGBronze, OGSilver, OGGold }

    struct NFTMetadata {
        uint256 tokenId;
        NFTType nftType;
        address holder;
        uint256 mintedAt;
        // Member 专用
        uint256 lockEnd;             // 0 = non-Member
        // Creator/Author 专用
        uint256 linkedDocId;         // 关联文档 ID
        uint256 linkedProposalId;    // 关联提案 ID
        // 状态
        bool    active;              // Member: lockEnd 后 false; OG: 可被 revoke
    }

    // ─── Mint (仅授权合约可调用) ───

    /// @notice StakingManager 调用：铸造 Member NFT
    function mintMemberNFT(address to, uint256 lockEnd) external returns (uint256);

    /// @notice GovernanceCore 调用：提案通过时铸造 Creator NFT
    function mintCreatorNFT(address to, uint256 docId, uint256 proposalId) external returns (uint256);

    /// @notice PolkaInkRegistry 调用：文档创建时铸造 Author NFT
    function mintAuthorNFT(address to, uint256 docId) external returns (uint256);

    /// @notice Admin 调用：空投 OG NFT
    function mintOGNFT(address to, NFTType ogType) external returns (uint256);

    /// @notice 停用 NFT（Member 到期、OG revoke）
    function deactivate(uint256 tokenId) external;

    /// @notice Admin 撤销 OG Gold（恶意行为时）
    function revokeOGGold(uint256 tokenId) external;

    // ─── 读操作 ───

    function getNFTMetadata(uint256 tokenId) external view returns (NFTMetadata memory);
    function getNFTsByHolder(address holder) external view returns (uint256[] memory);
    function getNFTsByType(address holder, NFTType nftType) external view returns (uint256[] memory);

    /// @notice 查询 holder 持有的活跃 Creator NFT 数量
    function activeCreatorCount(address holder) external view returns (uint256);

    /// @notice 查询 holder 是否为某文档的 Author
    function isAuthorOf(address holder, uint256 docId) external view returns (bool);

    /// @notice 查询 holder 持有的 OG 数量（按类型）
    function ogCount(address holder, NFTType ogType) external view returns (uint256);

    /// @notice 查询 holder 是否持有活跃 OG Gold
    function hasActiveOGGold(address holder) external view returns (bool);

    /// @notice 查询 holder 是否持有活跃 Member NFT
    function hasActiveMember(address holder) external view returns (bool);

    // OG NFT 上限
    // OGBronze: max 3 per address
    // OGSilver: max 2 per address
    // OGGold:   max 1 per address

    event NFTMinted(uint256 indexed tokenId, address indexed holder, NFTType nftType, uint256 docId);
    event NFTDeactivated(uint256 indexed tokenId, NFTType nftType);
    event OGGoldRevoked(uint256 indexed tokenId, address indexed holder);
}
```

#### 3.5.3 VotingMath (library)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title VotingMath
/// @notice 投票权重计算库，使用 lookup table 近似 ln()
library VotingMath {

    uint256 constant SCALE = 1e18;

    /// @notice 计算投票权重
    /// @return weight = has_active_member × (SCALE + boost), 0 if not member
    function calculateWeight(
        bool   hasActiveMember,
        uint256 creatorCount,
        bool   isAuthorOfDoc,
        uint256 ogBronzeCount,  // max 3
        uint256 ogSilverCount,  // max 2
        bool   hasOGGold,
        uint8  lockMonths       // 3/6/12/24
    ) internal pure returns (uint256 weight);

    /// @dev B_creator = 0.30 × ln(1 + creatorCount) / ln(11)
    ///      NOT capped — grows logarithmically beyond 10.
    ///      Lookup table (1e18 scaled, practical cap at 50 entries):
    ///      [0]=0, [1]=0.0867, [2]=0.1374, [3]=0.1734, [5]=0.2242,
    ///      [10]=0.3000, [20]=0.3753, [50]=0.4919
    function boostCreator(uint256 creatorCount) internal pure returns (uint256);

    /// @dev B_author = 0.15 if isAuthor, else 0
    function boostAuthor(bool isAuthor) internal pure returns (uint256);

    /// @dev B_og = 0.05 × min(bronze, 3) + 0.10 × min(silver, 2) + 0.10 × hasGold
    function boostOG(uint256 bronze, uint256 silver, bool gold) internal pure returns (uint256);

    /// @dev B_lock = 0.30 × ln(1 + lockMonths) / ln(25)
    ///      Lookup (1e18 scaled): 3mo=0.1292, 6mo=0.1814, 12mo=0.2390, 24mo=0.3000
    function boostLock(uint8 lockMonths) internal pure returns (uint256);

    /// @notice 检查提案是否通过
    /// @return passed true if score > THRESHOLD && !vetoed
    function checkPassed(int256 score, bool goldVetoed) internal pure returns (bool);

    // THRESHOLD = 2e18 (2.0)
}
```

---

### 3.6 保留合约接口（无重大变更）

#### IPolkaInkRegistry

基于 v1 接口（见 `contracts/contracts/core/interfaces/IPolkaInkRegistry.sol`），v2 变更：
- `DocumentStatus` 增加 `Frozen`, `Revoked` 枚举值
- `createDocument()` 增加 Member NFT 检查 + 自动铸造 Author NFT
- `proposeVersion()` 变为 **非 payable**（v1 是 payable，v2 移除提案质押）
- `VersionProposed` 事件移除 `stakeAmount` 字段
- 移除 `Registry__InsufficientStake` 错误（不再需要）
- 新增 `Registry__NotActiveMember` 错误
- 新增 `Registry__DocumentFrozen` / `Registry__DocumentRevoked` 错误
- 新增 `setDocumentStatus(uint256 docId, DocumentStatus status)` — 仅 REPORT_ROLE 可调用
- 内部调用 `GovernanceCore.createProposalFor(msg.sender, ...)` 传递真实提案人地址

#### IVersionStore

不变。

#### ITreasury

基于 v1 接口（见 `contracts/contracts/finance/interfaces/ITreasury.sol`），v2 变更：
- `SpendCategory.CouncilOperations` → 重命名为 `CommunityRewards`（无 Council）
- `receive()` — 接收 early-unlock penalties、社区捐赠
- `balance()` / `getTotals()` / `listSpendRecords()` — 保持
- Phase 2 新增 DeFi yield 相关（后续迭代）

---

### 3.7 合约间调用关系

```
用户
 ├─→ StakingManager.stake()                → NFTReward.mintMemberNFT()
 │                                          → (88 DOT 留在 StakingManager 合约内)
 ├─→ StakingManager.unstake()              → (到期后 88 DOT 退还用户)
 ├─→ StakingManager.earlyUnstake()         → 79.2 DOT 退用户, 8.8 DOT → Treasury
 │
 ├─→ PolkaInkRegistry.createDocument()     → NFTReward.mintAuthorNFT()
 ├─→ PolkaInkRegistry.proposeVersion()     → GovernanceCore.createProposalFor(user, ...)
 │                                          → VersionStore.storeVersion()
 │
 ├─→ GovernanceCore.vote()                 → VotingMath.calculateWeight()
 │                                          → NFTReward (查询 NFT 信息)
 │                                          → StakingManager.isActiveMember()
 ├─→ GovernanceCore.finalizeProposal()     → 检查 score > T, goldVeto
 ├─→ GovernanceCore.executeProposal()      → PolkaInkRegistry.mergeProposal()
 │                                          → NFTReward.mintCreatorNFT()
 │
 ├─→ ReportManager.report()               → 检查 reportCount ≥ threshold → 冻结
 ├─→ ReportManager.revote()               → 1 member = 1 vote, 无 boost
 ├─→ ReportManager.finalize()             → PolkaInkRegistry.setDocumentStatus()
 │
 └─→ TimelockController (仅合约升级/参数变更)
      └─→ ProxyAdmin.upgrade()
```

### 3.8 错误码汇总

```solidity
// Staking
error Staking__InvalidLockMonths(uint8);
error Staking__WrongAmount(uint256 expected, uint256 provided);
error Staking__AlreadyStaked(address);
error Staking__NotStaked(address);
error Staking__LockNotExpired(uint256 lockEnd, uint256 now_);

// Governance
error Gov__NotActiveMember(address);
error Gov__ProposalNotFound(uint256);
error Gov__ProposalNotActive(uint256);
error Gov__AlreadyVoted(address, uint256);
error Gov__VotingNotEnded(uint256);
error Gov__NotProposer(address);

// Report
error Report__DocNotApproved(uint256);
error Report__NotActiveMember(address);
error Report__MaxReportsReached(uint256);
error Report__NotInRevotePeriod(uint256);
error Report__QuorumNotReached(uint256, uint256);

// Registry
error Registry__DocumentNotFound(uint256);
error Registry__DocumentFrozen(uint256);
error Registry__DocumentRevoked(uint256);
error Registry__NotActiveMember(address);
error Registry__InvalidTitle();
error Registry__TooManyTags(uint256);
error Registry__Unauthorized();

// NFT
error NFT__Unauthorized();
error NFT__OGCapReached(address, uint8);
error NFT__NotActive(uint256);
```

---

## 4. 治理机制

### 4.1 投票权重公式

```
weight = has_active_member × (1 + boost)

boost = B_creator + B_author + B_og + B_lock

  B_creator = 0.30 × ln(1 + creator_count) / ln(11)     // 无上限，对数增长（10→0.30, 50→0.49）
  B_author  = 0.15 × is_author_of_current_doc            // 0 or 0.15
  B_og      = 0.05 × min(og_bronze, 3)                   // 最大 0.15
            + 0.10 × min(og_silver, 2)                    // 最大 0.20
            + 0.10 × has_og_gold                          // 最大 0.10
  B_lock    = 0.30 × ln(1 + lock_months) / ln(25)        // 3mo=0.13, 6mo=0.18, 12mo=0.24, 24mo=0.30
```

Tokenomics 参考值：max boost ≈ 1.35 → max weight ≈ 2.35（50 creator 场景下约 1.39）。
实际上限约 1.62（10 creator, gold, 12mo）。Lookup table 实现中 creatorCount 建议 cap 50。

### 4.2 通过条件

```
1. 若任一 OG Gold 投 NO → 直接 VETOED
2. 否则：Σ(vote_i × weight_i) > 2.0
```

- YES = +weight, NO = -weight, ABSTAIN = 0
- Author 可以对自己的提案投票
- T=2.0 意味着至少需要约 2 个支持者

### 4.3 OG Gold Veto 范围与限制

- **仅在普通投票**中有效 — re-vote（举报重投）为纯民主（无 veto）
- OG Gold 由团队空投给 ≤ 3 个受信任个人
- Admin 可通过合约角色撤销 OG Gold（恶意行为时）
- 仅显式 NO 触发 veto；ABSTAIN / 不投票 = 无效果

### 4.4 文档生命周期

```
Created → Vote (7d) → Approved / Rejected / Vetoed
Approved → Reported → Frozen (72h) → Re-vote (72h) → Maintained / Revoked
```

### 4.5 Freeze & Report

- **触发**：`reports ≥ max(3, floor(original_NO_voters × 1.5))`
- **冻结**：72h（文档显示为 Frozen 状态）
- **重投**：72h，**无 boost、无 veto**，1 member = 1 vote，quorum ≥ 5
- **结果**：YES > NO → 维持，否则撤销
- 每文档最多举报 2 轮

---

## 5. NFT 系统

| NFT | 获取方式 | 可叠加 | 过期 | 投票影响 |
|-----|---------|--------|------|---------|
| **Member** | 质押 88 DOT | 1/地址 | 锁仓到期 → 仅纪念 | 必须持有才能投票 |
| **Creator** | 提案通过自动铸造 | 是 | 永久 | B_creator (对数) |
| **Author** | 文档创建自动铸造 | 1/文档 | 永久 | B_author=0.15（仅该文档） |
| **OG Bronze** | 团队空投 | 是(cap 3) | 永久 | +0.05/个 |
| **OG Silver** | 团队空投 | 是(cap 2) | 永久 | +0.10/个 |
| **OG Gold** | 团队空投(极少) | 1/人 | 永久 | +0.10, **NO=veto** |

TokenURI 仍为链上 SVG 生成（Polkadot 粉色主题），各类型使用不同配色。

---

## 6. 经济模型

### 6.1 Treasury 资金流

```
In:
  ├── early-unlock penalties (8.8 DOT per early unstake, 由 StakingManager 转入)
  └── 社区捐赠 / Grant 等

Out:
  └── community rewards

注意：88 DOT 质押金由 StakingManager 合约直接持有（非 Treasury），
到期后用户调用 unstake() 从 StakingManager 取回。

Phase 2 (DeFi yield):
  └── 50% creator rewards + 30% reserve + 20% voter rewards
```

### 6.2 常量表

| 参数 | 值 |
|------|-----|
| Stake | 88 DOT |
| Lock options | 3 / 6 / 12 / 24 months |
| Early unlock penalty | 10% |
| Voting period | 7 days |
| Threshold (T) | 2.0 |
| OG Bronze boost | 0.05/ea (cap 3) |
| OG Silver boost | 0.10/ea (cap 2) |
| OG Gold boost | 0.10 + veto on NO |
| Freeze | 72h + 72h re-vote |
| Re-vote quorum | 5 voters |
| Report trigger | max(3, 1.5× NO voters) |
| Max reports/doc | 2 |

---

## 7. 前端架构

### 7.1 现有前端概况

前端已完成基础建设，UI 风格良好。以下修改 **尽量复用已有组件和页面**，不轻易新建。

技术栈：React 18 + Vite + TS + Tailwind v4 + viem v2 + wagmi v2 + i18next

### 7.2 路由变更

| 路由 | 页面 | 变更 |
|------|------|------|
| `/` | Home | 保持，仅更新统计项 |
| `/library` | Library | 小改：增加举报按钮 |
| `/document/:id` | Document | 小改：增加举报按钮 + 冻结状态 |
| `/create` | Create | 小改：增加 Member 检查 |
| `/propose/:docId` | Propose | 修改：移除 StakeInput，增加 Member 检查 |
| `/governance` | Governance | 修改：新投票 UI (weight/score/veto) |
| `/governance/:id` | ProposalDetail | 修改：同上 |
| `/profile/:address` | Profile | 修改：6 种 NFT 展示 + 质押信息 |
| `/council` | Council → Guardians | 修改：简化为 OG Gold 持有者 + veto 历史 |
| `/treasury` | Treasury | 修改：新收支模型 |
| `/staking` | **新增** Staking | 88 DOT 质押、锁仓选择、解锁 |
| `/polkaclaw` | PolkaClaw | 不变 |

### 7.3 目录结构变更

```
frontend/src/
├── pages/
│   ├── Home/                    # 不变
│   ├── Library/                 # 小改
│   ├── Document/                # 小改 (增加 ReportButton)
│   ├── Create/                  # 小改
│   ├── Propose/                 # 修改 (移除 StakeInput)
│   ├── Governance/              # 修改 (新 VotePanel, score 显示)
│   ├── Profile/                 # 修改 (新 NFT 类型, StakingInfo)
│   ├── Council/                 # 修改 → 简化为 OG Guardians
│   ├── Treasury/                # 修改
│   ├── Staking/                 # ★ 新增
│   │   ├── index.tsx            # 质押主页
│   │   ├── StakeForm.tsx        # 质押表单 (88 DOT + 锁仓期选择)
│   │   ├── StakeStatus.tsx      # 当前质押状态
│   │   └── UnstakePanel.tsx     # 解锁操作
│   └── PolkaClaw/               # 不变
├── hooks/
│   ├── useStaking.ts            # ★ 新增: StakingManager 交互
│   ├── useReport.ts             # ★ 新增: ReportManager 交互
│   ├── useMembership.ts         # ★ 新增: 会员状态 + boost 查询
│   ├── useVote.ts               # 修改: 适配 VoteChoice enum
│   ├── useVotingPower.ts        # 修改: 适配 weight 公式
│   ├── useCouncil.ts            # 修改: 简化为 OG Gold 查询
│   └── ... (其余保留)
├── lib/contracts/
│   ├── abis/
│   │   ├── StakingManager.json  # ★ 新增
│   │   ├── ReportManager.json   # ★ 新增
│   │   ├── GovernanceCore.json  # 更新
│   │   ├── NFTReward.json       # 更新
│   │   └── ... (其余保留)
│   └── addresses.ts             # 增加 StakingManager, ReportManager 地址
└── ... (其余结构不变)
```

### 7.4 页面修改详情

#### Home（不变）
仅在 StatsBar 中增加 "Members" 统计，调用 `StakingManager.totalActiveMembers()`。

#### Governance（重点修改）
- 提案卡片显示 `Score: +3.42 / T=2.0` 而非百分比
- 投票按钮改为三选一：YES / NO / ABSTAIN
- 显示当前用户的 weight 分解（base + boost breakdown）
- OG Gold veto 状态指示器
- 移除 Council 审查进度（已无 Council）

#### Profile（重点修改）
- NFT Gallery 展示 6 种类型，分区显示
- 新增 Staking 信息卡：质押金额、锁仓到期时间、状态
- Member NFT 到期后显示为 commemorative 样式

#### Staking（新增页面）
- 参考现有 Treasury / Profile 页面 UI 风格
- 核心组件：
  - StakeForm: 锁仓期选择器 (3/6/12/24 月)，"质押 88 DOT" 按钮
  - StakeStatus: 当前质押信息（金额、到期时间、倒计时）
  - UnstakePanel: 到期解锁 / 提前解锁（显示 10% penalty 警告）

#### Council → OG Guardians（简化）
- 移除选举面板（ElectionPanel）
- 移除成员管理
- 保留：OG Gold 持有者列表 + veto 历史记录
- 增加 OG Bronze/Silver 持有者列表（参考信息）

---

## 8. 部署

### 8.1 部署顺序

```
1. ProxyAdmin
2. TimelockController
3. NFTReward (v2)
4. VersionStore
5. StakingManager (新)
6. PolkaInkRegistry (v2)
7. GovernanceCore (v2)
8. ReportManager (新)
9. Treasury (v2)
10. Setup Cross-References + Roles
```

> **循环依赖处理**：Registry 需要 GovernanceCore 地址（createProposalFor），GovernanceCore 需要 Registry 地址（mergeProposal）。采用 UUPS 模式：先部署所有代理合约，再在 Step 10 中通过 setter 函数配置跨合约引用和角色。

### 8.2 角色权限设置

```
NFTReward.grantRole(MEMBER_MINTER, StakingManager)
NFTReward.grantRole(CREATOR_MINTER, GovernanceCore)
NFTReward.grantRole(AUTHOR_MINTER, PolkaInkRegistry)
NFTReward.grantRole(OG_MINTER, Admin)          // 仅初始空投用

GovernanceCore.grantRole(REGISTRY_ROLE, PolkaInkRegistry)  // Registry 调用 createProposalFor
PolkaInkRegistry.grantRole(GOVERNANCE_ROLE, GovernanceCore) // GovernanceCore 调用 mergeProposal
PolkaInkRegistry.grantRole(REPORT_ROLE, ReportManager)      // ReportManager 调用 setDocumentStatus

ProxyAdmin.transferOwnership(TimelockController)

// 注意：StakingManager 持有 DOT 自行管理，early-unlock penalty 通过
// payable transfer 直接发送给 Treasury（Treasury.receive()），无需特殊角色。
// ReportManager 读取 GovernanceCore 的 noVoterCount 通过 view 函数，无需角色。
```

---

## 9. Calldata 存储机制

与 v1 一致：Markdown 内容 gzip 压缩后作为 calldata 写入交易。超过 100KB 自动分片。

```json
{
  "schema": "polkaink/v2",
  "docId": 42,
  "versionId": 156,
  "contentHash": "sha256:...",
  "encoding": "gzip+utf8",
  "markdown": "<base64-gzip-content>"
}
```

---

## 10. 安全设计

| 威胁 | 防护 |
|------|------|
| 闪电贷 | 质押锁仓 (3-24个月)，非余额快照 |
| 女巫攻击 | 88 DOT 经济门槛 |
| 恶意 veto | OG Gold ≤3 人，admin 可撤销 |
| 合约升级滥用 | TimelockController 48h + DAO 投票 |
| 举报滥用 | 仅 active member 可举报，max 2 轮/文档 |

---

*PolkaInk Design Document v2.0*
*Write history on-chain. Memory that cannot be erased.*
