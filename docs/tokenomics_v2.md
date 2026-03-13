# PolkaInk Tokenomics v2

Stake-based governance. No committee — community votes decide what gets archived.

## NFT Types

| NFT | Obtain | Stackable | Expiry |
|-----|--------|-----------|--------|
| **Member** | Stake 88 DOT, choose lock (3/6/12/24 mo) | 1 per address (multi-address OK) | Lock expiry → commemorative only |
| **Creator** | Auto-mint on proposal pass | Yes | Permanent |
| **Author** | Auto-mint on doc creation | 1 per doc | Permanent (boost only for that doc) |
| **OG Bronze** | Team airdrop | Yes (cap 3) | Permanent |
| **OG Silver** | Team airdrop | Yes (cap 2) | Permanent |
| **OG Gold** | Team airdrop (极少量) | 1 per person | Permanent, **NO vote = veto** |

**Member lifecycle**: Stake 88 DOT → active during lock → auto-return on expiry (or early unlock with 10% penalty).

## Voting Power

```
weight = has_active_member × (1 + boost)

boost = B_creator + B_author + B_og + B_lock

  B_creator = 0.30 × ln(1 + creator_count) / ln(11)
  B_author  = 0.15 × is_author_of_current_doc
  B_og      = 0.05 × min(og_bronze, 3)       // max 0.15
            + 0.10 × min(og_silver, 2)       // max 0.20
            + 0.10 × has_og_gold             // max 0.10
  B_lock    = 0.30 × ln(1 + lock_months) / ln(25)

vote_i = choice_i × weight_i     // choice ∈ {+1, -1, 0}
```

| Profile | B_cr | B_au | B_og | B_lk | Boost | Weight |
|---------|------|------|------|------|-------|--------|
| New member, 3mo | 0 | 0 | 0 | 0.13 | 0.13 | 1.13 |
| 5 creator, author, 6mo | 0.22 | 0.15 | 0 | 0.15 | 0.52 | 1.52 |
| 10 creator, 1 silver, 24mo | 0.30 | 0 | 0.10 | 0.30 | 0.70 | 1.70 |
| 3 creator, 2 bronze, 1 silver, gold, 12mo | 0.18 | 0 | 0.30 | 0.22 | 0.70 | 1.70 |
| Max: 50 cr, author, 3 brz, 2 slv, gold, 24mo | 0.45 | 0.15 | 0.45 | 0.30 | 1.35 | 2.35 |

Max boost ≈ 1.35 → max weight ≈ 2.35. Realistic max (10 cr, gold, 12mo) ≈ 1.62.

**Solidity**: Creator/lock use lookup table for `ln()`. OG uses simple linear with cap.

## Passing Criteria

```
1. If any OG Gold holder voted NO → VETOED (instant reject)
2. Otherwise: Σ(vote_i × weight_i) > 2.0
```

- YES = +weight, NO = −weight, ABSTAIN = 0
- Authors can vote on own proposals
- T=2.0 → typical users need ≥ 2 supporters
- OG Gold veto overrides any score — this is the "nuclear option"

| Scenario | Score | Veto? | Pass? |
|----------|-------|-------|-------|
| Author alone (w=1.52) | +1.52 | — | ❌ |
| Author + 1 member YES | +2.65 | — | ✅ |
| 10 members YES | +11.3 | — | ✅ |
| 10 members YES, 1 Gold NO | +10.0 | **VETO** | ❌ |
| Gold votes YES + author YES | +2.82 | — | ✅ |
| Gold abstains, 3 YES | +3.39 | — | ✅ |
| 5 YES + 2 NO (all plain) | +3.0 | — | ✅ |

## OG Gold Veto — Scope & Safeguards

- **Only in normal voting** — freeze re-votes are pure democracy (1 person = 1 vote, no veto)
- OG Gold is team-airdropped to ≤ 3 trusted individuals
- Admin can revoke OG Gold via contract role if holder acts maliciously
- Veto triggers only on explicit NO vote; abstain/no-vote = no effect

## Freeze & Report

Any active member can report an approved doc.

**Trigger**: `reports ≥ max(3, floor(original_NO_voters × 1.5))`

**Process**: Freeze 72h → Re-vote 72h (**no boost, no veto**, 1 member = 1 vote, quorum ≥ 5) → YES > NO to maintain, else revoked. Max 2 reports per doc.

## Document Lifecycle

```
Created → Vote → Approved / Rejected / Vetoed(by Gold OG)
Approved → Reported → Frozen 72h → Re-vote → Maintained / Revoked
```

## Treasury

**In**: 88 DOT stakes, early-unlock penalties (10%), slashed stakes.
**Out**: Auto-return on lock expiry (user calls `claim()`), community rewards.
**Phase 2**: DeFi yield (Hydration, Bifrost). Split: 50% creator rewards, 30% reserve, 20% voter rewards.

## Contract Changes (UUPS Upgrade)

1. **GovernanceCore**: New boost formula + Gold veto check in `_checkPassed`
2. **NFTReward**: Add Member / OG Bronze / OG Silver / OG Gold types, `lockEnd` field
3. **New StakingManager**: 88 DOT lock/unlock, Member NFT mint/burn
4. **New ReportManager**: Report/freeze/re-vote logic
5. **VotingMath**: Lookup-table boost + `yesSum - noSum > T` + veto flag

## Constants

| Param | Value |
|-------|-------|
| Stake | 88 DOT |
| Lock options | 3 / 6 / 12 / 24 months |
| Early unlock penalty | 10% |
| Voting period | 7 days |
| Threshold (T) | 2.0 |
| OG Bronze boost | 0.05/ea (cap 3) |
| OG Silver boost | 0.10/ea (cap 2) |
| OG Gold boost | 0.10 + **veto on NO** |
| Freeze | 72h + 72h re-vote |
| Re-vote quorum | 5 voters |
| Report trigger | max(3, 1.5× NO voters) |
| Max reports/doc | 2 |
