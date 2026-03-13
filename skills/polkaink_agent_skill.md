# PolkaInk Agent Skill

## Overview

PolkaInk is an on-chain Polkadot history preservation protocol. Stake-based governance — no committee, community votes decide what gets archived. Deployed on PAS (Polkadot Hub TestNet, Chain ID 420420417).

**Tokenomics v2 key changes:**
- Archive Council (7-person committee) removed → OG Gold veto replaces it
- 88 DOT stake → Member NFT → voting power
- 6 NFT types: Member, Creator, Author, OG Bronze/Silver/Gold
- Boost-based voting weight: `weight = has_active_member × (1 + boost)`
- Passing criteria: `Σ(vote × weight) > 2.0`, OG Gold NO = instant veto
- Freeze & Report mechanism for approved docs

## Network Configuration

- **Chain**: Polkadot Hub TestNet (PAS)
- **Chain ID**: 420420417 (hex: 0x190f1b41)
- **RPC URL**: `https://services.polkadothub-rpc.com/testnet`
- **Explorer**: `https://polkadot.testnet.routescan.io`
- **Native Token**: PAS (18 decimals)
- **Faucet**: `https://faucet.polkadot.io/`

## Contract Architecture (v2)

| Contract | Description |
|----------|-------------|
| PolkaInkRegistry | Document lifecycle: create, propose versions, merge |
| VersionStore | Version data storage, DAG tracking |
| GovernanceCore | Proposal lifecycle, boost-weighted voting, OG Gold veto |
| **StakingManager** | 88 DOT stake/unstake, Member NFT mint/burn (NEW) |
| **ReportManager** | Report/freeze/re-vote for approved docs (NEW) |
| NFTReward | 6-type NFT system (Member/Creator/Author/OG Bronze/Silver/Gold) |
| Treasury | DAO treasury: stakes, penalties, rewards |
| VotingMath | Voting weight calculation library (lookup table for ln()) |
| TimelockController | Delay for contract upgrades only |
| ProxyAdmin | UUPS proxy management |

**Removed:** ~~ArchiveCouncil~~ (replaced by OG Gold veto in GovernanceCore)

## Contract Addresses (PAS TestNet)

Addresses below are from the v1 deployment. After v2 upgrade, StakingManager and ReportManager will have new addresses.

| Contract | Address |
|----------|---------|
| PolkaInkRegistry | `0x959b25F190189e588DaC814a95fe13a97d5198A1` |
| VersionStore | `0xBB4cccdDb9e3ba74Ae28A412d34801353D1e0Ad6` |
| GovernanceCore | `0xae456115ce2897338FE22Cd342312D92D47821Fb` |
| NFTReward | `0x58DC769015e5a6bAdC5C56519B5f74F851575bAe` |
| Treasury | `0x10F968271C18FF349a3a67FEE9141F7F4f42AD14` |
| TimelockController | `0x684018c8709105437c277Eec60953cF335EaB5D9` |
| ProxyAdmin | `0x646664752E351ecb1f4c3B627Ba7cd76F7fF294c` |
| StakingManager | TBD (new contract) |
| ReportManager | TBD (new contract) |

## How to Connect (viem)

```typescript
import { createPublicClient, http, defineChain } from 'viem';

const pasChain = defineChain({
  id: 420420417,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: { name: 'PAS', symbol: 'PAS', decimals: 18 },
  rpcUrls: { default: { http: ['https://services.polkadothub-rpc.com/testnet'] } },
  blockExplorers: { default: { name: 'Routescan', url: 'https://polkadot.testnet.routescan.io' } },
});

const client = createPublicClient({ chain: pasChain, transport: http() });
```

## Contract Interfaces (v2)

### 1. StakingManager — Membership Staking (NEW)

```
stake(uint8 lockMonths) payable
  Stake 88 DOT, choose lock period: 3/6/12/24 months.
  Mints Member NFT. 1 per address.

unstake()
  After lock expiry, returns full 88 DOT.

earlyUnstake()
  Before expiry, returns 90% (10% penalty to Treasury).

getStake(address) → StakeInfo { amount, lockStart, lockEnd, lockMonths, active, memberNFTId }
isActiveMember(address) → bool
totalActiveMembers() → uint256
```

### 2. GovernanceCore — Voting & Proposals (v2)

```
ProposalType: VersionUpdate | UpgradeContract | ParameterChange
ProposalStatus: Active | Approved | Rejected | Vetoed | Executed | Cancelled
VoteChoice: Yes | No | Abstain

createProposal(type, docId, targetVersionId, callData, description) → proposalId
  Requires active Member NFT. No stake needed (membership stake suffices).

vote(proposalId, VoteChoice)
  YES = +weight, NO = -weight, ABSTAIN = 0
  OG Gold voting NO → instant veto

finalizeProposal(proposalId)
  After voting period. Checks: score > 2.0 && !goldVetoed

executeProposal(proposalId)
  Merges version, mints Creator NFT, distributes rewards.

getProposal(id) → Proposal
getVoteRecord(proposalId, voter) → VoteRecord
getVotingWeight(voter, docId) → uint256 weight
totalProposals() → uint256
listProposals(statusFilter, offset, limit) → (Proposal[], total)
```

### 3. ReportManager — Freeze & Report (NEW)

```
report(docId)
  Any active member. Trigger threshold: max(3, floor(NO_voters × 1.5))

revote(docId, support)
  During re-vote period (72h after freeze). No boost, no veto, 1 member = 1 vote.

finalize(docId)
  After re-vote period. YES > NO → maintained, else revoked. Quorum ≥ 5.

getReportStatus(docId) → ReportStatus
```

### 4. NFTReward — 6-Type NFT System (v2)

```
NFTType: Member | Creator | Author | OGBronze | OGSilver | OGGold

mintMemberNFT(to, lockEnd) → tokenId       [StakingManager only]
mintCreatorNFT(to, docId, proposalId)       [GovernanceCore only]
mintAuthorNFT(to, docId)                    [Registry only]
mintOGNFT(to, ogType)                       [Admin only]
deactivate(tokenId)
revokeOGGold(tokenId)                       [Admin only]

getNFTMetadata(tokenId) → NFTMetadata
getNFTsByHolder(holder) → uint256[]
activeCreatorCount(holder) → uint256
isAuthorOf(holder, docId) → bool
ogCount(holder, ogType) → uint256
hasActiveOGGold(holder) → bool
hasActiveMember(holder) → bool
```

### 5. PolkaInkRegistry — Document Lifecycle

```
createDocument(title, tags) → docId
  Requires active Member NFT. Auto-mints Author NFT.

proposeVersion(docId, parentVersionId, contentHash, markdownCalldata) → proposalId
  Creates governance proposal automatically.

mergeProposal(proposalId)                   [GovernanceCore only]
getDocument(docId) → Document
totalDocuments() → uint256
listDocuments(offset, limit) → (Document[], total)
getVersionHistory(docId) → uint256[]
```

### 6. VersionStore — Version Data (unchanged)

```
getVersion(versionId) → Version
getVersionDAG(docId) → (versionIds[], parentIds[])
totalVersions() → uint256
```

### 7. Treasury — DAO Funds

```
balance() → uint256
getTotals() → (totalIncome, totalSpent)
listSpendRecords(offset, limit) → (SpendRecord[], total)
```

## Voting Weight Formula

```
weight = has_active_member × (1 + boost)

boost = B_creator + B_author + B_og + B_lock

B_creator = 0.30 × ln(1 + creator_count) / ln(11)
B_author  = 0.15 × is_author_of_current_doc
B_og      = 0.05 × min(bronze, 3) + 0.10 × min(silver, 2) + 0.10 × has_gold
B_lock    = 0.30 × ln(1 + lock_months) / ln(25)
```

| Profile | Boost | Weight |
|---------|-------|--------|
| New member, 3mo lock | 0.13 | 1.13 |
| 5 creator, author, 6mo | 0.52 | 1.52 |
| 10 creator, gold, 24mo | 0.70 | 1.70 |
| Max theoretical | 1.35 | 2.35 |

## Passing Criteria

```
1. If any OG Gold holder voted NO → VETOED (instant reject)
2. Otherwise: Σ(vote_i × weight_i) > 2.0
```

## User Flows (viem)

### Flow 1: Become a Member

```typescript
const tx = await walletClient.writeContract({
  address: STAKING_MANAGER,
  abi: StakingManagerABI,
  functionName: 'stake',
  args: [12], // 12 months lock
  value: parseEther('88'),
});
```

### Flow 2: Create a Document

```typescript
const tx = await walletClient.writeContract({
  address: REGISTRY,
  abi: RegistryABI,
  functionName: 'createDocument',
  args: ['Polkadot Governance History', ['governance', 'history']],
});
```

### Flow 3: Propose a Version

```typescript
const content = '# Title\n\nMarkdown content...';
const contentBytes = new TextEncoder().encode(content);
const contentHash = keccak256(contentBytes);

const tx = await walletClient.writeContract({
  address: REGISTRY,
  abi: RegistryABI,
  functionName: 'proposeVersion',
  args: [docId, 0n, contentHash, toHex(contentBytes)],
});
```

### Flow 4: Vote on a Proposal

```typescript
// VoteChoice: 0=Yes, 1=No, 2=Abstain
const tx = await walletClient.writeContract({
  address: GOVERNANCE,
  abi: GovernanceABI,
  functionName: 'vote',
  args: [proposalId, 0], // Yes
});
```

### Flow 5: Report an Approved Document

```typescript
const tx = await walletClient.writeContract({
  address: REPORT_MANAGER,
  abi: ReportManagerABI,
  functionName: 'report',
  args: [docId],
});
```

## Frontend

React SPA with Hash Router. Existing pages largely preserved — see `docs/dev_doc.md` §7 for detailed change list.

Key routes:
- `/#/` — Home
- `/#/library` — Document list
- `/#/document/:id` — Document detail (+ report button)
- `/#/create` — New document
- `/#/propose/:docId` — Propose version
- `/#/governance` — Voting hall
- `/#/governance/:id` — Proposal detail
- `/#/profile/:address` — User profile + NFTs + staking
- `/#/staking` — Stake 88 DOT (NEW)
- `/#/council` → OG Guardians
- `/#/treasury` — Treasury overview
- `/#/polkaclaw` — Team page

## ABI Files

Located at `frontend/src/lib/contracts/abis/`:
- `PolkaInkRegistry.json`, `VersionStore.json`, `GovernanceCore.json`
- `NFTReward.json`, `Treasury.json`
- `StakingManager.json` (new), `ReportManager.json` (new)

## Governance Constants

| Parameter | Value |
|-----------|-------|
| Stake amount | 88 DOT |
| Lock options | 3 / 6 / 12 / 24 months |
| Early unlock penalty | 10% |
| Voting period | 7 days |
| Passing threshold | 2.0 |
| Freeze duration | 72h |
| Re-vote duration | 72h |
| Re-vote quorum | 5 voters |
| Max reports per doc | 2 |

## Error Handling

Common revert reasons:
- `Staking__WrongAmount` — Must send exactly 88 DOT
- `Staking__AlreadyStaked` — Address already has Member NFT
- `Gov__NotActiveMember` — Need active Member NFT to create proposals or vote
- `Gov__AlreadyVoted` — Already voted on this proposal
- `Report__DocNotApproved` — Can only report approved documents
- `Report__MaxReportsReached` — Document already reported twice
- `Registry__DocumentNotFound` — Invalid document ID
