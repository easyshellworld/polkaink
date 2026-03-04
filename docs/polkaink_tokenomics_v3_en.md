# ◎ PolkaInk — Tokenomics v3

**On-Chain History Preservation · Community Consensus · DAO Governance**
*Draft · March 2026*

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [NFT System](#2-nft-system)
3. [Voting Weight Formula](#3-voting-weight-formula)
4. [Passing Criteria](#4-passing-criteria)
5. [Stake & Membership](#5-stake--membership)
6. [Archive Council](#6-archive-council)
7. [Dispute & Freeze Mechanism](#7-dispute--freeze-mechanism)
8. [Proposal Lifecycle](#8-proposal-lifecycle)
9. [Treasury & Economics](#9-treasury--economics)
10. [Contract Security](#10-contract-security)
11. [Anti-Sybil Considerations](#11-anti-sybil-considerations)
12. [Parameters Reference](#12-parameters-reference)
13. [v1 / v2 → v3 Design Decisions](#13-v1--v2--v3-design-decisions)

---

## 1. Design Philosophy

PolkaInk v3 synthesizes the best of two prior designs: the precise economic incentive structure and stake-based participation from v2 Tokenomics, and the robust governance security mechanisms (TimelockController, Council election, quorum requirements) from v1. The result is a model that is simultaneously fair, manipulation-resistant, and sustainable.

**Core principles:**

- **Stake-based participation** — 88 DOT stake as entry, a binding commitment with skin-in-the-game
- **Pure democratic voting** — no NFT tiers, no rank levels, no single-entity veto power
- **Contribution-weighted boost** — Historian (writing) and Guardian (council service) NFTs naturally accumulate influence through real action
- **Lock-time alignment** — longer commitment earns proportionally more voice
- **Archive Council as collective guardian** — 7 elected members with collective veto only; transparent, term-limited, community-removable
- **TimelockController as trust anchor** — immutable execution delay; the system's ultimate security guarantee with no admin override

---

## 2. NFT System

The NFT system is simplified to exactly two types. There are no tiered OG ranks, no team-airdropped privilege NFTs, and no special classes. Every NFT is earned exclusively through on-chain action.

### 2.1 Historian NFT (Author Badge)

| Attribute | Specification |
|-----------|---------------|
| Standard | ERC-721, optionally Soulbound during active votes |
| Mint trigger | Auto-minted when a version proposal is successfully merged |
| Stackable | Yes — one per successful proposal, no cap |
| Expiry | Permanent |
| Transferable | Default transferable; voluntarily lockable as Soulbound during voting |
| Boost effect | Cumulative — see Section 3 for formula |
| Token URI | Fully on-chain SVG (no IPFS dependency) |
| Visual style | Polkadot pink, ◎ symbol, sequential ID badge |

> **Design rationale:** Stacking Historian NFTs reflects actual contribution depth. The ln() curve means early NFTs carry higher marginal value while continued accumulation still matters — rewarding both early contributors and long-term participants. No airdropped NFTs means no privileged class: every NFT is earned.

### 2.2 Guardian NFT (Council Badge)

| Attribute | Specification |
|-----------|---------------|
| Standard | ERC-721, fully Soulbound (non-transferable) |
| Mint trigger | Auto-minted when elected to Archive Council |
| Per address | 1 (tied to a single council seat) |
| Expiry | Deactivated at end of 6-month term, or on removal |
| Boost effect | +0.20 to vote weight while active |
| Veto right | Yes — as part of the 7-member collective |
| Visual style | Polkadot purple, shield icon, term dates embedded on-chain |

---

## 3. Voting Weight Formula

Every active member has a base weight of `1.0`. Contributions and commitments add a positive boost. There is no negative multiplier and no single-entity veto outside of the collective Archive Council mechanism.

### 3.1 Formula

```
weight  =  has_active_member × (1 + boost)

boost   =  B_historian  +  B_guardian  +  B_lock

B_historian  =  0.40 × ln(1 + historian_count) / ln(21)
B_guardian   =  0.20 × has_active_guardian_nft
B_lock       =  0.40 × ln(1 + lock_months) / ln(25)
```

### 3.2 Boost Breakdown

| Component | Max Boost | Earned by | Basis |
|-----------|-----------|-----------|-------|
| B_historian | +0.40 | Writing & passing proposals | ln curve; 20 NFTs ≈ max |
| B_guardian | +0.20 | Elected to Archive Council | Binary: active Guardian NFT |
| B_lock | +0.40 | Longer stake lock duration | ln curve; 24 months = max |
| **Total max boost** | **+1.00** | — | **Max weight = 2.00** |

> **Why max weight = 2.00?**
> The threshold `T = 2.0` means a single user — even at maximum weight — cannot unilaterally pass a proposal. At least two active members must agree. This preserves genuine community consensus while rewarding deep contributors. Compare with v2's max weight of 2.35, which allowed solo passage.

### 3.3 Example Profiles

| Profile | B_hist | B_guard | B_lock | Boost | Weight |
|---------|--------|---------|--------|-------|--------|
| New member, 3mo lock | 0 | 0 | 0.13 | 0.13 | 1.13 |
| 5 proposals, 6mo lock | 0.23 | 0 | 0.16 | 0.39 | 1.39 |
| 10 proposals, 12mo lock | 0.29 | 0 | 0.22 | 0.51 | 1.51 |
| Council member, 12mo lock | 0 | 0.20 | 0.22 | 0.42 | 1.42 |
| 10 proposals + Council, 24mo | 0.29 | 0.20 | 0.40 | 0.89 | 1.89 |
| **Max: 20 proposals + Council, 24mo** | **0.40** | **0.20** | **0.40** | **1.00** | **2.00** |

---

## 4. Passing Criteria

A proposal passes only when **all three conditions** are simultaneously satisfied:

```
Condition 1 — Score threshold
  Σ(vote_i × weight_i) > T = 2.0
  [YES = +weight, NO = −weight, ABSTAIN = 0]

Condition 2 — Participation quorum
  totalParticipantWeight / snapshotTotalWeight > 5%

Condition 3 — Archive Council veto not triggered
  Council veto count < 4  (out of 7 council members)
```

### 4.1 Why the 5% Quorum Matters

The 5% quorum (absent in v2) is critical for legitimacy. Without it, a proposal can pass with only 2 participants regardless of overall membership size:

- Small coordinated groups cannot silently capture governance
- Proposals require visible community engagement, not just absence of opposition
- Cold-start protection: quorum begins at 3% in Phase 1, ramps to 5% at Phase 2

### 4.2 Scenario Examples

| Scenario | Score | Quorum? | Veto? | Pass? |
|----------|-------|---------|-------|-------|
| Author alone (w=1.39) | +1.39 | ❌ No | — | ❌ |
| Author + 1 member YES | +2.52 | Depends on total supply | — | Context |
| 10 members YES (all base) | +11.3 | ✅ Yes | — | ✅ |
| 10 YES, 3 Council vote NO | +9.0 | ✅ Yes | ❌ < 4 | ✅ |
| 10 YES, 4 Council vote NO | +7.2 | ✅ Yes | **VETO** | ❌ |
| Author + 2 YES, quorum met | +3.91 | ✅ Yes | — | ✅ |

---

## 5. Stake & Membership

Membership is obtained by staking exactly 88 DOT and choosing a lock duration. The stake is fully returned at lock expiry (or with a 10% penalty for early unlock). There are no tiers, no OG allocations, and no privileged airdrop recipients.

### 5.1 Stake Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| Stake amount | 88 DOT | Fixed; adjustable via ParameterChange proposal |
| Lock options | 3 / 6 / 12 / 24 months | Longer lock = higher B_lock boost |
| Early unlock penalty | 10% | Penalty goes to Treasury |
| Membership status | Active during lock period | Expires at lock end |
| Post-expiry NFT | Commemorative only (no vote) | Permanent on-chain record |
| Multi-address | Allowed | Each address independent; Sybil mitigated via quorum |
| Re-stake | Allowed immediately after expiry | New lock starts fresh |

### 5.2 Lock Duration vs Boost

| Lock Duration | B_lock | Weight (no other boost) |
|---------------|--------|-------------------------|
| 3 months | 0.13 | 1.13 |
| 6 months | 0.16 | 1.16 |
| 12 months | 0.22 | 1.22 |
| 24 months | 0.40 | 1.40 |

```
B_lock = 0.40 × ln(1 + lock_months) / ln(25)   // ln(25) ≈ 3.22
```

---

## 6. Archive Council

The Archive Council is the ethical last line of defense for PolkaInk. It replaces both v1's team-appointed committee and v2's OG Gold individual veto (which concentrated too much power in a single person). The council is fully community-elected, collectively empowered, and term-limited.

### 6.1 Core Principles

- **Veto only, no initiation** — Council cannot propose content or block proactively; it can only veto proposals that have already passed community vote
- **Collective threshold** — 4 of 7 members must vote NO to trigger a veto; no single-member veto power exists
- **All records on-chain** — every veto is permanently recorded with mandatory written reasons (≥ 50 bytes)
- **No fixed salary** — Guardian NFT provides reputation incentive only; eliminates financial corruption motive
- **Community removable** — DAO 75% supermajority vote can remove any member at any time
- **6-month term rotation** — prevents power entrenchment; fresh elections every term

### 6.2 Member Requirements (Candidate Eligibility)

| Requirement | Value | Purpose |
|-------------|-------|---------|
| Polkadot account age | ≥ 12 months | Prevent fresh Sybil accounts |
| DOT holdings | ≥ 100 DOT | Skin-in-the-game |
| On-chain violations | None active | Clean record required |
| Public contact | Discord or Element | Community accountability |
| Nomination | Self-nominate during 7-day window | Open, permissionless process |

### 6.3 Election Process

```
14 days before term end
  → Any member can initiate election

7-day nomination period
  → Eligible candidates self-nominate on-chain

7-day voting period
  → Voting weight = DOT balance + Historian NFT boost

Results
  → Top 7 by vote count elected
  → If < 7 qualified candidates, council size reduces
  → Old Guardian NFTs deactivated → New ones minted
```

### 6.4 Veto Mechanics

| Aspect | Design |
|--------|--------|
| Window | 48 hours after proposal enters TimelockQueued state |
| Threshold | 4 of 7 council members must vote NO |
| Reason required | ≥ 50 bytes of on-chain text (permanent record) |
| Scope | All proposal types except re-vote (Dispute) proceedings |
| Counter-veto | DAO 80% supermajority can override and restart a vetoed proposal |
| Stake effect | Vetoed proposals: 50% stake slashed → Treasury |
| Legitimate grounds | False historical content, malicious upgrades, legal risk content, discriminatory content |

---

## 7. Dispute & Freeze Mechanism

Any active member can report an approved document. v3 improves on v2's hard cap of 2 reports by allowing a third challenge after a cooldown period, preventing permanent entrenchment of contested content.

### 7.1 Report Trigger

```
reports ≥ max(3, floor(original_NO_voters × 1.5))
```

This formula ensures proportionality: widely-contested proposals require more reporters to trigger a freeze, while unanimously passed content still has a minimum threshold of 3 reports.

### 7.2 Process Flow

| Stage | Duration | Rules | Outcome |
|-------|----------|-------|---------|
| Freeze | 72 hours | Document frozen, no edits | Auto-proceed to re-vote |
| Re-vote | 72 hours | 1 member = 1 vote (no boost, no Council veto); quorum ≥ 5 voters | YES > NO → Maintained; else Revoked |
| Post-revoke cooldown | 30 days | Same content cannot be re-submitted | Re-submission allowed after cooldown |

### 7.3 Report Limits (Improved vs v2)

| | v2 | v3 |
|--|----|----|
| Max reports per doc | 2 (hard cap) | 2 within any 180-day window; +1 after 180-day cooldown |
| After max reports | Permanently unchallengeable | Third report allowed after 180 days if new evidence arises |
| Rationale | Prevents harassment | Prevents harassment while allowing correction of newly-discovered issues |

---

## 8. Proposal Lifecycle

All proposals follow the same lifecycle with the same security gates. Different proposal types carry different minimum stake requirements.

### 8.1 Proposal Types & Minimum Stakes

| Type | Min Stake | Purpose |
|------|-----------|---------|
| VersionUpdate | 5 DOT | Propose or update a historical document version |
| ParameterChange | 20 DOT | Modify governance parameters |
| CouncilElection | 10 DOT | Initiate Archive Council election |
| TreasurySpend | 10 DOT | Request Treasury disbursement |
| UpgradeContract | 50 DOT | Propose smart contract upgrade (audit link required) |
| DisputeProposal | 5 DOT | Challenge an approved document |

### 8.2 Lifecycle Stages

```
Submitted
  → Active (7-day voting period)
    → Passed / Rejected

Passed
  → TimelockQueued (48h Archive Council review window)
    → Executed  (no veto triggered)
    → Vetoed    (4/7 council voted NO)
```

### 8.3 Stake Outcomes

| Outcome | Stake fate |
|---------|------------|
| Proposal passes | 100% returned + proportional Treasury reward |
| Proposal rejected by vote | 30% slashed → Treasury; 70% returned |
| Council veto triggered | 50% slashed → Treasury; 50% returned |
| Proposer cancels (Pending state) | 100% returned (encourage discussion before submitting) |

---

## 9. Treasury & Economics

### 9.1 Inflows

| Source | Amount | Phase |
|--------|--------|-------|
| 88 DOT member stakes (held, not consumed) | Variable | All phases |
| Early unlock penalties (10%) | Variable | All phases |
| Stake slashes (30–50%) | Variable | All phases |
| Polkadot Treasury Grant | 50,000–100,000 DOT | Phase 0–1 |
| API access fees (enterprise) | Per-call pricing | Phase 3+ |
| DeFi yield on treasury (≤20% deployed) | Est. 5–8% APR | Phase 3+ |
| Community donations | Uncapped | All phases |

### 9.2 Reward Distribution (Per Merged Proposal)

```
Total reward pool (periodically allocated from Treasury by DAO vote)
  │
  ├── 70% → Author (proposal submitter)
  │          Direct transfer on merge + Historian NFT minted
  │
  └── 30% → DAO Treasury
             ├── 50% → Future reward pool replenishment
             ├── 30% → Protocol operations (frontend, indexing nodes)
             └── 20% → Archive Council operations fund
```

### 9.3 Treasury Governance

- All treasury spending requires a `TreasurySpend` proposal to pass standard voting
- DeFi liquidity deployment requires additional DAO authorization; capped at ≤20% of total treasury
- Each individual deployment capped at ≤10% of total treasury in a single proposal
- TimelockController controls all treasury outflows — no direct team access at any time

### 9.4 Cold-Start Strategy

| Measure | Detail |
|---------|--------|
| Genesis Historian NFT airdrop | 100 NFTs to recognized Polkadot ecosystem contributors — honorary only, zero vote privilege |
| Phase 1 reduced stake | Min stake temporarily 1 DOT; quorum 3%; raised to standard at Phase 2 |
| Gas subsidy | First 50 successful proposals: Treasury refunds 50% of gas fees |
| Partner integrations | Polkassembly, Subscan, SubSquid data cross-referencing from day 1 |
| Grant anchoring | Polkadot Treasury Grant as base funding, reducing early dependence on fee income |

---

## 10. Contract Security

### 10.1 Upgrade Security (Inherited from v1)

The `TimelockController` is immutable (non-upgradeable) and serves as the system's trust anchor. No contract upgrade, treasury spend, or parameter change can bypass it.

```
Step 1  Developer submits UpgradeContract proposal
        → Min 50 DOT stake + audit report link mandatory in description

Step 2  Community vote: 7 days
        → Requires 60% YES + 5% quorum

Step 3  Archive Council review: 48h Timelock window
        → Can veto malicious upgrades (e.g. hidden admin backdoors)

Step 4  Anyone executes after Timelock expiry
        → TimelockController.execute()
        → ProxyAdmin.upgradeAndCall(proxyAddr, newImpl, initData)

Step 5  New implementation live
        → Upgraded(newImplementation) event emitted
        → Frontend detects new ABI automatically
```

> ⚠️ **Emergency rollback** requires a new `UpgradeContract` proposal following the same full process. There is no fast-path.

### 10.2 Role Permissions

| Role | Holder | Capabilities |
|------|--------|--------------|
| GOVERNANCE_ROLE | GovernanceCore | Merge proposals, mint Historian NFTs |
| COUNCIL_ROLE | ArchiveCouncil | Trigger veto in GovernanceCore |
| WRITER_ROLE | PolkaInkRegistry | Write to VersionStore |
| AUTHOR_MINTER_ROLE | PolkaInkRegistry | Mint Historian NFTs |
| GUARDIAN_MINTER_ROLE | ArchiveCouncil | Mint / deactivate Guardian NFTs |
| SPEND_ROLE | **TimelockController only** | Execute Treasury disbursements |
| UPGRADE_ROLE | **TimelockController only** | Execute contract upgrades via ProxyAdmin |

> **Critical: No admin override.** Unlike v2 (where admin could directly revoke OG Gold NFTs), v3 has no admin override path. Guardian NFT deactivation requires a DAO 75% supermajority vote executed via TimelockController. The team has no special keys, no backdoors, and no privileged addresses post-deployment.

---

## 11. Anti-Sybil Considerations

Multi-address behavior is explicitly allowed (as in v2) but mitigated structurally rather than prohibited, since on-chain prohibition is unenforceable.

| Attack vector | Mitigation in v3 |
|---------------|-----------------|
| Multi-address stake farming | 88 DOT per address — meaningful economic cost per additional address |
| Historian NFT Sybil via multi-address proposals | Each proposal requires 5 DOT stake + community quorum; flooding costs scale linearly |
| Quorum manipulation | 5% quorum based on total weight snapshot prevents minority capture |
| Council seat capture | Requires 100 DOT holding + 12-month account age; 7 seats require significant coordinated cost |
| Treasury drain | All flows through TimelockController; each disbursement requires a full DAO vote |

---

## 12. Parameters Reference

| Parameter | Value | Adjustable via |
|-----------|-------|----------------|
| Stake amount | 88 DOT | ParameterChange proposal |
| Lock options | 3 / 6 / 12 / 24 months | ParameterChange proposal |
| Early unlock penalty | 10% | ParameterChange proposal |
| Voting period | 7 days | ParameterChange proposal |
| Passing threshold (T) | 2.0 | ParameterChange proposal |
| Quorum requirement | 5% (3% in Phase 1) | ParameterChange proposal |
| Timelock delay | **48 hours** | **Immutable** |
| Archive Council size | 7 members | ParameterChange proposal |
| Council veto threshold | 4 of 7 | ParameterChange proposal |
| Council term length | 6 months | ParameterChange proposal |
| Council removal threshold | 75% supermajority | ParameterChange proposal |
| Counter-veto threshold | 80% supermajority | ParameterChange proposal |
| Freeze duration | 72 hours | ParameterChange proposal |
| Re-vote duration | 72 hours | ParameterChange proposal |
| Re-vote quorum | 5 voters minimum | ParameterChange proposal |
| Max reports per doc (180d window) | 2 | ParameterChange proposal |
| Third report cooldown | 180 days | ParameterChange proposal |
| Slash on vote rejection | 30% | ParameterChange proposal |
| Slash on Council veto | 50% | ParameterChange proposal |
| Max Historian boost (B_hist) | **0.40** (at 20 NFTs) | **Immutable** |
| Max Guardian boost (B_guard) | **0.20** | **Immutable** |
| Max lock boost (B_lock) | **0.40** (at 24 months) | **Immutable** |
| **Max total weight** | **2.00** | **Immutable** |

---

## 13. v1 / v2 → v3 Design Decisions

| Issue in prior versions | v3 solution |
|-------------------------|-------------|
| v2: Single OG Gold holder can veto any proposal alone | Replaced by collective council veto (4/7 threshold required) |
| v2: OG Gold airdropped by team — creates a privileged class | All NFTs earned on-chain only; no team-airdropped power NFTs |
| v2: Admin can revoke OG Gold directly | Guardian NFT deactivation requires 75% DAO vote via Timelock |
| v2: No quorum — 2 people can pass any proposal | 5% quorum restored (from v1 design) |
| v2: Max weight 2.35 allows solo proposal passage | Max weight hard-capped at 2.00; T=2.0 requires ≥2 participants |
| v2: No TimelockController for upgrades | TimelockController immutable anchor inherited from v1 |
| v1: Team-appointed initial Council members | Fully community-elected from day 1 via open nomination |
| v1: NFT boost mechanics vague / not quantified | Precise ln() formula with explicit per-component caps |
| Both: 2-report hard cap creates permanently unchallengeable content | Third report allowed after 180-day cooldown window |
| v2: Creator NFT Sybil via multi-address proposals | Historian boost ln-capped; 88 DOT economic cost per address is high |

---

*PolkaInk · Write Our History On-Chain · Memory That Cannot Be Erased · ◎*
