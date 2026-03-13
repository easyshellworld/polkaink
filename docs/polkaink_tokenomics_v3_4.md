# ◎ PolkaInk — 代币经济模型 v3.4

**链上历史存档 · 社区共识 · DAO 治理**
*2026 年 3 月*

> **注：MVP 阶段运行于 Polkadot Hub 测试网（Chain ID 420420417），所有金额单位为测试网原生代币 PAS。正式上线主网后将迁移为 DOT。**

---

## 目录

1. [设计理念](#1-设计理念)
2. [成员资格与质押](#2-成员资格与质押)
3. [NFT 体系](#3-nft-体系)
4. [投票权重](#4-投票权重)
5. [提案与投票](#5-提案与投票)
6. [文档与版本模型](#6-文档与版本模型)
7. [Archive Council](#7-archive-council)
8. [内容争议处理](#8-内容争议处理)
9. [奖励与经济循环](#9-奖励与经济循环)
10. [防攻击设计](#10-防攻击设计)
11. [参数速查表](#11-参数速查表)
12. [版本演进对照](#12-版本演进对照)
13. [种子文档规划](#13-种子文档规划)
14. [后期路线图](#14-后期路线图)

---

## 1. 设计理念

PolkaInk 把 Polkadot 生态的历史写进链上——所有人都可以质押参与，所有贡献都留下可验证的痕迹，所有决策都通过社区投票完成，所有已写入的内容永远无法被删除。

### 六条核心原则

**质押入场，贡献加权**
88 PAS 是参与资格，不是话语权筹码。持有 Member NFT 才能投票，但投票权重取决于你写了多少被接受的内容、锁仓了多长时间。有钱买不来话语权，只能买来入场资格。

**线性历史，不可篡改**
每个文档是一段线性历史。提案是 Pull Request，投票通过即合并，内容永久写入链上 calldata。没有撤销，没有删除——只有在历史上继续书写。

**单人不可通过**
权重硬上限 cap=2.00，恰好等于通过阈值 T。单人最大实际权重为 1.80（20 篇通过 + 24 个月锁仓），任何单一用户的 YES 票永远不足以让提案通过，最简情况需要至少两名成员的支持。

**贡献对等，平权基底**
写作贡献（B_hist）与锁仓贡献（B_lock）上限相同，均为 +0.40。没有哪种贡献被设计成碾压另一种。团队空投特权 NFT 已全部废除。

**集体守护，透明否决**
Archive Council 只在必要时踩刹车，每次否决都必须附上链上理由，永久可查。Council 不主导内容，不在普通投票中享有权重加成。

**激励参与，不扭曲投票**
投票奖励通过 30 天 Epoch 发放，无论投 YES 还是 NO，认真参与治理都能获得奖励。奖励与投票立场解耦，保持判断的独立性。

---

## 2. 成员资格与质押

### 2.1 入场：质押 88 PAS

质押恰好 88 PAS，选择锁仓期（3 / 6 / 12 / 24 个月），自动获得 Member NFT，成为活跃成员。

```
质押 88 PAS + 选择锁仓期
  → 自动 mint Member NFT
  → 成为活跃成员（可投票、可创建文档、可提案）
```

### 2.2 锁仓选项与加成

| 锁仓时长 | B_lock 加成 | 基础 weight（无其他加成） |
|---------|------------|----------------------|
| 3 个月  | +0.1723¹   | 1.1723 |
| 6 个月  | +0.2418¹   | 1.2418 |
| 12 个月 | +0.3187¹   | 1.3187 |
| 24 个月 | +0.4000    | 1.4000 |

¹ 精确值以合约 VotingMath 为准，此处为近似值。

锁仓越长，加成越高，体现对协议的长期承诺。加成通过对数公式计算，早期增长明显，后期趋于平缓。

### 2.3 退出与惩罚

**正常到期退出**
锁仓期满后调用 `unstake()`，88 PAS 全额返还，Member NFT 变为纪念性（永久保留，但无投票权）。

**提前解锁**
随时可调用 `earlyUnstake()`，返还 79.2 PAS（90%），8.8 PAS 进入 Treasury 奖励池。Member NFT 立即 deactivate。无冷却期，可立即重新质押。

### 2.4 成员资格与投票权

成员资格在锁仓期间持续有效。**只有持有 active Member NFT 的地址才能投票、提案、创建文档。** 到期或解锁后失去投票权，但 Creator NFT 的记录永久保留，重新质押后加成立即恢复。

---

## 3. NFT 体系

v3.3 共三种 NFT，全部通过链上行为获得，Demo 阶段均为 Soulbound（不可转让）。团队空投特权 NFT（OGBronze / OGSilver / OGGold）已全部废除。Author NFT 已于 v3.2 移除，以降低系统复杂度（可在正式上线后通过 DAO 提案重新引入）。

### 3.1 三种 NFT 概览

| NFT | 获取方式 | 可叠加 | 投票影响 | 特殊权限 |
|-----|---------|--------|---------|---------|
| **Member** | 质押 88 PAS 时自动 mint | 1/地址 | 投票资格（无此 NFT 则无法投票） | 无 |
| **Creator** | 版本提案被执行合并后自动 mint | 是，无上限 | B_hist 加成（对数增长，上限 +0.40） | 无 |
| **Guardian** | 部署时构造函数直接写入（7 个创世地址） | 1/人 | **无**投票权重加成 | Archive Council 集体 veto 权 |

### 3.2 Creator NFT — 写作贡献的累积证明

每次版本提案被社区投票通过并执行合并后，提案人自动获得一枚 Creator NFT。

Creator NFT 可无限叠加，但加成通过对数公式递减——第 1 枚价值最高，第 20 枚后接近上限：

| Creator NFT 数量 | B_hist 加成 |
|----------------|------------|
| 0  | 0 |
| 1  | +0.091 |
| 3  | +0.182 |
| 5  | +0.235 |
| 10 | +0.315 |
| 20 | +0.400（上限） |

早期参与者每一篇贡献的边际价值更高，但持续贡献始终有意义，且任何人都无法通过大量刷文章无限扩大权重。

### 3.3 Guardian NFT — 仅 veto，无加成

Guardian NFT 在合约部署时由构造函数直接 mint 给 7 个创世 Council 成员地址，**任何人（包括项目方）事后都无法再 mint 新的 Guardian NFT**。这是协议彻底去中心化设计的一部分——没有特权管理员可以随意扩充 Council。

Guardian 不增加任何投票权重。Council 成员在普通投票中和普通成员完全平等，只靠自己的 B_hist + B_lock 贡献权重。Guardian 的唯一特权是在特定时间窗口内，与其他 Council 成员共同行使集体否决权。

---

## 4. 投票权重

### 4.1 公式

```
weight = min(1.0 + boost, 2.00)

boost = B_hist + B_lock

B_hist = 0.40 × ln(1 + creator_nft_count) / ln(21)
         上限 0.40（约 20 枚 Creator NFT 达到上限）

B_lock = 0.40 × ln(1 + lock_months) / ln(25)
         3mo: +0.1723 · 6mo: +0.2418 · 12mo: +0.3187 · 24mo: +0.4000
         （精确值以合约 VotingMath 为准）

Guardian NFT：不贡献任何 boost

硬上限：weight = min(weight, 2.00)
```

> **v3.2 变更说明：** B_author 字段已随 Author NFT 一并移除。最大理论权重从 1.95 调整为 1.80（20 篇文章 + 24 个月锁仓），单人不可通过的核心约束依然成立（1.80 < T=2.0）。

> **v3.3 变更说明：** 权重公式本身无变化。VotingMath.calculateWeight 参数简化为 3 个（移除 isAuthorOfDoc / isProposer 冗余参数）。voterCount 统计口径统一为全部实际投票人数，不过滤门槛。

> **v3.4 变更说明：** 明确区分硬上限与实际最大权重：权重 **硬上限 cap = 2.00**（合约 MAX_WEIGHT 常量），**单人最大实际权重 = 1.80**（20 篇 Creator NFT + 24 个月锁仓时 boost 之和）。两者均小于通过阈值 T=2.0，单人永远无法独自通过提案。

### 4.2 典型用户权重

| 用户画像 | B_hist | B_lock | Weight |
|---------|--------|--------|--------|
| 新成员，3 个月锁仓 | 0 | 0.1723 | **1.1723** |
| 5 篇文章通过，6 个月锁仓 | 0.235 | 0.2418 | **1.4768** |
| 10 篇文章，12 个月锁仓 | 0.315 | 0.3187 | **1.6337** |
| 20 篇文章，24 个月锁仓 | 0.400 | 0.4000 | **1.800** |

> **关键数字：权重硬上限 cap=2.00，单人最大实际权重=1.80 < T=2.0。**
> 无论一个人积累了多少 Creator NFT、锁仓多长时间，单人投 YES 永远不足以让提案通过。

### 4.3 为什么 B_hist 和 B_lock 上限相同？

写了 20 篇被接受文章的活跃贡献者，与锁仓 24 个月的长期质押者，在权重上处于同等的天花板（各自 +0.40）。二者都是对协议真实的价值贡献——写内容贡献了历史记录，长期锁仓承诺了流动性稳定。没有哪种贡献被设计成系统性地高于另一种。

---

## 5. 提案与投票

### 5.1 提案类型

| 类型 | 用途 | 入口 | 质押要求 | 投票期 | 奖励 |
|------|------|------|---------|-------|------|
| **VersionUpdate** | 修改文档内容（核心功能） | Registry.proposeVersion() | 无 | 7 天 | ✅ 发放奖励 |
| **UpgradeContract** | 升级合约实现 | GovernanceCore.createProposal() | 5 PAS | 7 天 | ❌ 质押退还，不发奖励 |
| **ParameterChange** | 修改治理参数 | GovernanceCore.createProposal() | 5 PAS | 7 天 | ❌ 质押退还，不发奖励 |
| **EmergencyConfirm** | DAO 确认紧急冻结 | 由 ArchiveCouncil 自动创建 | 无 | 48 小时 | ❌ 不发奖励 |

奖励机制（50%/30%/20% 分配）**仅适用于 VersionUpdate 类型**。UpgradeContract 和 ParameterChange 执行成功后，5 PAS 质押退还提案人，不触发任何奖励分配。

### 5.2 通过条件

**三重门槛，同时满足：**

```
① score > 2.0
   score = Σ(choice × weight)
   YES = +weight，NO = −weight，ABSTAIN = 0

② 参与率 ≥ 5%
   = 实际参与投票的总权重 / 提案创建时的全网基础权重快照

③ Archive Council 未在 24 小时审查窗口内完成集体否决（5/7，Demo 阶段）
```

**EmergencyConfirm 提案的特殊规则：**
参与率门槛提升至 15%，投票期缩短至 48 小时，无 Council 审查窗口。

### 5.3 投票流程时序

```
提案创建
  → 快照 snapshotTotalWeight（全网活跃 member 数 × 1.0）
  → 7 天投票期

投票期结束 → 任何人调用 finalizeProposal()
  → 通过：status = Approved，开启 24h Council 审查窗口
  → 未通过：status = Rejected，提案人进入 72h 冷却期

Approved 状态（24h Council 窗口）
  → Council 成员可调用 castVeto()
  → 5/7 达成 → CouncilVetoed，提案人进入 72h 冷却期
  → 窗口期满，未达 veto → 任何人调用 executeProposal()

执行（VersionUpdate）：
  → 文档 HEAD 更新，mint Creator NFT
  → 若 rewardPoolBalance ≥ 50 PAS：发放动态奖励（50%/30%/20%）
  → 若 rewardPoolBalance < 50 PAS：跳过奖励分配，提案照常 merge

执行（UpgradeContract / ParameterChange）：
  → 进入 48h Timelock 队列
  → 执行成功后 5 PAS 质押退还提案人
  → 不触发任何奖励分配
```

### 5.4 提案串行规则与冷却期

同一文档同一时间只允许一个活跃提案（单 PR 串行模型）。

**72h 冷却期触发条件：**
- 提案被投票否决（Rejected）
- 提案被 Council veto（CouncilVetoed）—— v3.3 新增

冷却期内同一地址对同一文档无法再次提案。主动取消（Cancelled）不触发冷却。

### 5.5 前端提案社交分享

提案创建后，前端 Propose 页面和 ProposalDetail 页面均提供**一键社交分享**功能，帮助提案人主动扩散，吸引更多成员参与投票（投票人数越多，动态奖励越高，见 §9.2）。

**分享内容生成规则：**

```
分享文案模板（自动填充）：
  "[文档标题] 有新提案待投票！
   提案摘要：{proposal_summary_first_100_chars}
   截止时间：{deadline}
   参与投票：{dapp_url}/governance/{proposalId}
   #PolkaInk #Polkadot"

分享目标：
  Twitter/X：生成预填充推文链接
  Telegram：生成预填充消息链接
  复制链接：直接复制提案页面 URL 到剪贴板

展示位置：
  /document/:id/propose  → 提案提交成功后弹出分享卡片
  /governance/:id        → ProposalDetail 页面右上角分享按钮
```

**前端实现要点：**
- 分享按钮对所有访客可见，**无需连接钱包**
- 未连接钱包时不附加 ref 参数；连接钱包后自动附带 `?ref={address}`（链下统计传播来源，不影响链上逻辑）
- 投票期结束后按钮变为"查看结果并分享"样式
- 移动端优先调用原生 Web Share API（`navigator.share()`），不支持时降级为链接按钮

---

## 6. 文档与版本模型

### 6.1 类 Git 线性历史

每个文档维护一条线性历史，类比 Git 的 main branch：

```
文档创建（v1，种子文档仅含标题，内容为空）
  → PR 提出 → 社区投票 → 通过合并（v2，首次填充内容）
  → PR 提出 → 社区投票 → 通过合并（v3）
  → PR 提出 → 社区投票 → 通过合并（v4）  ← HEAD
```

每个合并后的版本都在链上 calldata 中永久存储，任何人可以溯源到最初的版本。

### 6.2 版本历史展示（Git Log 风格）

```
◎──── v4  [merged]   2026-02-15   PR #38  Score +4.21  参与率 12%
│         "补充 JAM 白皮书发布事件"  by 0xABCD...
│
◎──── v3  [merged]   2026-01-20   PR #21  Score +3.87  参与率 9%
│         "修正 OpenGov Phase2 描述"  by 0x1234...
│
◎──── v2  [merged]   2025-12-10   PR #12  Score +5.10  参与率 14%
│         "首次填充内容"  by 0xABCD...
│
◎──── v1  [seed]     2025-11-01
          "文档创建（标题：Polkadot 生态大事记）"  by Admin

── 活跃 PR ──────────────────────────────────────────────
⏳  PR #45  "增加 2025 Q1 事件"  by 0x5678...
    基于 v4 · 截止 2026-03-13 · Score +1.20 · 5 天剩余
```

### 6.3 Frozen 状态与提案

文档处于 Frozen 状态时，**仍允许**提交新的 proposeVersion，提案可正常进入投票流程。但若提案在 Council 窗口期满后调用 `executeProposal()` 执行 merge 时，文档仍处于 Frozen 状态，则 revert——merge 须等文档恢复 Active 后才能完成。

### 6.4 为什么废除举报机制？

旧版举报机制存在根本性问题：**与链上历史不可篡改的核心价值矛盾**，calldata 永远存在，"Revoked"只是状态标记。可被武器化（批量建号反复冻结）。与 Council veto 职责重叠。

替代方案更干净：
- 内容需要修正 → 提新版本（正确的历史书写方式）
- 提案通过前发现问题 → Council veto（24h 窗口）
- 提案执行后极端情况 → Council 紧急冻结（72h DAO 确认）

---

## 7. Archive Council

### 7.1 定位与职责

Archive Council 是协议的最后一道伦理防线，不是治理的主导者。

Council 有且仅有两项链上权力：
1. **集体 veto**：对刚通过（Approved）的提案，在 24 小时审查窗口内，以 5/7 多数否决
2. **紧急冻结**：对已执行的文档，在极端情况下，以 5/7 多数触发冻结，但必须在 72 小时内获得 DAO 确认

Council 成员在普通投票中**没有任何权重加成**，与普通成员完全平等。

### 7.2 创世配置与去中心化路径

**部署阶段**：7 个 Council 成员地址在合约**构造函数**中直接写入，部署时同步 mint Guardian NFT。不存在 `GUARDIAN_MINTER_ROLE`，**任何人事后都无法增加或 mint 新的 Guardian NFT**。

**协议无特权管理员**：种子文档创建完成后，`SEED_CREATOR_ROLE` 立即 renounce。此后协议中**不存在任何特权管理员**，完全由合约逻辑和 DAO 治理驱动。

> 前端在 Council 页面明确标注：**"当前 Archive Council 为创世成员配置，Phase 1 前成员保持固定，治理迁移将通过 DAO 提案完成，项目方无法单方面干预。"**

**迁移至选举制**：

```
Demo 阶段（当前）
  7 个创世成员，构造函数写入
  veto 门槛：5/7
  无 setMember()，Phase 1 前成员地址保持创世配置

Phase 1（社区主导，DAO 提案触发）
  社区通过 DAO 提案部署 CouncilElection 合约
  调用 transferControlToElection()（不可逆）
  veto 门槛降至 4/7
  后续成员变更完全由选举合约管理

Phase 2+（完整自治）
  6 个月任期轮换，开放提名，Guardian NFT 自动换届
  75% DAO 超级多数可罢免 Council 成员（走 Timelock）
```

### 7.3 veto 权限边界

| 可行使否决的情形 | 不得行使否决的情形 |
|---------------|----------------|
| 包含可验证虚假历史陈述 | 内容写得不够好（主观判断） |
| 合约升级代码含隐藏后门 | 社区有争议但内容本身合法 |
| 明显侵权或违法风险 | 政治立场或价值观分歧 |
| 仇恨或歧视性内容 | EmergencyConfirm 提案本身 |

每次行使否决权必须选择以上原因之一，并提供 ≥ 50 字节的链上文字说明，永久记录，公开可查。

### 7.4 紧急冻结流程

```
Council 成员发现已执行文档存在极端问题
  → 调用 castEmergencyFreeze(docId, reason, description)
  → 5/7 达成后：
      文档状态 = Frozen（暂停显示，内容仍在链上）
      自动创建 EmergencyConfirm 提案（48h 快速投票，15% 参与率）
      设置 72h DAO 确认截止时间

DAO 48h 投票结果（投票结束后任何人可调用 executeProposal()）：
  通过（确认冻结）→ 文档维持 Frozen 状态
  未通过（拒绝冻结）→ 文档立即恢复 Active

超过 72h 内无人执行 executeProposal()，或执行后仍未确认：
  → 任何人调用 checkAndAutoUnfreeze() → 文档自动恢复 Active

限制：
  同一文档最多触发 1 次紧急冻结
  无论结果如何，链上 calldata 内容永远不变
```

### 7.5 Council 成员津贴

Council 成员承担持续的审查责任（24 小时响应窗口、紧急冻结联署），应获得合理的链上补偿。

**津贴发放机制（固定发放，无条件）：**

```
发放周期：与奖励 Epoch 对齐（30 天 / Epoch）
每位成员每 Epoch 津贴：5 PAS
全体 Council（7 人）每 Epoch 合计：35 PAS
资金来源：Treasury rewardPool

领取方式：
  Epoch 结束后，7 名成员均可调用 claimCouncilAllowance(epochId) 领取
  无响应率要求，无参与条件，纯固定发放
```

---

## 8. 内容争议处理

三种情况，三条路径，职责不重叠：

### 路径一：内容需要更新或修正（日常情况）

**正确做法：提交新版本提案。**

任何活跃成员都可以对任何文档提出修改提案。旧版本永久保留在链上，新版本通过投票合并后成为新 HEAD。

```
发现 v3 有描述不准确的地方
  → 提交 PR：基于 v3，修改后形成 v4 草稿
  → 社区投票（7 天）
  → 通过 → v4 成为新 HEAD，v3 永久保留
  → 未通过 → v3 维持 HEAD，72h 后可再次尝试
```

### 路径二：提案通过前发现严重问题（Council veto）

```
提案 PR #45 通过社区投票（Approved）
  → 开启 24h Council 审查窗口
  → Council 成员发现内容包含虚假史实
  → 5/7 成员调用 castVeto()，附上链上说明
  → 提案状态变为 CouncilVetoed
  → 文档 HEAD 不变，提案人进入 72h 冷却期后可修改重新提案
```

### 路径三：提案执行后发现极端问题（紧急冻结）

```
文档 v4 已合并执行
  → Council 发现 v4 包含严重侵权内容
  → 5/7 调用 castEmergencyFreeze()，附上链上说明
  → 文档状态 = Frozen，自动创建 DAO 确认提案
  → DAO 在 48h 内投票（参与率 ≥ 15%）
      通过 → 维持 Frozen
      未通过 → 自动解冻
  → 超过 72h 任何人可触发 checkAndAutoUnfreeze() 兜底解冻
  → 无论结果，v4 的 calldata 永远在链上
```

---

## 9. 奖励与经济循环

### 9.1 奖励分配

每个成功执行合并的 **VersionUpdate 提案**，在 rewardPool 余额充足时，按**动态计算的实际奖励总额**分配：

```
50% → 提案人（executeProposal 时立即转账）
30% → 本 Epoch 达标投票者（Epoch 结算，按权重比例分配）
20% → Treasury rewardPool 留存

若 rewardPoolBalance < 50 PAS：
  跳过全部奖励分配，提案照常 merge，奖励为零
```

UpgradeContract 和 ParameterChange 提案**不参与奖励分配**，执行成功后仅退还 5 PAS 质押。

### 9.2 提案动态奖励计算

```
ProposalReward 计算规则：

  基础奖励 = 50 PAS（固定基数）

  投票人数加成：
    = 实际参与投票总人数 × 1 PAS/人
    （统计所有投票人，不过滤门槛）
    例：15 人参与 → +15 PAS
        50 人参与 → +50 PAS

  动态上限 = min(当前 rewardPoolBalance × 10%, 200 PAS)
    （防止单次提案过度消耗 rewardPool）

  实际奖励 = min(基础奖励 + 投票人数加成, 动态上限)

示例（rewardPool = 5,000 PAS）：
  动态上限 = min(500, 200) = 200 PAS
  20 人参与 → 50 + 20 = 70 PAS → 实际奖励 70 PAS
  150 人参与 → 50 + 150 = 200 PAS → 动态上限封顶，实际奖励 200 PAS
```

**边界情况：** 若 `rewardPoolBalance < 50 PAS`，本次提案跳过奖励分配，提案照常 merge。

**设计意图：**
- 固定基数确保提案人有稳定预期
- 投票人数加成将"吸引更多人参与投票"变为提案人的直接利益，激励主动传播（与 §5.5 社交分享协同）
- 动态上限防止国库早期被快速耗尽；200 PAS 硬上限同时防止大额捐款操控单次奖励上限

### 9.3 Epoch 投票奖励：30 天周期

```
Epoch 周期：合约部署时记录起始 block timestamp，
            每 30 × 86400 秒为一个 Epoch，epochId 从 0 递增
            前端展示为"YYYY年MM月"自然月标签

达标条件：
  在本 Epoch 内，参与了 ≥ 50% 的有效提案投票
  （有效提案 = 进入完整投票流程的提案，Cancelled 不计入分母）

奖励计算：
  本 Epoch 内所有通过 VersionUpdate 提案的 30% 奖励份额合计
  = 本 Epoch 投票者奖励池
  达标成员按各自投票权重比例分配

领取：
  Epoch 结束后任何人可调用 finalizeEpoch()
  达标成员调用 claimEpochReward() 领取

无提案的 Epoch：无奖励结算
```

**投票奖励与立场解耦：** 投 YES、NO、ABSTAIN 都满足参与条件，奖励与投票立场完全无关，杜绝"为了拿钱跟风投 YES"的扭曲动机。

### 9.4 Treasury 资金流

```
来源：
  ├── 提前解锁罚金（10%，每次约 8.8 PAS，StakingManager → Treasury）
  ├── MVP 初始注资（5,000 PAS，Admin 在部署后、renounce 前调用
  │   depositRewardPool()，一次性）
  ├── 社区捐款（任意地址调用 depositRewardPool() 或直接转账，
  │   均进入 rewardPool，立即参与奖励分配）
  └── Polkadot 生态 Grant 拨款（中长期）

注：5,000 PAS 初始注资完成后，项目方不再持有任何特权，
    后续国库补充依赖罚金自持循环 + 社区捐款 + Grant 三条路径。

用途：
  ├── VersionUpdate 提案人奖励（50%，动态计算，立即发放）
  ├── Epoch 投票者奖励（30%，Epoch 汇总后结算）
  ├── rewardPool 留存（20%）
  ├── Council 成员津贴（35 PAS / Epoch，7 人 × 5 PAS，固定发放）
  └── 协议运营（须通过 TimelockController 审批）

注：
  88 PAS 质押金由 StakingManager 合约持有，不经过 Treasury
  到期解锁时从 StakingManager 直接返还用户
```

### 9.5 冷启动策略

| 阶段 | 策略 |
|------|------|
| Demo（MVP） | 部署后一次性注入 5,000 PAS，激活奖励循环；注资完成后 Admin 无任何剩余权限 |
| 早期 | Creator NFT 对数曲线激励早期贡献；社交分享扩大提案曝光，提升投票人数加成 |
| 中期 | 申请 Polkadot Grant；提前解锁罚金形成持续来源；社区捐款补充 rewardPool |
| 长期 | Phase 2 接入 DeFi yield 补充国库（见 §14）|

---

## 10. 防攻击设计

### 10.1 关键攻击向量与缓解

| 攻击向量 | 缓解机制 |
|---------|---------|
| 多地址刷投票权 | 88 PAS/地址门槛；新地址 weight=1.0，无 boost，边际效用递减 |
| 少数人偷通提案 | 5% 参与率门槛，快照于提案创建时，分母不可操纵 |
| 单人权重过大 | 硬 cap weight=2.00=T，单人 score ≤1.80，永不超过 T |
| 反复发起无意义提案 | 同地址同文档 Rejected / CouncilVetoed 后 72h 冷却期 |
| Council 滥用否决 | 强制 ≥50 bytes 链上理由；Phase 2 引入 DAO 推翻机制 |
| Council 滥用紧急冻结 | 72h 内必须 DAO 确认（15% 参与率），否则自动解冻；同文档限 1 次 |
| 闪电贷操控投票 | 锁仓 3-24 个月，无法在单笔交易内获取 |
| 合约升级滥用 | Timelock 48h + DAO 投票 + 5 PAS 提案质押 |
| 特权管理员滥权 | 部署完成后协议无任何特权管理员，完全合约逻辑驱动 |
| 捐款操控奖励上限 | 动态上限 200 PAS 硬上限防止单次捐款操控奖励发放 |
| Council 成员被非法替换 | Guardian NFT 无 minter role，任何人无法事后增发；Phase 1 前无 setMember()；Phase 1 后须经选举合约管理 |

### 10.2 权力制衡结构

```
普通成员
  权力：投票、提案、创建文档、向 rewardPool 捐款
  制约：88 PAS 门槛，5% 参与率，单人不可通过

Archive Council
  权力：集体 veto（24h 窗口），集体紧急冻结（需 DAO 确认），定期固定津贴
  制约：无投票加成，强制公开理由，紧急冻结有时效限制
        Phase 1 前成员地址保持创世配置，迁移路径不可逆；Phase 1 后由选举合约管理

TimelockController
  权力：合约升级、参数变更执行
  制约：必须经 DAO 投票 + 48h 延迟，不可升级

DAO（全体活跃成员）
  权力：最终决策权，可确认/拒绝 Council 紧急冻结
        Phase 1：通过 DAO 提案触发 Council 选举迁移
  制约：参与率门槛，单人不可通过
```

---

## 11. 参数速查表

| 参数 | 正式值 | MVP 测试值 | 可调整性 |
|------|--------|----------|---------|
| 质押金额 | 88 PAS | 88 PAS | ParameterChange 提案 |
| 锁仓选项 | 3/6/12/24 个月 | 同左 | ParameterChange 提案 |
| 提前解锁罚金 | 10% | 10% | ParameterChange 提案 |
| 投票周期（常规） | 7 天 | **10 分钟** | ParameterChange 提案 |
| 投票周期（EmergencyConfirm） | 48 小时 | **5 分钟** | ParameterChange 提案 |
| 通过阈值 T | 2.0 | 2.0 | **不可变** |
| 最大权重 cap | 2.00 | 2.00 | **不可变** |
| 参与率门槛（常规） | 5% | 5% | ParameterChange 提案 |
| 参与率门槛（EmergencyConfirm） | 15% | 15% | ParameterChange 提案 |
| Council 审查窗口 | 24 小时 | **3 分钟** | ParameterChange 提案 |
| veto 门槛（Demo） | 5/7 | 5/7 | 迁移时变更 |
| veto 门槛（正式） | 4/7 | — | ParameterChange 提案 |
| 紧急冻结 DAO 确认期 | 72 小时 | **15 分钟** | ParameterChange 提案 |
| 每文档最大紧急冻结次数 | 1 次 | 1 次 | **不可变** |
| 提案冷却期（Rejected / CouncilVetoed） | 72 小时 | **5 分钟** | ParameterChange 提案 |
| Epoch 周期 | 30 天 | **1 小时** | ParameterChange 提案 |
| Epoch 投票达标比例 | ≥50% 有效提案 | 同左 | ParameterChange 提案 |
| 提案人奖励比例 | 50% | 50% | ParameterChange 提案 |
| 投票者奖励比例 | 30% | 30% | ParameterChange 提案 |
| rewardPool 留存比例 | 20% | 20% | ParameterChange 提案 |
| 提案基础奖励 | 50 PAS | 50 PAS | ParameterChange 提案 |
| 国库奖励动态上限比例 | 10%（上限 200 PAS） | 同左 | ParameterChange 提案 |
| 投票人数奖励加成 | 1 PAS / 人 | 1 PAS / 人 | ParameterChange 提案 |
| MVP 初始注资 | 5,000 PAS | 5,000 PAS | 一次性，Admin 操作 |
| 奖励发放最低余额 | 50 PAS | 50 PAS | **不可变** |
| UpgradeContract 质押 | 5 PAS | 5 PAS | ParameterChange 提案 |
| ParameterChange 质押 | 5 PAS | 5 PAS | ParameterChange 提案 |
| Timelock 延迟 | 48 小时 | **2 分钟** | **不可变** |
| B_hist 上限 | 0.40（≈20 枚） | 同左 | **不可变** |
| B_lock 上限 | 0.40（24 个月） | 同左 | **不可变** |
| Council 成员津贴（每人/Epoch） | 5 PAS | 5 PAS | ParameterChange 提案 |

> **MVP 测试值说明：** MVP 测试值直接写入合约常量，正式部署时替换为正式值。MVP 阶段所有时间参数大幅压缩，便于完整验证治理流程。

---

## 12. 版本演进对照

| 问题 | v2 | v3.1 | v3.2 | v3.3 | v3.4 |
|------|-----|------|------|------|------|
| 单人否决权 | OG Gold 一票直接 veto | Archive Council 5/7 集体否决，需链上理由 | 同 v3.1 | 同 v3.1 | 同 v3.1 |
| 团队空投特权 | OGBronze/Silver/Gold 团队空投 | 废除 | 同 v3.1 | 同 v3.1 | 同 v3.1 |
| 无参与率门槛 | 2 人可偷通提案 | 5% 参与率，快照不可操纵 | 同 v3.1 | 同 v3.1 | 同 v3.1 |
| 单人可过提案 | max weight 2.35 > T | 硬 cap 2.00，单人最高 1.95 | 移除 Author NFT，最高 1.80 | 同 v3.2 | **明确区分 cap=2.00 与单人实际最高=1.80** |
| 举报武器化 | 任意成员可举报 | ReportManager 移除 | 同 v3.1 | 同 v3.1 | 同 v3.1 |
| 投票无激励 | 无 | Epoch 制度，不绑定立场 | 同 v3.1 | 同 v3.1 | 同 v3.1 |
| 奖励缺乏弹性 | — | 固定比例，无基数 | 固定基数 + 人数加成 + 动态上限 | 同 v3.2 | 同 v3.2 |
| NFT 体系复杂 | OG 三级 | 四种 NFT | 移除 Author NFT，三种 | 同 v3.2 | 同 v3.2 |
| Council 无激励 | — | 无补偿 | Epoch 津贴（含条件） | **简化为固定无条件发放** | 同 v3.3 |
| Council veto 无冷却 | — | — | — | **veto 后增加 72h 冷却期** | 同 v3.3 |
| 国库注资不明确 | — | 无金额 | 明确 5,000 PAS | 同 v3.2 | 同 v3.2 |
| 提案类型奖励不区分 | — | — | — | **明确仅 VersionUpdate 发奖励** | 同 v3.3 |
| Admin 持续存在 | — | — | Admin 多项权限 | **部署完成后零特权管理员** | 同 v3.3 |
| 捐款机制不明确 | — | — | — | **任何人均可向 rewardPool 捐款** | 同 v3.3 |
| Council 成员描述不准确 | — | — | Admin 可 setMember | **构造函数写入，Phase 1 前无法替换** | **明确 Phase 1 后过渡至选举制** |
| 时间周期不可测试 | — | — | — | **新增 MVP 测试值，大幅压缩** | 同 v3.3 |
| 种子文档内容 | — | — | 首版写入内容 | **首版仅含标题，内容后续提案填充** | 同 v3.3 |

---

## 13. 种子文档规划

### 13.1 设计意图

协议上线时预先创建 4 个核心种子文档，覆盖 Polkadot 生态最重要的历史维度，为社区贡献奠定内容框架。

种子文档由 Admin 调用 `Registry.createSeedDocument()` 创建，**首版仅写入标题和标签，内容为空**。后续内容通过正常提案投票流程填充，与普通文档完全相同。`SEED_CREATOR_ROLE` 在 4 个文档创建完毕后立即 renounce，此后任何人（包括项目方）无法再调用此函数。

### 13.2 四个核心种子文档

| 文档标题 | 标签 | 定位 |
|---------|------|------|
| **Polkadot 生态大事记** | `#history` `#timeline` | 综合性，适合新手入门 |
| **治理提案大事记** | `#governance` `#referenda` | 与链上治理深度结合 |
| **Runtime 升级日志** | `#technical` `#runtime` | 对开发者友好 |
| **生态项目里程碑** | `#ecosystem` `#projects` | 仅记录公开可验证信息 |

### 13.3 创建与演进规则

**首版仅含标题**：`createSeedDocument()` 写入标题和标签，链上 markdown 内容为空字符串，proposalId = 0，在链上标记为 `seed_version`。

**首次内容填充**：任意活跃成员可对种子文档提交首个版本提案（基于空白 v1），经社区投票通过后成为 v2（首次有实质内容的版本）。

**后续修改**：与普通文档完全相同，须经提案投票通过后合并。

**任意成员创建新文档**：除预设种子文档外，任意活跃成员均可创建新文档。前端 Library 页面支持按标签筛选。

---

## 14. 后期路线图

### 14.1 年度名人堂（Hall of Fame）

在协议稳定运行、社区规模达到一定门槛后，PolkaInk 计划推出**年度名人堂**子模块，每年举办一届，选出年度最具影响力的 10 位 Polkadot 生态贡献者，当选记录永久写入链上历史档案。

名人堂将形成独立的经济闭环：
```
提名费 + 投票费 + 预测市场手续费
  → 65% 名人堂内部分配
  → 35% 反哺 PolkaInk 主 Treasury rewardPool
```

预计在第 3 届后实现协议收入覆盖主要运营成本，详细设计见独立规划文档。

### 14.2 DeFi 质押扩展（Phase 2+）

**质押收益来源多元化：** Phase 2 计划接入 Polkadot Asset Hub 原生 yield，为 PolkaInk 质押者叠加额外 APY。

**质押流动性（Liquid Staking 方向）：** 探索为 88 PAS 质押者发行流动性凭证（如 pINK Token），允许质押者在锁仓期间将凭证用于 DeFi 协议，同时保留成员资格与投票权。

**跨协议收益整合：** 与 Polkadot 生态 DeFi 项目（如 Bifrost、HydraDX）合作，形成"历史存档贡献 × DeFi 收益"的双重激励模式。

> 以上 DeFi 扩展均属后期探索，不影响 MVP 核心机制的简洁性。

---

*PolkaInk · 把历史写进链上 · 让记忆无法被删除 · ◎*
*v3.4 · 2026 年 3 月*
