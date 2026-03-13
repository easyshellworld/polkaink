# ◎ PolkaInk — 项目设计书 v3.4

**On-Chain Polkadot History Preservation Protocol**
*Version 3.4 · 2026-03 · Tokenomics v3.4*

> All proposals are pull requests against a single linear history.
> Community votes decide what gets merged. History, once written, cannot be deleted.

> **注：MVP 阶段运行于 Polkadot Hub 测试网（Chain ID 420420417），所有金额单位为测试网原生代币 PAS。正式上线主网后将迁移为 DOT。**

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术架构](#2-技术架构)
3. [智能合约架构](#3-智能合约架构)
4. [治理机制](#4-治理机制)
5. [NFT 系统](#5-nft-系统)
6. [文档与版本模型](#6-文档与版本模型)
7. [Archive Council](#7-archive-council)
8. [经济模型](#8-经济模型)
9. [前端架构](#9-前端架构)
10. [部署](#10-部署)
11. [Calldata 存储机制](#11-calldata-存储机制)
12. [安全设计](#12-安全设计)
13. [PolkaInk Agent Skill](#13-polkaink-agent-skill)

---

## 1. 项目概述

PolkaInk 是运行在 Polkadot Asset Hub 上的开放历史记录协议。以交易 calldata 为存储媒介，将 Polkadot 生态历史文档（Markdown）直接写入链上，通过**质押成员制 + 社区投票**确保内容共识。

### v3.4 相对 v3.3 的核心变化

| 变化项 | 说明 |
|--------|------|
| **移除"不可替换"措辞** | 系统架构图、安全设计等处移除"不可替换"表述，明确为"Phase 1 迁移前由创世地址固定持有，Phase 1 后过渡至选举制" |
| **安全设计表权重描述修正** | `max weight` 明确区分：硬上限 cap=2.00，单人最大实际权重=1.80 |
| **Dev doc §7.2 补充内容** | 不再悬空引用 Tokenomics，直接在 Dev doc 中完整描述职责边界 |
| **历史变更说明保留** | Tokenomics §4.1 保留 v3.2 变更说明并新增 v3.3/v3.4 变更说明 |

### v3.3 相对 v3.2 的核心变化

| 变化项 | 说明 |
|--------|------|
| **零特权管理员** | 部署完成后协议中不存在任何特权管理员；Guardian NFT 在构造函数中直接 mint，无 GUARDIAN_MINTER_ROLE；SEED_CREATOR_ROLE 在种子文档创建后立即 renounce |
| **Council 创世成员固定** | 移除 setMember()，7 个创世成员地址写入构造函数；Phase 1 前无人可替换，Phase 1 起由选举合约管理 |
| **Council 津贴简化** | 由条件领取改为固定无条件发放（每 Epoch 5 PAS/人），移除响应率要求和 acknowledgeProposal() |
| **CouncilVetoed 增加冷却期** | veto 后提案人对同一文档有 72h 冷却期（与 Rejected 一致） |
| **VersionUpdate 专属奖励** | 明确仅 VersionUpdate 类型触发奖励分配；UpgradeContract / ParameterChange 执行后退还质押，不发奖励 |
| **动态奖励投票人数口径统一** | 统计全部实际参与投票人数，不过滤门槛 |
| **国库余额不足暂停奖励** | rewardPoolBalance < 50 PAS 时跳过奖励分配，提案照常 merge |
| **任何人可向 rewardPool 捐款** | depositRewardPool() 无权限限制，receive() 同样进入 rewardPool |
| **种子文档首版仅含标题** | createSeedDocument() 只写入标题和标签，内容为空，后续提案填充 |
| **Epoch 时间明确** | 部署时记录起始 timestamp，每 30×86400 秒一个 Epoch，epochId 从 0 递增 |
| **B_lock 精确值修正** | 12mo 从 0.319 修正为 0.3187，所有值加注精确值以合约为准 |
| **MVP 测试时间压缩** | 新增 MVP 测试值参数列，时间参数大幅压缩便于测试 |

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

| 规范 | 值 |
|------|-----|
| 开发网络 | PAS (Polkadot Hub Testnet), Chain ID `420420417` |
| RPC | `https://services.polkadothub-rpc.com/testnet` |
| Explorer | `https://polkadot.testnet.routescan.io/` |
| Faucet | `https://faucet.polkadot.io/` |

### 2.3 系统架构图

```
┌──────────────────────────────────────────────────────────────────┐
│              React + Vite Frontend (SPA)                          │
│  i18n(6 langs) · Mobile-first · Git-style Doc UI                 │
│  Social Share（Twitter/X · Telegram · Copy Link）                 │
└──────────────────────────┬───────────────────────────────────────┘
                           │ wagmi + viem
┌──────────────────────────▼───────────────────────────────────────┐
│             Polkadot Asset Hub (REVM)                             │
│                                                                    │
│  PolkaInkRegistry ──── VersionStore  (parentVersionId DAG)        │
│         │                                                          │
│  GovernanceCore  ──── VotingMath (library)                        │
│         │                                                          │
│  ArchiveCouncil  ──── StakingManager ──── NFTReward               │
│  （创世7成员，Phase 1 前固定持有，Phase 1 后过渡至选举制）           │
│         │                                                          │
│         └──────────── Treasury（任何人可捐款至 rewardPool）         │
│                                                                    │
│  TimelockController ─→ ProxyAdmin  (合约升级专用，不可升级)         │
│                                                                    │
│  部署完成后：零特权管理员，完全合约逻辑驱动                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. 智能合约架构

### 3.1 合约模块总览

| 合约 | 职责 | 升级 | v3.3 状态 |
|------|------|------|----------|
| `PolkaInkRegistry` | 文档生命周期管理 | UUPS | **修改**：createSeedDocument 后 renounce SEED_CREATOR_ROLE |
| `VersionStore` | calldata 版本存储 | UUPS | 保留 |
| `GovernanceCore` | 提案投票、VersionUpdate 专属奖励、余额不足跳过 | UUPS | **修改** |
| `ArchiveCouncil` | 创世 7 成员（构造写入）、veto、紧急冻结、固定津贴 | UUPS | **修改**：移除 setMember / acknowledgeProposal |
| `StakingManager` | 88 PAS 质押/解锁 | UUPS | 保留 |
| `NFTReward` | 3 种 NFT，Guardian 在构造中 mint | UUPS | **修改**：无 GUARDIAN_MINTER_ROLE |
| `Treasury` | rewardPool、Epoch 奖励、Council 固定津贴、开放捐款 | UUPS | **修改** |
| `VotingMath` | 权重计算 library（B_hist + B_lock） | N/A | **修改**：calculateProposalReward 口径统一 |
| `TimelockController` | 合约升级延时执行 | 不可升级 | 保留 |
| `ProxyAdmin` | UUPS 代理管理 | 不可升级 | 保留 |

### 3.2 目录结构

```
contracts/
├── contracts/
│   ├── core/
│   │   ├── PolkaInkRegistry.sol        # 修改：SEED_CREATOR_ROLE renounce 逻辑
│   │   ├── VersionStore.sol
│   │   └── interfaces/
│   │       ├── IPolkaInkRegistry.sol
│   │       └── IVersionStore.sol
│   ├── governance/
│   │   ├── GovernanceCore.sol          # 修改：VersionUpdate 专属奖励，余额不足跳过
│   │   ├── ArchiveCouncil.sol          # 修改：移除 setMember/acknowledgeProposal，固定津贴
│   │   ├── TimelockController.sol
│   │   ├── StakingManager.sol
│   │   └── interfaces/
│   │       ├── IGovernanceCore.sol
│   │       ├── IArchiveCouncil.sol
│   │       └── IStakingManager.sol
│   ├── token/
│   │   ├── NFTReward.sol               # 修改：构造函数 mint Guardian，无 GUARDIAN_MINTER_ROLE
│   │   └── interfaces/
│   │       └── INFTReward.sol
│   ├── finance/
│   │   ├── Treasury.sol                # 修改：开放捐款，固定 Council 津贴，余额不足逻辑
│   │   └── interfaces/
│   │       └── ITreasury.sol
│   ├── proxy/
│   │   └── ProxyAdmin.sol
│   └── libraries/
│       ├── CalldataLib.sol
│       ├── VotingMath.sol              # 修改：calculateProposalReward 全量人数
│       └── VersionTree.sol
├── scripts/deploy/
│   ├── deploy_all.ts
│   └── seed_documents.ts
├── test/
└── hardhat.config.ts
```

### 3.3 Hardhat 配置

```typescript
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
    pasTestnet: {
      polkadot: true,
      url: "https://services.polkadothub-rpc.com/testnet",
      chainId: 420420417,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
export default config;
```

---

### 3.4 合约接口

#### 3.4.1 IArchiveCouncil (v3.3)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IArchiveCouncil v3.3
/// @notice 创世 7 成员在构造函数中写入，Phase 1 前无法替换，Phase 1 后由选举合约管理。
///         移除 setMember()，移除 acknowledgeProposal()。
///         Council 津贴固定发放，无条件限制。
interface IArchiveCouncil {

    enum VetoReason {
        FalseHistory,
        MaliciousUpgrade,
        LegalRisk,
        HateSpeech
    }

    struct VetoRecord {
        uint256    proposalId;
        address[]  vetoVoters;
        uint256    vetoTime;
        VetoReason reason;
        string     description;     // ≥ 50 bytes，永久链上记录
    }

    struct FreezRecord {
        uint256    docId;
        address[]  freezeVoters;
        uint256    freezeTime;
        uint256    confirmDeadline; // 72h DAO 确认截止
        VetoReason reason;
        string     description;
        bool       confirmed;
        bool       autoUnfrozen;
    }

    struct CouncilVoteRecord {
        bool    hasVoted;
        bool    isAgainst;
        uint256 timestamp;
    }

    // ─── Veto ───

    /// @notice Council 成员对 Approved 提案投否决票（24h 窗口内）
    function castVeto(
        uint256    proposalId,
        VetoReason reason,
        string calldata description
    ) external;

    // ─── 紧急冻结 ───

    /// @notice Council 成员对已执行文档投紧急冻结票
    function castEmergencyFreeze(
        uint256    docId,
        VetoReason reason,
        string calldata description
    ) external;

    /// @notice 任何人可调用：检查紧急冻结是否超时未确认，若是则自动解冻
    function checkAndAutoUnfreeze(uint256 docId) external;

    // ─── Council 成员固定津贴（v3.3：无条件领取）───

    /// @notice Council 成员在 Epoch 结束后领取固定津贴
    /// @dev 无响应率要求，无参与条件，纯固定发放
    ///      每人每 Epoch 5 PAS，由 Treasury.distributeCouncilAllowance() 转账
    /// @param epochId 目标 Epoch ID
    function claimCouncilAllowance(uint256 epochId) external;

    // ─── 治理迁移 ───

    /// @notice 将 Council 控制权移交给选举合约（不可逆，由 DAO 提案触发）
    /// @dev 调用后 vetoThreshold 自动降为 4/7
    function transferControlToElection(address electionContract) external;

    // ─── 读操作 ───

    function getMembers() external view returns (address[] memory);
    function isMember(address addr) external view returns (bool);
    function vetoThreshold() external view returns (uint256);
    function getVetoRecord(uint256 proposalId)
        external view returns (VetoRecord memory);
    function getFreezeRecord(uint256 docId)
        external view returns (FreezRecord memory);
    function getCouncilVote(uint256 proposalId, address member)
        external view returns (CouncilVoteRecord memory);
    function isControlTransferred() external view returns (bool);
    function isAllowanceClaimed(address member, uint256 epochId)
        external view returns (bool);

    event VetoCast(uint256 indexed proposalId, address indexed member,
        VetoReason reason, uint256 currentCount);
    event ProposalVetoed(uint256 indexed proposalId,
        address[] vetoVoters, VetoReason reason);
    event EmergencyFreezeCast(uint256 indexed docId, address indexed member,
        uint256 currentCount);
    event EmergencyFreezeTriggered(uint256 indexed docId,
        address[] freezeVoters, VetoReason reason, uint256 confirmDeadline);
    event EmergencyFreezeConfirmed(uint256 indexed docId);
    event EmergencyFreezeAutoUnfrozen(uint256 indexed docId);
    event CouncilAllowanceClaimed(address indexed member,
        uint256 indexed epochId, uint256 amount);
    event ControlTransferred(address indexed electionContract);

    error Council__NotMember(address caller);
    error Council__AlreadyVoted(address member, uint256 id);
    error Council__NotInVetoWindow(uint256 proposalId);
    error Council__ProposalAlreadyVetoed(uint256 proposalId);
    error Council__DocAlreadyFrozenByCouncil(uint256 docId);
    error Council__DocNotActive(uint256 docId);
    error Council__DescriptionTooShort(uint256 length);
    error Council__ControlAlreadyTransferred();
    error Council__AllowanceAlreadyClaimed(address member, uint256 epochId);
    error Council__EpochNotEnded(uint256 epochId);
}
```

#### 3.4.2 IGovernanceCore (v3.3)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IGovernanceCore {

    enum ProposalType {
        VersionUpdate,      // 文档版本更新；唯一触发奖励分配的类型
        UpgradeContract,    // 合约升级；执行后退还 5 PAS 质押，不发奖励
        ParameterChange,    // 参数变更；执行后退还 5 PAS 质押，不发奖励
        EmergencyConfirm    // 紧急冻结确认；不发奖励
    }

    enum ProposalStatus {
        Active,
        Approved,
        CouncilVetoed,      // v3.3：触发 72h 冷却期（与 Rejected 一致）
        Rejected,
        Executed,
        Cancelled
    }

    struct Proposal {
        uint256        id;
        ProposalType   proposalType;
        address        proposer;
        uint256        docId;
        uint256        targetVersionId;
        uint256        parentVersionId;
        int256         score;               // 1e18 scaled
        uint256        totalVoteWeight;
        uint256        voterCount;          // 全部实际投票人数（用于动态奖励）
        uint256        snapshotTotalWeight;
        uint256        startTime;
        uint256        endTime;
        uint256        councilWindowEnd;
        ProposalStatus status;
        bytes          callData;
        string         description;
        uint256        proposalStake;       // VersionUpdate=0，其他=5 PAS
    }

    enum VoteChoice { Yes, No, Abstain }

    struct VoteRecord {
        bool       hasVoted;
        VoteChoice choice;
        uint256    weight;
        uint256    timestamp;
    }

    // ─── 写操作 ───

    function createProposalFor(
        address  proposer,
        uint256  docId,
        uint256  targetVersionId,
        uint256  parentVersionId,
        string calldata description
    ) external returns (uint256 proposalId);

    /// @dev msg.value 须 == PROPOSAL_STAKE（5 PAS）
    function createProposal(
        ProposalType proposalType,
        uint256  docId,
        uint256  targetVersionId,
        uint256  parentVersionId,
        bytes calldata callData,
        string calldata description
    ) external payable returns (uint256 proposalId);

    function createEmergencyConfirm(
        uint256 docId,
        string calldata description
    ) external returns (uint256 proposalId);

    function vote(uint256 proposalId, VoteChoice choice) external;

    function cancelProposal(uint256 proposalId) external;

    /// @dev 通过条件：score > 2e18 && participationBps ≥ 500
    ///      CouncilVetoed → 提案人对该文档进入 REJECTION_COOLDOWN（同 Rejected）
    function finalizeProposal(uint256 proposalId) external;

    /// @notice 执行通过提案
    /// @dev VersionUpdate：
    ///        → mergeProposal()
    ///        → mintCreatorNFT()
    ///        → 若 rewardPoolBalance ≥ BASE_REWARD：distributeProposerReward()
    ///        → 若 rewardPoolBalance < BASE_REWARD：跳过奖励，仅 merge
    ///      UpgradeContract / ParameterChange：
    ///        → TimelockController
    ///        → 退还 5 PAS 质押给提案人
    ///        → 不触发奖励分配
    ///      EmergencyConfirm：处理 Frozen/Active 状态，不触发奖励
    function executeProposal(uint256 proposalId) external;

    function markCouncilVetoed(uint256 proposalId) external;

    // ─── 读操作 ───

    function getProposal(uint256 id) external view returns (Proposal memory);
    function getVoteRecord(uint256 proposalId, address voter)
        external view returns (VoteRecord memory);
    function getVotingWeight(address voter) external view returns (uint256);
    function totalProposals() external view returns (uint256);
    function listProposals(
        ProposalStatus filter,
        uint256 offset,
        uint256 limit
    ) external view returns (Proposal[] memory proposals, uint256 total);

    // ─── 常量（正式值 / MVP 测试值）───
    // VOTING_PERIOD               = 7 days         / 10 minutes
    // EMERGENCY_VOTING_PERIOD     = 48 hours        / 5 minutes
    // THRESHOLD                   = 2e18
    // MIN_PARTICIPATION_BPS       = 500  (5%)
    // EMERGENCY_PARTICIPATION_BPS = 1500 (15%)
    // COUNCIL_WINDOW              = 24 hours        / 3 minutes
    // PROPOSAL_STAKE              = 5e18  (5 PAS)
    // REJECTION_COOLDOWN          = 72 hours        / 5 minutes
    // BASE_REWARD                 = 50e18 (50 PAS)
    // VOTER_REWARD_PER_PERSON     = 1e18  (1 PAS/人)
    // TREASURY_REWARD_CAP_BPS     = 1000  (10%)
    // MAX_REWARD_CAP              = 200e18 (200 PAS)

    event ProposalCreated(
        uint256 indexed proposalId, address indexed proposer,
        ProposalType proposalType, uint256 indexed docId,
        uint256 parentVersionId, uint256 endTime
    );
    event VoteCast(
        uint256 indexed proposalId, address indexed voter,
        VoteChoice choice, uint256 weight
    );
    event ProposalFinalized(
        uint256 indexed proposalId, ProposalStatus status,
        int256 score, uint256 participationBps
    );
    event ProposalExecuted(uint256 indexed proposalId, uint256 rewardAmount);
    event RewardSkipped(uint256 indexed proposalId, uint256 poolBalance);
    event CouncilWindowOpened(uint256 indexed proposalId, uint256 windowEnd);

    error Gov__NotActiveMember(address caller);
    error Gov__ProposalNotFound(uint256 proposalId);
    error Gov__ProposalNotActive(uint256 proposalId);
    error Gov__AlreadyVoted(address voter, uint256 proposalId);
    error Gov__VotingNotEnded(uint256 proposalId);
    error Gov__CouncilWindowNotClosed(uint256 proposalId, uint256 windowEnd);
    error Gov__NotProposer(address caller);
    error Gov__InsufficientStake(uint256 required, uint256 provided);
    error Gov__RejectionCooldown(address proposer, uint256 docId, uint256 cooldownEnd);
    error Gov__DocumentHasActiveProposal(uint256 docId, uint256 activeProposalId);
    error Gov__InvalidParentVersion(uint256 provided, uint256 expected);
    error Gov__MergeBlockedByFrozen(uint256 docId);
}
```

#### 3.4.3 IStakingManager (v3.3，不变)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IStakingManager {

    struct StakeInfo {
        uint256 amount;         // 88 PAS in wei
        uint256 lockStart;
        uint256 lockEnd;
        uint8   lockMonths;     // 3 / 6 / 12 / 24
        bool    active;
        uint256 memberNFTId;
    }

    function stake(uint8 lockMonths) external payable;
    function unstake() external;
    function earlyUnstake() external;

    function getStake(address user) external view returns (StakeInfo memory);
    function isActiveMember(address user) external view returns (bool);
    function totalActiveMembers() external view returns (uint256);
    function totalActiveMemberWeight() external view returns (uint256);

    // STAKE_AMOUNT             = 88e18  (88 PAS)
    // EARLY_UNLOCK_PENALTY_BPS = 1000   (10%)
    // VALID_LOCK_MONTHS        = [3, 6, 12, 24]

    event Staked(address indexed user, uint256 amount,
        uint8 lockMonths, uint256 lockEnd, uint256 memberNFTId);
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

#### 3.4.4 INFTReward (v3.3)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice 三种 NFT，全部 Soulbound（Demo 阶段）
/// @dev Member:   质押时 mint（MEMBER_MINTER_ROLE = StakingManager）
///      Creator:  提案执行合并时 mint（CREATOR_MINTER_ROLE = GovernanceCore）
///      Guardian: 构造函数中直接 mint 给 7 个创世成员，无 GUARDIAN_MINTER_ROLE
///                任何人事后都无法再 mint Guardian NFT
interface INFTReward {

    enum NFTType { Member, Creator, Guardian }

    struct NFTMetadata {
        uint256 tokenId;
        NFTType nftType;
        address holder;
        uint256 mintedAt;
        uint256 lockEnd;            // Member 专用
        uint256 linkedDocId;        // Creator 专用
        uint256 linkedProposalId;   // Creator 专用
        bool    active;
    }

    // ─── Mint ───

    function mintMemberNFT(address to, uint256 lockEnd)
        external returns (uint256);                              // MEMBER_MINTER_ROLE
    function mintCreatorNFT(address to, uint256 docId, uint256 proposalId)
        external returns (uint256);                              // CREATOR_MINTER_ROLE
    // mintGuardianNFT 已移除，Guardian 在构造函数中 mint

    function deactivate(uint256 tokenId) external;

    // ─── 读操作 ───

    function getNFTMetadata(uint256 tokenId)
        external view returns (NFTMetadata memory);
    function getNFTsByHolder(address holder)
        external view returns (uint256[] memory);
    function getNFTsByType(address holder, NFTType nftType)
        external view returns (uint256[] memory);
    function activeCreatorCount(address holder)
        external view returns (uint256);
    function hasActiveMember(address holder)
        external view returns (bool);
    function hasActiveGuardian(address holder)
        external view returns (bool);

    event NFTMinted(uint256 indexed tokenId, address indexed holder,
        NFTType nftType, uint256 linkedDocId);
    event NFTDeactivated(uint256 indexed tokenId, NFTType nftType);

    error NFT__Unauthorized();
    error NFT__NotActive(uint256 tokenId);
    error NFT__Soulbound(uint256 tokenId);
}
```

#### 3.4.5 IPolkaInkRegistry (v3.3)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IPolkaInkRegistry {

    enum DocumentStatus { Active, Frozen }

    struct Document {
        uint256        docId;
        string         title;
        string[]       tags;
        address        author;
        uint256        createdAt;
        DocumentStatus status;
        bool           isSeed;           // 是否为种子文档
        uint256        currentVersionId;
        uint256        latestProposalId;
    }

    // ─── 写操作 ───

    /// @notice 普通成员创建文档（需 active Member NFT）
    function createDocument(
        string calldata title,
        string[] calldata tags,
        string calldata description
    ) external returns (uint256 docId);

    /// @notice Admin 创建种子文档（SEED_CREATOR_ROLE，用后立即 renounce）
    /// @dev 首版仅写入标题和标签，markdown 内容为空字符串，proposalId = 0
    ///      链上标记 isSeed = true，versionId 存在但内容为空
    function createSeedDocument(
        string calldata title,
        string[] calldata tags
    ) external returns (uint256 docId);

    /// @notice 提交版本提案（需 active Member NFT）
    /// @dev Frozen 状态下允许提案；但 merge 时若仍 Frozen 则 revert
    function proposeVersion(
        uint256 docId,
        uint256 parentVersionId,
        bytes32 contentHash,
        string calldata description
    ) external returns (uint256 proposalId);

    function mergeProposal(uint256 docId, uint256 proposalId) external;

    function setDocumentStatus(uint256 docId, DocumentStatus status) external;

    // ─── 读操作 ───

    function getDocument(uint256 docId) external view returns (Document memory);
    function totalDocuments() external view returns (uint256);
    function listDocuments(uint256 offset, uint256 limit)
        external view returns (Document[] memory, uint256 total);
    function listDocumentsByTag(string calldata tag, uint256 offset, uint256 limit)
        external view returns (Document[] memory, uint256 total);

    event DocumentCreated(uint256 indexed docId, address indexed author,
        string title, bool isSeed);
    event VersionProposed(uint256 indexed docId, uint256 indexed proposalId,
        address indexed proposer, uint256 parentVersionId, uint256 targetVersionId);
    event ProposalMerged(uint256 indexed docId, uint256 indexed proposalId,
        uint256 newVersionId, uint256 creatorNFTId);
    event DocumentStatusChanged(uint256 indexed docId, DocumentStatus newStatus);

    error Registry__NotActiveMember(address caller);
    error Registry__DocumentNotFound(uint256 docId);
    error Registry__DocumentFrozenCannotMerge(uint256 docId);
    error Registry__ActiveProposalExists(uint256 docId, uint256 proposalId);
    error Registry__InvalidParentVersion(uint256 provided, uint256 expected);
    error Registry__InvalidTitle();
    error Registry__TooManyTags(uint256 count);
    error Registry__Unauthorized();
}
```

#### 3.4.6 IVersionStore (不变)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IVersionStore {

    struct Version {
        uint256 versionId;
        uint256 docId;
        uint256 parentVersionId;    // 0 = 初始版本（种子文档首版）
        address author;
        uint256 proposalId;         // 种子文档首版 proposalId = 0
        bytes32 contentHash;        // 种子文档首版 contentHash = bytes32(0)
        uint256 txBlock;
        uint256 txIndex;
        uint256 timestamp;
    }

    function storeVersion(
        uint256 docId,
        uint256 parentVersionId,
        address author,
        uint256 proposalId,
        bytes32 contentHash,
        uint256 txBlock,
        uint256 txIndex
    ) external returns (uint256 versionId);

    function getVersion(uint256 versionId) external view returns (Version memory);
    function getVersionsByDoc(uint256 docId)
        external view returns (uint256[] memory versionIds);
    function getVersionAncestors(uint256 versionId)
        external view returns (uint256[] memory);
    function totalVersions() external view returns (uint256);

    event VersionStored(uint256 indexed versionId, uint256 indexed docId,
        uint256 parentVersionId, address indexed author, bytes32 contentHash);

    error VersionStore__Unauthorized();
    error VersionStore__VersionNotFound(uint256 versionId);
}
```

#### 3.4.7 VotingMath (v3.3)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title VotingMath v3.3
///
/// weight = min(1e18 + boost, 2e18)
/// boost  = B_hist + B_lock
///
/// B_hist = 0.40 × ln(1 + creatorCount) / ln(21)，上限 0.40
/// B_lock = 0.40 × ln(1 + lockMonths)  / ln(25)
///          3mo=0.1723, 6mo=0.2418, 12mo=0.3187, 24mo=0.4000
///
/// 单人最大 weight = 1.80 < T=2.0，永远无法独自通过提案
library VotingMath {

    uint256 internal constant SCALE                   = 1e18;
    int256  internal constant THRESHOLD               = 2e18;
    uint256 internal constant MAX_WEIGHT              = 2e18;
    uint256 internal constant MIN_PARTICIPATION_BPS   = 500;
    uint256 internal constant EMRG_PARTICIPATION_BPS  = 1500;

    // 动态奖励常量
    uint256 internal constant BASE_REWARD             = 50e18;
    uint256 internal constant VOTER_REWARD_PER_PERSON = 1e18;
    uint256 internal constant TREASURY_CAP_BPS        = 1000;   // 10%
    uint256 internal constant MAX_REWARD_CAP          = 200e18;
    uint256 internal constant MIN_REWARD_THRESHOLD    = 50e18;  // 低于此值跳过奖励

    function calculateWeight(
        bool    hasActiveMember,
        uint256 creatorCount,
        uint8   lockMonths
    ) internal pure returns (uint256 weight) {
        if (!hasActiveMember) return 0;
        uint256 boost = boostHist(creatorCount) + boostLock(lockMonths);
        weight = SCALE + boost;
        if (weight > MAX_WEIGHT) weight = MAX_WEIGHT;
    }

    function boostHist(uint256 n) internal pure returns (uint256) {
        if (n == 0)  return 0;
        if (n == 1)  return  91_100_000_000_000_000;
        if (n == 2)  return 144_300_000_000_000_000;
        if (n == 3)  return 182_100_000_000_000_000;
        if (n == 4)  return 212_800_000_000_000_000;
        if (n == 5)  return 235_400_000_000_000_000;
        if (n == 6)  return 255_800_000_000_000_000;
        if (n == 7)  return 273_500_000_000_000_000;
        if (n == 8)  return 289_300_000_000_000_000;
        if (n == 9)  return 303_400_000_000_000_000;
        if (n == 10) return 315_000_000_000_000_000;
        if (n <= 15) return 315_000_000_000_000_000
            + ((n - 10) * (362_000_000_000_000_000 - 315_000_000_000_000_000)) / 5;
        if (n < 20)  return 362_000_000_000_000_000
            + ((n - 15) * (400_000_000_000_000_000 - 362_000_000_000_000_000)) / 5;
        return 400_000_000_000_000_000;
    }

    function boostLock(uint8 m) internal pure returns (uint256) {
        if (m >= 24) return 400_000_000_000_000_000;
        if (m >= 12) return 318_700_000_000_000_000;  // 0.3187
        if (m >= 6)  return 241_800_000_000_000_000;  // 0.2418
        if (m >= 3)  return 172_300_000_000_000_000;  // 0.1723
        return 0;
    }

    function checkPassed(
        int256  score,
        uint256 totalVoteWeight,
        uint256 snapshotTotalWeight,
        bool    isEmergency
    ) internal pure returns (bool passed, uint256 participationBps) {
        if (snapshotTotalWeight == 0) return (false, 0);
        participationBps = (totalVoteWeight * 10_000) / snapshotTotalWeight;
        uint256 minBps = isEmergency ? EMRG_PARTICIPATION_BPS : MIN_PARTICIPATION_BPS;
        passed = score > THRESHOLD && participationBps >= minBps;
    }

    /// @notice 计算 VersionUpdate 提案的动态奖励总额
    /// @param voterCount       全部实际参与投票人数（不过滤门槛）
    /// @param rewardPoolBalance Treasury 当前 rewardPool 余额
    /// @return reward          实际奖励总额（0 表示余额不足，跳过分配）
    function calculateProposalReward(
        uint256 voterCount,
        uint256 rewardPoolBalance
    ) internal pure returns (uint256 reward) {
        if (rewardPoolBalance < MIN_REWARD_THRESHOLD) return 0;
        uint256 voterBonus = voterCount * VOTER_REWARD_PER_PERSON;
        uint256 dynamicCap = rewardPoolBalance * TREASURY_CAP_BPS / 10_000;
        if (dynamicCap > MAX_REWARD_CAP) dynamicCap = MAX_REWARD_CAP;
        reward = BASE_REWARD + voterBonus;
        if (reward > dynamicCap) reward = dynamicCap;
    }
}
```

#### 3.4.8 ITreasury (v3.3)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ITreasury {

    enum SpendCategory {
        ProposerReward,
        VoterEpochReward,
        Reserve,
        CouncilAllowance,
        ProtocolOps
    }

    struct EpochRecord {
        uint256 epochId;
        uint256 startTime;
        uint256 endTime;
        uint256 totalVoterReward;
        uint256 proposalCount;
        bool    finalized;
    }

    /// @notice 任何人均可调用，向 rewardPool 捐款
    /// @dev receive() 同样进入 rewardPool
    receive() external payable;
    function depositRewardPool() external payable;

    /// @notice GovernanceCore 调用，VersionUpdate 专属奖励分配
    /// @dev 若 rewardPool < BASE_REWARD，内部跳过，不 revert
    function distributeProposerReward(
        address proposer,
        uint256 proposalId,
        uint256 voterCount
    ) external returns (uint256 rewardPaid);   // GOVERNANCE_ROLE

    function finalizeEpoch(uint256 epochId) external;
    function claimEpochReward(uint256 epochId) external;

    /// @notice ArchiveCouncil 调用：发放 Council 成员固定津贴
    function distributeCouncilAllowance(
        address member,
        uint256 epochId
    ) external;   // COUNCIL_ROLE

    function executeSpend(
        address payable to,
        uint256 amount,
        SpendCategory category,
        string calldata memo
    ) external;   // SPEND_ROLE

    // ─── 读操作 ───
    function rewardPoolBalance() external view returns (uint256);
    function getEpochRecord(uint256 epochId) external view returns (EpochRecord memory);
    function pendingReward(address voter, uint256 epochId) external view returns (uint256);
    function epochStartTime() external view returns (uint256); // 部署时记录的起始 timestamp

    // EPOCH_DURATION                = 30 days         / 1 hour (MVP)
    // PROPOSER_SHARE_BPS            = 5000  (50%)
    // VOTER_SHARE_BPS               = 3000  (30%)
    // RESERVE_BPS                   = 2000  (20%)
    // EPOCH_MIN_PARTICIPATION        = 50%
    // COUNCIL_ALLOWANCE_PER_MEMBER  = 5e18  (5 PAS，ParameterChange 可调)
    // TIMELOCK_DELAY                = 48 hours         / 2 minutes (MVP)

    event RewardPoolDeposited(address indexed from, uint256 amount);
    event ProposerRewarded(address indexed proposer,
        uint256 indexed proposalId, uint256 amount, uint256 voterCount);
    event RewardSkippedInsufficientPool(uint256 indexed proposalId, uint256 poolBalance);
    event EpochFinalized(uint256 indexed epochId,
        uint256 totalVoterReward, uint256 voterCount);
    event EpochRewardClaimed(address indexed voter,
        uint256 indexed epochId, uint256 amount);
    event CouncilAllowancePaid(address indexed member,
        uint256 indexed epochId, uint256 amount);
    event SpendExecuted(address indexed to, uint256 amount, SpendCategory category);

    error Treasury__InsufficientBalance(uint256 available, uint256 required);
    error Treasury__EpochNotEnded(uint256 epochId, uint256 endTime);
    error Treasury__EpochAlreadyFinalized(uint256 epochId);
    error Treasury__NothingToClaim(address voter, uint256 epochId);
}
```

---

### 3.5 合约间完整调用关系

```
用户
 ├─→ StakingManager.stake(lockMonths)
 │       ├─→ NFTReward.mintMemberNFT(user, lockEnd)
 │       └─→ _totalWeight += 1e18
 │
 ├─→ StakingManager.unstake() / earlyUnstake()
 │       ├─→ NFTReward.deactivate(memberNFTId)
 │       ├─→ _totalWeight -= 1e18
 │       └─→ earlyUnstake: 8.8 PAS → Treasury.depositRewardPool()
 │
 ├─→ 任意地址.depositRewardPool() / 直接转账到 Treasury
 │       └─→ rewardPool += amount（开放捐款，无权限限制）
 │
 ├─→ PolkaInkRegistry.createDocument(title, tags, desc)
 │       └─→ 创建文档（无 Author NFT mint）
 │
 ├─→ PolkaInkRegistry.proposeVersion(docId, parentVersionId, hash, desc)
 │       ├─→ 检查：document.latestProposalId == 0
 │       ├─→ 检查：parentVersionId 合法（含 Frozen 状态下允许提案）
 │       ├─→ VersionStore.storeVersion(...)
 │       └─→ GovernanceCore.createProposalFor(...)
 │
 ├─→ GovernanceCore.vote(proposalId, choice)
 │       ├─→ VotingMath.calculateWeight(hasActiveMember, creatorCount, lockMonths)
 │       ├─→ proposal.score += choice × weight
 │       ├─→ proposal.totalVoteWeight += weight
 │       └─→ proposal.voterCount += 1
 │
 ├─→ GovernanceCore.finalizeProposal(proposalId)
 │       ├─→ VotingMath.checkPassed(...)
 │       ├─→ Approved → councilWindowEnd = now + COUNCIL_WINDOW
 │       ├─→ Rejected → latestProposalId = 0，REJECTION_COOLDOWN 开始
 │       └─→ （CouncilVetoed 由 markCouncilVetoed 触发，同样开始 REJECTION_COOLDOWN）
 │
 ├─→ ArchiveCouncil.castVeto(proposalId, reason, description)
 │       ├─→ 5/7 达成 → GovernanceCore.markCouncilVetoed(proposalId)
 │       │               → latestProposalId = 0，REJECTION_COOLDOWN 开始
 │       └─→ 提案人对该文档进入 72h 冷却（与 Rejected 一致）
 │
 ├─→ GovernanceCore.executeProposal(proposalId)  [VersionUpdate]
 │       ├─→ 检查：now > councilWindowEnd && status == Approved
 │       ├─→ PolkaInkRegistry.mergeProposal(docId, proposalId)
 │       │       ├─→ 检查：document.status == Active（Frozen 则 revert）
 │       │       ├─→ document.currentVersionId = targetVersionId
 │       │       └─→ document.latestProposalId = 0
 │       ├─→ NFTReward.mintCreatorNFT(proposer, docId, proposalId)
 │       └─→ Treasury.distributeProposerReward(proposer, proposalId, voterCount)
 │               ├─→ VotingMath.calculateProposalReward(voterCount, rewardPoolBalance)
 │               ├─→ reward == 0（余额不足）→ emit RewardSkippedInsufficientPool，返回
 │               └─→ reward > 0 → 50% → proposer，30% → Epoch池，20% 留 pool
 │
 ├─→ GovernanceCore.executeProposal(proposalId)  [UpgradeContract/ParameterChange]
 │       ├─→ TimelockController 队列
 │       └─→ 退还 5 PAS 质押给提案人（不触发奖励）
 │
 ├─→ ArchiveCouncil.castEmergencyFreeze(docId, reason, desc)
 │       └─→ 5/7 达成 →
 │               PolkaInkRegistry.setDocumentStatus(docId, Frozen)
 │               GovernanceCore.createEmergencyConfirm(docId, desc)
 │               confirmDeadline = now + 72h
 │
 ├─→ GovernanceCore.executeProposal(emergencyProposalId)  [任何人，48h 后]
 │       ├─→ 通过 → setDocumentStatus(Frozen 维持)
 │       └─→ 未通过 → setDocumentStatus(Active 解冻)
 │
 ├─→ ArchiveCouncil.checkAndAutoUnfreeze(docId)  [任何人，72h 后兜底]
 │       └─→ !confirmed && now > confirmDeadline → setDocumentStatus(Active)
 │
 ├─→ Treasury.finalizeEpoch(epochId)  [Epoch 结束后任何人]
 │
 ├─→ Treasury.claimEpochReward(epochId)  [达标投票者]
 │
 ├─→ ArchiveCouncil.claimCouncilAllowance(epochId)  [Council 成员，无条件]
 │       └─→ Treasury.distributeCouncilAllowance(member, epochId)
 │               → 5 PAS → member（固定，无条件）
 │
 └─→ TimelockController → ProxyAdmin.upgrade()  [UpgradeContract]
```

### 3.6 错误码汇总

```solidity
// Staking
error Staking__InvalidLockMonths(uint8 provided);
error Staking__WrongAmount(uint256 expected, uint256 provided);
error Staking__AlreadyStaked(address user);
error Staking__NotStaked(address user);
error Staking__LockNotExpired(uint256 lockEnd, uint256 now_);
error Staking__AlreadyExpired(uint256 lockEnd);

// Governance
error Gov__NotActiveMember(address caller);
error Gov__ProposalNotFound(uint256 proposalId);
error Gov__ProposalNotActive(uint256 proposalId);
error Gov__AlreadyVoted(address voter, uint256 proposalId);
error Gov__VotingNotEnded(uint256 proposalId);
error Gov__CouncilWindowNotClosed(uint256 proposalId, uint256 windowEnd);
error Gov__NotProposer(address caller);
error Gov__InsufficientStake(uint256 required, uint256 provided);
error Gov__RejectionCooldown(address proposer, uint256 docId, uint256 cooldownEnd);
error Gov__DocumentHasActiveProposal(uint256 docId, uint256 activeProposalId);
error Gov__InvalidParentVersion(uint256 provided, uint256 expected);
error Gov__MergeBlockedByFrozen(uint256 docId);

// Archive Council
error Council__NotMember(address caller);
error Council__AlreadyVoted(address member, uint256 id);
error Council__NotInVetoWindow(uint256 proposalId);
error Council__ProposalAlreadyVetoed(uint256 proposalId);
error Council__DocAlreadyFrozenByCouncil(uint256 docId);
error Council__DocNotActive(uint256 docId);
error Council__DescriptionTooShort(uint256 length);
error Council__ControlAlreadyTransferred();
error Council__AllowanceAlreadyClaimed(address member, uint256 epochId);
error Council__EpochNotEnded(uint256 epochId);

// Registry
error Registry__NotActiveMember(address caller);
error Registry__DocumentNotFound(uint256 docId);
error Registry__DocumentFrozenCannotMerge(uint256 docId);
error Registry__ActiveProposalExists(uint256 docId, uint256 proposalId);
error Registry__InvalidParentVersion(uint256 provided, uint256 expected);
error Registry__InvalidTitle();
error Registry__TooManyTags(uint256 count);
error Registry__Unauthorized();

// NFT
error NFT__Unauthorized();
error NFT__NotActive(uint256 tokenId);
error NFT__Soulbound(uint256 tokenId);

// Treasury
error Treasury__InsufficientBalance(uint256 available, uint256 required);
error Treasury__EpochNotEnded(uint256 epochId, uint256 endTime);
error Treasury__EpochAlreadyFinalized(uint256 epochId);
error Treasury__NothingToClaim(address voter, uint256 epochId);
```

---

## 4. 治理机制

### 4.1 投票权重公式

```
weight = min(1.0 + boost, 2.00)

boost = B_hist + B_lock

  B_hist = 0.40 × ln(1 + creator_nft_count) / ln(21)
           上限 0.40（约 20 枚达到上限）

  B_lock = 0.40 × ln(1 + lock_months) / ln(25)
           3mo: +0.1723 · 6mo: +0.2418 · 12mo: +0.3187 · 24mo: +0.4000
           （精确值以 VotingMath.boostLock() 为准）

  Guardian NFT：无权重加成
  硬上限：weight = min(weight, 2.00)
```

| 画像 | B_hist | B_lock | Weight |
|------|--------|--------|--------|
| 新成员，3mo | 0 | 0.1723 | 1.1723 |
| 5 篇通过，6mo | 0.235 | 0.2418 | 1.4768 |
| 10 篇通过，12mo | 0.315 | 0.3187 | 1.6337 |
| 20 篇通过，24mo | 0.400 | 0.4000 | **1.800** |

> 最大权重 **1.80 < T=2.0**，单人永远无法独自通过提案。

### 4.2 提案通过条件

```
同时满足：
  1. score > 2e18
  2. participationBps ≥ 500（5%）
  3. Council 未在 COUNCIL_WINDOW 内完成 5/7 veto

EmergencyConfirm：
  1. score > 2e18
  2. participationBps ≥ 1500（15%）
  3. 无 Council 窗口
```

### 4.3 串行提案与冷却期

```
同一文档同一时间只允许一个 Active 提案。

parentVersionId 合法性：
  情况 A：parentVersionId == document.currentVersionId → 直接允许
  情况 B：存在 Approved 未执行的提案 P，parentVersionId == P.targetVersionId → 预排队
  其他：revert Registry__InvalidParentVersion

Frozen 状态下：允许提案（proposeVersion 不 revert）
              但 executeProposal 执行 merge 时若仍 Frozen → revert Gov__MergeBlockedByFrozen

72h 冷却期触发条件（v3.3）：
  - Rejected
  - CouncilVetoed  ← 新增，与 Rejected 一致
  主动 Cancelled → 无冷却

提案生命周期：
  创建        → latestProposalId = proposalId
  Executed    → latestProposalId = 0
  Rejected    → latestProposalId = 0，冷却开始
  CouncilVetoed → latestProposalId = 0，冷却开始
  Cancelled   → latestProposalId = 0，无冷却
```

### 4.4 提案类型与奖励

| 类型 | 质押 | Council 窗口 | Timelock | 奖励 |
|------|------|-------------|---------|------|
| VersionUpdate | 无 | ✅ 24h | ❌ | ✅ 动态奖励 |
| UpgradeContract | 5 PAS | ✅ 24h | ✅ 48h | ❌ 退还质押 |
| ParameterChange | 5 PAS | ✅ 24h | ✅ 48h | ❌ 退还质押 |
| EmergencyConfirm | 无 | ❌ | ❌ | ❌ |

---

## 5. NFT 系统

| NFT | 获取方式 | 可叠加 | 过期 | 投票影响 | Soulbound |
|-----|---------|--------|------|---------|----------|
| **Member** | 质押 88 PAS | 1/地址 | 锁仓到期→纪念性 | 投票资格 | ✅ |
| **Creator** | VersionUpdate 提案 merge 时 mint | 是（无上限） | 永久 | B_hist（对数，上限 +0.40） | ✅ |
| **Guardian** | 构造函数直接 mint（创世 7 成员） | 1/人 | 换届时 deactivate | 无权重加成 | ✅ |

**关键设计：** 不存在 `GUARDIAN_MINTER_ROLE`，任何人事后都无法追加 mint Guardian NFT，Council 成员数量在 Phase 1 迁移前完全固定。

---

## 6. 文档与版本模型

### 6.1 Git 类比

| Git 概念 | PolkaInk 概念 |
|---------|-------------|
| Repository | Document |
| HEAD | currentVersionId |
| Pull Request | Proposal |
| Merge PR | executeProposal → mergeProposal |
| Commit | Version（VersionStore） |
| parent commit | parentVersionId |
| Initial commit（空） | createSeedDocument（标题写入，内容为空） |

### 6.2 前端 Git Log 渲染

```
文档 #1 — "Polkadot 生态大事记"  [种子文档]
HEAD: v3

◎──── v3  [merged]  2026-02-15  by 0xABCD...
│         "增加 2025 Q1 事件"
│         PR #22 · Score +3.44 · 参与率 8%
│
◎──── v2  [merged]  2025-12-01  by 0x1234...
│         "首次填充内容"
│         PR #3 · Score +5.10 · 参与率 14%
│
◎──── v1  [seed]    2025-11-01  by Admin
          "文档创建（内容为空，待社区填充）"

──── 活跃 PR ────────────────────────────────────
⏳  PR #31  "增加 2025 Q2 事件"  by 0x5678...
    基于 v3 · 剩余 8 天  [🔗 分享]
```

---

## 7. Archive Council

### 7.1 创世配置

```solidity
// deploy_all.ts
const GENESIS_COUNCIL_MEMBERS: string[] = [
    "0xCouncil1...",
    "0xCouncil2...",
    "0xCouncil3...",
    "0xCouncil4...",
    "0xCouncil5...",
    "0xCouncil6...",
    "0xCouncil7...",
];
// ArchiveCouncil 构造函数：写入 7 个地址，同时 mint Guardian NFT
// NFTReward 无 GUARDIAN_MINTER_ROLE，部署后无法追加
```

部署后自动：
- 7 个地址各持有 1 枚 Guardian NFT
- `ArchiveCouncil` → `GovernanceCore`（COUNCIL_ROLE）
- `ArchiveCouncil` → `PolkaInkRegistry`（COUNCIL_ROLE）
- `ArchiveCouncil` → `Treasury`（COUNCIL_ROLE）
- 前端 Council 页面显示："当前 Archive Council 为创世成员配置，Phase 1 前成员保持固定，治理迁移将通过 DAO 提案完成，项目方无法单方面干预。"

### 7.2 职责边界

Council 只在以下情形行使链上权力，任何超出边界的干预均无合约支撑：

| 可行使否决 / 冻结的情形 | 不得行使的情形 |
|----------------------|--------------|
| 包含可验证虚假历史陈述 | 内容写得不够好（主观判断） |
| 合约升级代码含隐藏后门 | 社区有争议但内容本身合法 |
| 明显侵权或违法风险 | 政治立场或价值观分歧 |
| 仇恨或歧视性内容 | EmergencyConfirm 提案本身 |

每次行使否决或紧急冻结，Council 成员**必须**选择以上原因之一，并附上 ≥ 50 字节的链上文字说明，永久记录，公开可查。

**Council 在普通治理中的地位：**
- 普通提案投票中，Council 成员与任何普通成员完全平等，Guardian NFT **不带来任何权重加成**
- Council 不能主导内容方向，不能发起 VersionUpdate 提案
- Council 没有独立冻结权——紧急冻结必须在 72 小时内经 DAO 投票确认，否则自动解冻

### 7.3 Council 固定津贴

```
发放：每 Epoch 结束后，7 名成员均可调用 claimCouncilAllowance(epochId)
金额：5 PAS / 人（ParameterChange 可调）
条件：无（固定发放，无响应率要求，无参与条件）
资金：Treasury rewardPool
```

### 7.4 迁移路径

```
Demo 阶段（当前）
  创世 7 成员，构造函数写入
  vetoThreshold = 5/7
  无 setMember()，Phase 1 前成员地址保持创世配置

Phase 1（DAO 提案触发）
  社区通过 DAO 提案部署 CouncilElection 合约
  执行 transferControlToElection()（不可逆）
  vetoThreshold 自动降为 4/7
  后续成员变更由选举合约管理

Phase 2+
  6 个月任期，开放提名，Guardian NFT 自动换届
  75% DAO 超级多数可罢免（走 Timelock）
```

---

## 8. 经济模型

### 8.1 奖励分配（仅 VersionUpdate）

```
执行前检查：
  rewardPoolBalance < 50 PAS → 跳过奖励，提案照常 merge，emit RewardSkippedInsufficientPool

余额充足时：
  ProposalReward = VotingMath.calculateProposalReward(voterCount, rewardPoolBalance)
    = min(50 PAS + voterCount × 1 PAS, min(rewardPoolBalance × 10%, 200 PAS))

  分配：
    50% → 提案人（立即）
    30% → 本 Epoch 投票者奖励池
    20% → rewardPool 留存
```

### 8.2 Epoch 投票奖励

```
Epoch 起止：
  epochStartTime = 部署时 block.timestamp（合约存储）
  epochId        = (block.timestamp - epochStartTime) / EPOCH_DURATION
  EPOCH_DURATION = 30 × 86400 秒（MVP: 3600 秒 = 1 小时）

达标条件：本 Epoch 内参与了 ≥ 50% 有效提案投票（Cancelled 不计分母）
奖励池：本 Epoch 所有 VersionUpdate 通过提案的 30% 之和
分配：达标成员按各自权重比例分配
领取：finalizeEpoch(epochId) + claimEpochReward(epochId)
```

### 8.3 Treasury 资金流

```
来源（全部进入 rewardPool）：
  ├── earlyUnstake 罚金（8.8 PAS / 次）
  ├── MVP 初始注资（5,000 PAS，Admin 部署后调用一次，随后无特权）
  ├── 任意地址捐款（depositRewardPool() 或直接转账，无限制）
  └── Grant 拨款

用途：
  ├── VersionUpdate 提案人奖励（50%，动态计算）
  ├── Epoch 投票者奖励（30%，Epoch 结算）
  ├── rewardPool 留存（20%）
  ├── Council 固定津贴（35 PAS / Epoch）
  └── 协议运营（TimelockController 审批）
```

### 8.4 常量速查（含 MVP 测试值）

| 参数 | 正式值 | MVP 测试值 | 可调整 |
|------|--------|----------|-------|
| 质押金额 | 88 PAS | 88 PAS | ParameterChange |
| 投票周期 | 7 天 | **10 分钟** | ParameterChange |
| EmergencyConfirm 投票期 | 48 小时 | **5 分钟** | ParameterChange |
| Council 审查窗口 | 24 小时 | **3 分钟** | ParameterChange |
| 紧急冻结确认期 | 72 小时 | **15 分钟** | ParameterChange |
| 提案冷却期 | 72 小时 | **5 分钟** | ParameterChange |
| Epoch 周期 | 30 天 | **1 小时** | ParameterChange |
| Timelock 延迟 | 48 小时 | **2 分钟** | **不可变** |
| 通过阈值 T | 2.0 | 2.0 | **不可变** |
| 最大权重 cap | 2.00 | 2.00 | **不可变** |
| 参与率门槛 | 5% | 5% | ParameterChange |
| EmergencyConfirm 参与率 | 15% | 15% | ParameterChange |
| veto 门槛（Demo） | 5/7 | 5/7 | 迁移时变更 |
| veto 门槛（正式） | 4/7 | — | ParameterChange |
| 每文档最大紧急冻结次数 | 1 | 1 | **不可变** |
| 提案基础奖励 | 50 PAS | 50 PAS | ParameterChange |
| 奖励发放最低余额 | 50 PAS | 50 PAS | **不可变** |
| 国库奖励上限比例 | 10% | 10% | ParameterChange |
| 最大单次奖励上限 | 200 PAS | 200 PAS | ParameterChange |
| 投票人数奖励加成 | 1 PAS / 人 | 1 PAS / 人 | ParameterChange |
| 提案人奖励比例 | 50% | 50% | ParameterChange |
| 投票者奖励比例 | 30% | 30% | ParameterChange |
| rewardPool 留存比例 | 20% | 20% | ParameterChange |
| Council 成员津贴 | 5 PAS / 人 / Epoch | 5 PAS | ParameterChange |
| Epoch 参与达标比例 | ≥50% | ≥50% | ParameterChange |
| UpgradeContract 质押 | 5 PAS | 5 PAS | ParameterChange |
| ParameterChange 质押 | 5 PAS | 5 PAS | ParameterChange |

> **MVP 测试值直接写入合约常量**，不通过 ParameterChange 动态调整。正式部署时替换为正式值后重新编译部署。

---

## 9. 前端架构

### 9.1 路由

| 路由 | 页面 | v3.3 变更 |
|------|------|---------|
| `/` | Home | 无 |
| `/library` | Library | 种子文档标记 |
| `/document/:id` | Document | Git log，种子 v1 显示"内容为空" |
| `/document/:id/propose` | Propose | 提案成功后社交分享卡片 |
| `/governance` | Governance | 无 |
| `/governance/:id` | ProposalDetail | 分享按钮（访客可见） |
| `/profile/:address` | Profile | 3 种 NFT |
| `/council` | Council | 创世配置 Banner，固定津贴领取，无响应率显示 |
| `/staking` | Staking | 无 |
| `/treasury` | Treasury | 捐款入口，动态奖励说明，余额不足提示 |

### 9.2 社交分享

分享按钮对**所有访客可见**，无需连接钱包。未连钱包时不附 ref，连接后自动附 `?ref={address}`。移动端优先 Web Share API，降级为链接按钮。

### 9.3 关键 Hooks 变更

```typescript
// v3.3 变更
useCouncilAllowance()  // 移除响应率查询，仅查询 claimable / claimed 状态
useDynamicReward()     // 新增：余额不足时展示"当前奖励暂停"提示
useProposal()          // CouncilVetoed 状态新增冷却倒计时显示

// 移除
// useShareProposal 中的钱包检查（分享无需连接钱包）
```

---

## 10. 部署

### 10.1 部署顺序

```
1.  ProxyAdmin
2.  TimelockController
3.  NFTReward (v3.3)
      构造参数：councilMembers[7]（7个创世地址）
      → 构造时直接 mintGuardianNFT × 7
      → 不设 GUARDIAN_MINTER_ROLE
4.  Treasury (v3.3)
      构造参数：epochStartTime = block.timestamp
5.  VersionStore
6.  StakingManager
7.  GovernanceCore (v3.3)
8.  PolkaInkRegistry (v3.3)
9.  ArchiveCouncil (v3.3)
      构造参数：councilMembers[7]，vetoThreshold=5
      → 不设 setMember()
10. Setup：角色权限（见 §10.2）
11. Admin 调用 Treasury.depositRewardPool()，转入 5,000 PAS
12. Admin 调用 Registry.createSeedDocument() × 4（见 §10.4）
13. Admin renounce SEED_CREATOR_ROLE
14. 验证（见 §10.3）
```

### 10.2 角色权限设置

```solidity
// NFTReward（无 GUARDIAN_MINTER_ROLE）
nftReward.grantRole(MEMBER_MINTER_ROLE,   stakingManager);
nftReward.grantRole(CREATOR_MINTER_ROLE,  governanceCore);
// GUARDIAN_MINTER_ROLE 不存在，Guardian 已在构造函数 mint 完毕

// GovernanceCore
governanceCore.grantRole(REGISTRY_ROLE,   registry);
governanceCore.grantRole(COUNCIL_ROLE,    archiveCouncil);

// PolkaInkRegistry
registry.grantRole(GOVERNANCE_ROLE,       governanceCore);
registry.grantRole(COUNCIL_ROLE,          archiveCouncil);
registry.grantRole(SEED_CREATOR_ROLE,     admin);  // 步骤 13 后立即 renounce

// VersionStore
versionStore.grantRole(WRITER_ROLE,       registry);

// Treasury
treasury.grantRole(GOVERNANCE_ROLE,       governanceCore);
treasury.grantRole(COUNCIL_ROLE,          archiveCouncil);
treasury.grantRole(SPEND_ROLE,            timelockController);

// TimelockController
timelockController.grantRole(PROPOSER_ROLE,  governanceCore);
timelockController.grantRole(CANCELLER_ROLE, governanceCore);

// ProxyAdmin → TimelockController
proxyAdmin.transferOwnership(timelockController);

// GovernanceCore
governanceCore.setArchiveCouncil(archiveCouncil);
```

### 10.3 部署后验证清单

```
□ 7 个 Council 成员各持有 1 枚 active Guardian NFT
□ NFTReward 无 GUARDIAN_MINTER_ROLE（任何地址均无此 role）
□ ArchiveCouncil 无 setMember() 函数
□ StakingManager.totalActiveMemberWeight() 返回 0
□ ArchiveCouncil.vetoThreshold() 返回 5
□ ArchiveCouncil.isControlTransferred() 返回 false
□ Treasury.rewardPoolBalance() 返回 5,000 PAS（初始注资完成）
□ Treasury.epochStartTime() 返回部署时 block.timestamp
□ Registry：SEED_CREATOR_ROLE 已 renounce（无地址持有）
□ Registry：4 个种子文档已创建（isSeed=true）
□ 种子文档 v1 内容为空（contentHash == bytes32(0)）
□ 前端分享按钮在未连钱包状态下可见
□ 前端 Council 页面显示创世配置 Banner（无 Demo 标注）
□ 前端 Treasury 页面显示捐款入口
□ VotingMath.calculateWeight 为 3 参数（无 isAuthorOfDoc/isProposer）
□ GovernanceCore：CouncilVetoed 触发 REJECTION_COOLDOWN
□ GovernanceCore：UpgradeContract/ParameterChange 执行后退还 5 PAS，不发奖励
```

### 10.4 种子文档部署脚本

```typescript
// scripts/deploy/seed_documents.ts
const seeds = [
  { title: "Polkadot 生态大事记",   tags: ["#history",    "#timeline"]  },
  { title: "治理提案大事记",         tags: ["#governance", "#referenda"] },
  { title: "Runtime 升级日志",       tags: ["#technical",  "#runtime"]   },
  { title: "生态项目里程碑",         tags: ["#ecosystem",  "#projects"]  },
];

for (const seed of seeds) {
  const tx = await registry.createSeedDocument(seed.title, seed.tags);
  await tx.wait();
  console.log(`Seed document created: ${seed.title}`);
}

// 全部创建完毕后立即 renounce
await registry.renounceRole(SEED_CREATOR_ROLE, adminAddress);
console.log("SEED_CREATOR_ROLE renounced. Admin has zero privileges.");
```

---

## 11. Calldata 存储机制

```json
{
  "schema": "polkaink/v3",
  "docId": 1,
  "versionId": 1,
  "parentVersionId": 0,
  "proposalId": 0,
  "contentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "encoding": "gzip+utf8",
  "isSeed": true,
  "markdown": ""
}
```

种子文档首版：`isSeed=true`，`proposalId=0`，`contentHash=bytes32(0)`，`markdown` 为空字符串。首次内容提案（v2）起 markdown 字段才有实质内容。

---

## 12. 安全设计

| 威胁 | 防护措施 |
|------|---------|
| 闪电贷操控投票 | 锁仓 3-24 个月 |
| 女巫攻击 | 88 PAS 门槛 + 5% 参与率快照 |
| 单人通过提案 | 权重硬上限 cap=2.00=T，单人最大实际权重=1.80，单人 score ≤1.80，永不超过 T |
| 反复无意义提案 | Rejected / CouncilVetoed 后均 72h 冷却 |
| Council 滥用 veto | ≥50 bytes 强制链上理由；Phase 2 反 veto 机制 |
| Council 滥用紧急冻结 | 72h DAO 确认（15%），兜底自动解冻，同文档限 1 次 |
| 合约升级滥用 | Timelock + DAO 投票 + 5 PAS 质押 |
| 特权管理员滥权 | 部署后零特权管理员，SEED_CREATOR_ROLE renounce |
| Guardian 被增发 | 无 GUARDIAN_MINTER_ROLE，构造函数写死 |
| Council 成员被非法替换 | 无 setMember()，Phase 1 前创世地址固定持有；Phase 1 后由选举合约管理，任何单方面替换须经 DAO 投票 |
| 捐款操控奖励上限 | 200 PAS 硬上限防止单次奖励过大 |
| 国库耗尽 | rewardPool < 50 PAS 时跳过奖励，不 revert |
| 奖励扭曲投票 | Epoch 制度，立场与奖励解耦 |

### 12.1 未来方向：Proof of Personhood 集成

当前防女巫机制依赖 88 PAS 质押门槛与单人权重上限（cap=1.80）。未来方向：接入 Polkadot Proof of Personhood（PoP），以链上唯一真人身份替代或补充质押准入，实现更公平的一人一基础权重，从根本上消除多账号操控风险。

---

## 13. PolkaInk Agent Skill

PolkaInk 已提供一份符合 **SKILL.md 格式**的 Agent Skill 文件，兼容 Claude、Cursor、GitHub Copilot 等主流 AI 开发工具。开发者或 AI Agent 加载后可直接获得以下能力：

| 能力模块 | 说明 |
|----------|------|
| **合约接口知识** | 10 个合约的 ABI、调用链路、权限模型，可用于合约开发与审计辅助 |
| **治理规则内置** | 权重公式、提案生命周期、Council veto 规则，AI 可自动生成符合治理逻辑的代码与文档 |
| **NFT 体系描述** | Member / Creator / Guardian 铸造逻辑，加速前端与测试脚本开发 |
| **开放标准** | 任何开发者或 AI 工具均可加载，降低 PolkaInk 生态参与门槛，推动社区共建 |

---

*PolkaInk Design Document v3.4*
*Write history on-chain. Memory that cannot be erased. ◎*
*2026-03*
