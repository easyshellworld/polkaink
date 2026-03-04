# PolkaInk RFC — Tokenomics v2 Migration

## 20260303 — Tokenomics v2 变更清单

基于 `docs/tokenomics.md` v2，以下为需要执行的全部变更。

---

### Contracts — 新增合约

* **StakingManager** (UUPS)
  * 88 DOT 质押 → mint Member NFT → 锁仓 3/6/12/24 个月
  * `stake(uint8 lockMonths) payable` — 质押并铸造 Member NFT
  * `unstake()` — 锁仓到期后取回 DOT
  * `earlyUnstake()` — 提前解锁，扣 10% penalty 入 Treasury
  * `claim()` — 用户主动领取到期退还的 DOT
  * `isActiveMember(address)` — 判断是否持有活跃 Member NFT
  * 1 个地址仅允许 1 个 Member NFT（多地址可以）

* **ReportManager** (UUPS)
  * 任何活跃 member 可举报已通过的文档
  * 举报阈值：`max(3, floor(original_NO_voters × 1.5))`
  * 流程：举报达标 → 冻结 72h → 重新投票 72h
  * 重投规则：**无 boost、无 veto**，1 member = 1 vote，quorum ≥ 5
  * YES > NO → 维持，否则 revoke
  * 每文档最多举报 2 次

### Contracts — 重大修改

* **GovernanceCore**
  * 新投票权重公式：`weight = has_active_member × (1 + boost)`
  * boost = B_creator + B_author + B_og + B_lock（全部使用对数/线性，详见 tokenomics.md）
  * 通过条件：`Σ(vote_i × weight_i) > 2.0`
  * OG Gold veto：任一 OG Gold 投 NO → 直接否决（仅普通投票，re-vote 不适用）
  * **移除**提案质押机制（改为 membership stake）
  * **移除** Archive Council 审查期和 Timelock 队列（文档提案直投直过）
  * 保留 TimelockController 仅用于合约升级/参数变更类提案
  * 投票选项：YES(+1) / NO(-1) / ABSTAIN(0)

* **NFTReward**
  * 新 NFT 类型枚举：`Member | Creator | Author | OGBronze | OGSilver | OGGold`
  * Member NFT：`lockEnd` 字段，到期后变为 commemorative（无投票权）
  * Creator NFT：提案通过时自动铸造，可叠加
  * Author NFT：文档创建时自动铸造，1 per doc，仅对该文档有 boost
  * OG Bronze：team airdrop，cap 3
  * OG Silver：team airdrop，cap 2
  * OG Gold：team airdrop，1 per person，NO vote = veto
  * 新增 `mintMemberNFT` / `mintOGNFT` 等方法（仅 StakingManager / admin 可调用）

* **VotingMath** (library)
  * `B_creator = 0.30 × ln(1 + creator_count) / ln(11)` — lookup table
  * `B_author = 0.15 × is_author_of_current_doc`
  * `B_og = 0.05 × min(og_bronze, 3) + 0.10 × min(og_silver, 2) + 0.10 × has_og_gold`
  * `B_lock = 0.30 × ln(1 + lock_months) / ln(25)` — lookup table
  * Solidity 中 `ln()` 用 lookup table 近似

* **Treasury**
  * 收入来源改为：88 DOT stakes、early-unlock penalty (10%)、slashed stakes
  * 支出：lock 到期自动退还、社区奖励
  * Phase 2：DeFi yield → 50% creator rewards, 30% reserve, 20% voter rewards

### Contracts — 移除

* ~~**ArchiveCouncil**~~ — 7人委员会机制完全移除，由 OG Gold veto 替代
* 清理 ArchiveCouncil 相关角色授权、事件、错误码

### Contracts — 保留（无重大变更）

* **PolkaInkRegistry** — 保持文档生命周期管理，新增状态 `Frozen` / `Revoked`
* **VersionStore** — 不变
* **TimelockController** — 保留，仅用于合约升级和参数变更
* **ProxyAdmin** — 不变

---

### Frontend — 修改已有页面（尽量保留现有 UI 风格）

* **Home** — 仅更新统计数据展示（增加 Members 数量），其余不动
* **Library** — 在 Approved 文档卡片上增加「举报」按钮
* **Document** — 增加「举报」按钮 + 冻结状态显示
* **Create** — 增加 active Member NFT 检查（无 Member 则提示先质押）
* **Propose** — 移除 `StakeInput` 组件（不再需要提案质押），增加 Member 检查
* **Governance** — 更新投票 UI：
  * 显示 weight（boost 分解）而非 DOT 数量
  * 显示 OG Gold veto 状态
  * 投票按钮改为 YES / NO / ABSTAIN 三选一
  * 通过条件显示 `Score > 2.0` 而非百分比
* **Profile** — 更新 NFT 展示（6 种类型）+ 增加质押信息区域（锁仓状态、到期时间）
* **Council** — 转为简化的「OG Guardians」页面：显示 OG Gold 持有者列表 + veto 历史
* **Treasury** — 更新收支模型显示（stakes、penalties、DeFi yield）

### Frontend — 新增页面/组件

* **Staking 页面** (`/#/staking`) — 88 DOT 质押入口，锁仓期选择，解锁操作
  * 参考现有 Treasury/Profile 页面风格
  * 组件：StakeForm、LockSelector、StakeStatus、UnstakeButton
* **Report UI** — 集成到 Document 详情页
  * 举报按钮、冻结倒计时、重新投票面板

### Frontend — 新增 Hooks

* `useStaking.ts` — StakingManager 合约交互（stake/unstake/claim/status）
* `useReport.ts` — ReportManager 合约交互（report/revote/status）
* `useMembership.ts` — 检查用户是否为活跃 member + 获取 boost 信息

### Frontend — 修改 Hooks

* `useVote.ts` — 适配新投票接口（YES/NO/ABSTAIN，无 lockDays）
* `useVotingPower.ts` — 适配新 weight 计算公式
* `useCouncil.ts` — 简化为 OG Gold 查询，或移除

### Frontend — 新增 ABIs

* `StakingManager.json`
* `ReportManager.json`

### Frontend — 移除 ABIs

* ~~`ArchiveCouncil.json`~~ — 随 Council 合约移除

---

### 旧有 Bug（仍需修复）

* `Library` 中文档未倒序排列
* `Library` 中 `View on Explorer` 应链接到具体交易 hash，而非合约地址
* `Governance` 中提案名称应显示文档标题，非 `Version Update Proposal`
* `Governance` 中 `Proposer` 应显示提案人地址，非合约地址
* `Header` 钱包连接后应变为下拉菜单（profile / logout）
