# PolkaInk Tokenomics v2

Stake-based governance. No committee — community votes decide what gets archived.

## NFT Types

| NFT | Obtain | Stackable | Expiry |
|-----|--------|-----------|--------|
| **Member** | Stake 88 DOT, choose lock (3/6/12/24 mo) | 1 per address (multi-address OK) | Lock expiry → commemorative only |
| **Creator** | Auto-mint on proposal pass | Yes | Permanent |
| **Author** | Auto-mint on doc creation | 1 per doc | Permanent (boost only for that doc) |
| **OG** | Team airdrop | Yes | Permanent |

**Member lifecycle**: Stake 88 DOT → active during lock → auto-return on expiry (or early unlock with 10% penalty).

## Voting Power

```
weight = has_active_member × (1 + boost)

boost = 0.30 × ln(1 + creator_count) / ln(11)   // Creator contribution
      + 0.15 × is_author                          // Author of current doc
      + 0.20 × ln(1 + og_count) / ln(6)          // OG contribution
      + 0.30 × ln(1 + lock_months) / ln(25)      // Lock duration

vote_i = choice_i × weight_i     // choice ∈ {+1, -1, 0}
```

Logarithmic: starts at 0, diminishing returns, max boost ≈ 1.0 → max weight ≈ 2.0×.

| Profile | Boost | Weight |
|---------|-------|--------|
| New member, 3mo lock | 0.13 | 1.13 |
| 5 creator, author, 6mo lock | 0.52 | 1.52 |
| 10 creator, 1 OG, 24mo lock | 0.71 | 1.71 |
| 50 creator, 3 OG, author, 24mo | 1.12 | 2.12 |

**Solidity note**: `ln()` implemented via lookup table (inputs are discrete integers). Gas-efficient.

## Passing Criteria

```
Σ(vote_i × weight_i) > 2.0
```

- YES = +weight, NO = −weight, ABSTAIN = 0
- Authors can vote on own proposals
- T=2.0 means ≥ 2 supporters needed (typical member w≈1.13, can't self-pass)
- Extreme veterans (w≈2.12, 50+ creator NFTs) can self-pass — earned trust

| Scenario | Score | Pass? |
|----------|-------|-------|
| Author alone (w=1.52) | +1.52 | ❌ |
| Author + 1 member YES | +2.52 | ✅ |
| 3 YES + 2 NO (all plain) | +1.0 | ❌ |
| 5 YES + 2 NO | +3.0 | ✅ |

## Freeze & Report

Replaces Archive Council. Any active member can report an approved doc.

**Trigger**: `reports ≥ max(3, floor(original_NO_voters × 1.5))`

**Process**: Freeze 72h → Re-vote 72h (no boost, 1 member = 1 vote, quorum ≥ 5) → YES > NO to maintain, else revoked. Max 2 reports per doc.

## Document Lifecycle

```
Created → Vote → Approved (permanent) / Rejected (hidden)
Approved → Reported → Frozen 72h → Re-vote → Maintained / Revoked
```

## Treasury

**In**: 88 DOT stakes, early-unlock penalties (10%), slashed stakes.
**Out**: Auto-return 88 DOT on lock expiry (user calls `claim()`), community rewards.
**Phase 2**: Deploy idle funds to DeFi (Hydration, Bifrost). Yield split: 50% creator rewards, 30% reserve, 20% voter rewards.

## Contract Changes (UUPS Upgrade)

1. **GovernanceCore**: New `_computeVotingPower` with log-boost + threshold=2.0 check
2. **NFTReward**: Add Member/OG NFT types, `lockEnd` expiry field
3. **New StakingManager**: 88 DOT lock/unlock, Member NFT mint/burn, `claim()`
4. **New ReportManager**: Report/freeze/re-vote logic
5. **VotingMath**: Replace with lookup-table boost + `yesSum - noSum > T`

## Constants

| Param | Value |
|-------|-------|
| Stake | 88 DOT |
| Lock options | 3 / 6 / 12 / 24 months |
| Early unlock penalty | 10% |
| Voting period | 7 days |
| Threshold (T) | 2.0 |
| Freeze | 72h + 72h re-vote |
| Re-vote quorum | 5 voters |
| Report trigger | max(3, 1.5× NO voters) |
| Max reports/doc | 2 |
| Max boost | ≈ 1.0 (weight ≈ 2.0×) |
