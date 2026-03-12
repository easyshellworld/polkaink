---
title: PolkaInk Agent Skill
description: Interact with PolkaInk — a decentralized on-chain archive protocol on Polkadot. Create documents, propose versions, vote on governance, stake for membership, and more.
metadata:
  version: 3.4.0
  author: PolkaClaw
license: MIT
---

# PolkaInk Agent Skill

PolkaInk is a decentralized archive protocol on Polkadot. Documents are written on-chain as calldata, governed by DAO voting, and protected by a 7-member Archive Council with veto power.

## Network

| Field | Value |
|-------|-------|
| Chain | Polkadot Hub TestNet (PAS) |
| Chain ID | `420420417` (`0x190f1b41`) |
| RPC | `https://services.polkadothub-rpc.com/testnet` |
| Explorer | `https://polkadot.testnet.routescan.io` |
| Token | PAS (18 decimals) |
| Faucet | `https://faucet.polkadot.io/` |

## Contract Addresses

| Contract | Address |
|----------|---------|
| PolkaInkRegistry | `0xc3C208E3Eba8dC828e3426102AD678D0bFE15eFe` |
| VersionStore | `0xb77Eb7703537f8f119C6a9F58Fe2D33BfA383dCd` |
| GovernanceCore | `0x87Cb963B9A2e35DA5D8342Afa1Cd0D51b1F559aB` |
| StakingManager | `0x286301d1585B40c5B88Ff0fbD86E7A70cE8a2443` |
| ArchiveCouncil | `0xFC107cf84250C022eF13c6F8751AC5321bECD0fc` |
| NFTReward | `0x145EA0d74D31dDFC7ce1F95903d8eb9B0d8D72B3` |
| Treasury | `0x4c0CdB7a94cD0aF91460186F72F86297a3Ac7285` |
| TimelockController | `0x33CC1AF7c7E88704c83bdED1270aa892813Fec61` |
| ProxyAdmin | `0x4EBb5472bd5fFC619cA880447920584977E5fD68` |

## Architecture

| Contract | Role |
|----------|------|
| PolkaInkRegistry | Document lifecycle — create, propose versions, merge |
| VersionStore | Immutable version storage, DAG tracking |
| GovernanceCore | Proposal lifecycle, weighted voting, council veto integration |
| StakingManager | 88 PAS stake/unstake, Member NFT mint/burn |
| ArchiveCouncil | 7-member ethics council with veto and emergency freeze |
| NFTReward | 3-type NFT system (Member, Creator, Guardian) |
| Treasury | DAO treasury — reward pool, epoch rewards, council allowance |
| TimelockController | Delay for contract upgrades |
| ProxyAdmin | UUPS proxy management |

## Connect (viem)

```typescript
import { createPublicClient, createWalletClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const pasChain = defineChain({
  id: 420420417,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: { name: 'PAS', symbol: 'PAS', decimals: 18 },
  rpcUrls: { default: { http: ['https://services.polkadothub-rpc.com/testnet'] } },
  blockExplorers: { default: { name: 'Routescan', url: 'https://polkadot.testnet.routescan.io' } },
});

const publicClient = createPublicClient({ chain: pasChain, transport: http() });

const account = privateKeyToAccount('0xYOUR_PRIVATE_KEY');
const walletClient = createWalletClient({ account, chain: pasChain, transport: http() });
```

## Contract Interfaces

### StakingManager — Membership

```
stake(uint8 lockMonths) payable
  Send exactly 88 PAS. lockMonths: 3, 6, 12, or 24.
  Mints a Member NFT. One stake per address.

unstake()
  After lock expiry. Returns full 88 PAS, burns Member NFT.

earlyUnstake()
  Before lock expiry. 10% penalty (8.8 PAS) sent to Treasury.

getStake(address) → { amount, lockStart, lockEnd, lockMonths, active, memberNFTId }
isActiveMember(address) → bool
totalActiveMembers() → uint256
```

### PolkaInkRegistry — Documents

```
createDocument(string title, string[] tags, string description) → emits DocumentCreated(docId)
  Requires active membership. Mints Author NFT.

proposeVersion(uint256 docId, uint256 parentVersionId, bytes32 contentHash, string description) → emits VersionProposed
  Content is stored as calldata in the transaction.
  Automatically creates a governance proposal.

getDocument(uint256 docId) → Document { docId, title, tags, author, createdAt, status, isSeed, currentVersionId, latestProposalId }
totalDocuments() → uint256
listDocuments(uint256 offset, uint256 limit) → (Document[], total)
```

### GovernanceCore — Voting

```
Enums:
  ProposalType: VersionUpdate(0), UpgradeContract(1), ParameterChange(2), EmergencyConfirm(3)
  ProposalStatus: Active(0), Approved(1), CouncilVetoed(2), Rejected(3), Executed(4), Cancelled(5)
  VoteChoice: Yes(0), No(1), Abstain(2)

vote(uint256 proposalId, VoteChoice choice)
  Requires active membership. Weight based on NFTs and lock period.

finalizeProposal(uint256 proposalId)
  Call after voting period ends. Sets status to Approved or Rejected.

executeProposal(uint256 proposalId)
  Call after council window. Merges version, mints Creator NFT, distributes rewards.

cancelProposal(uint256 proposalId)
  Proposer only, while Active.

getProposal(uint256 id) → Proposal { id, proposalType, proposer, docId, targetVersionId, parentVersionId, score, totalVoteWeight, voterCount, snapshotTotalWeight, startTime, endTime, councilWindowEnd, status, callData, description, proposalStake, timelockTarget }
getVoteRecord(uint256 proposalId, address voter) → { hasVoted, choice, weight, timestamp }
getVotingWeight(address voter) → uint256
totalProposals() → uint256
```

### ArchiveCouncil — Ethics Guardian

```
castVeto(uint256 proposalId, VetoReason reason, string description)
  Council member only. description must be ≥ 50 bytes.
  VetoReason: FalseHistory(0), MaliciousUpgrade(1), LegalRisk(2), HateSpeech(3)

castEmergencyFreeze(uint256 docId, VetoReason reason, string description)
  Council member only. Freezes a document.

claimCouncilAllowance(uint256 epochId)
  Council member claims 5 PAS per epoch.

getMembers() → address[]
isMember(address) → bool
vetoThreshold() → uint256 (currently 5 of 7)
```

### NFTReward — 3-Type NFTs

```
NFTType: Member(0), Creator(1), Guardian(2)

getNFTMetadata(uint256 tokenId) → { tokenId, nftType, holder, mintedAt, lockEnd, linkedDocId, linkedProposalId, active }
getNFTsByHolder(address) → uint256[]
getNFTsByType(address holder, NFTType nftType) → uint256[]
activeCreatorCount(address) → uint256
hasActiveMember(address) → bool
hasActiveGuardian(address) → bool
```

### Treasury — DAO Funds

```
depositRewardPool() payable
  Anyone can donate to the reward pool.

rewardPoolBalance() → uint256
availableRewardPool() → uint256
getEpochRecord(uint256 epochId) → EpochRecord
pendingReward(address voter, uint256 epochId) → uint256
finalizeEpoch(uint256 epochId)
claimEpochReward(uint256 epochId)
epochStartTime() → uint256
EPOCH_DURATION() → uint256
```

### VersionStore — Immutable Versions

```
getVersion(uint256 versionId) → { versionId, docId, parentVersionId, author, proposalId, contentHash, txBlock, txIndex, timestamp }
getVersionsByDoc(uint256 docId) → uint256[]
totalVersions() → uint256
```

## Voting Weight

```
weight = 1 + B_creator + B_author + B_lock

B_creator = 0.30 × ln(1 + activeCreatorCount) / ln(11)
B_author  = 0.15 × isAuthorOfDoc
B_lock    = 0.30 × ln(1 + lockMonths) / ln(25)
```

Passing: `score > 2.0` where `score = Σ(vote_i × weight_i)` (Yes = +weight, No = −weight, Abstain = 0).

## Governance Constants

| Parameter | Value |
|-----------|-------|
| Stake amount | 88 PAS |
| Lock options | 3 / 6 / 12 / 24 months |
| Early unstake penalty | 10% (8.8 PAS) |
| Passing threshold | score > 2.0 |
| Council veto threshold | 5 / 7 members |
| Council allowance | 5 PAS per epoch |

## User Flows

### 1. Become a Member

```typescript
import { parseEther } from 'viem';

const hash = await walletClient.writeContract({
  address: '0x286301d1585B40c5B88Ff0fbD86E7A70cE8a2443',
  abi: StakingManagerABI,
  functionName: 'stake',
  args: [12], // 12 months lock
  value: parseEther('88'),
});
```

### 2. Create a Document

```typescript
const hash = await walletClient.writeContract({
  address: '0xc3C208E3Eba8dC828e3426102AD678D0bFE15eFe',
  abi: PolkaInkRegistryABI,
  functionName: 'createDocument',
  args: ['Polkadot Governance History', ['governance', 'history'], ''],
});
```

### 3. Propose a Version

```typescript
import { keccak256, toHex } from 'viem';

const markdown = '# Polkadot Governance\n\nContent here...';
const contentBytes = new TextEncoder().encode(markdown);
const contentHash = keccak256(toHex(contentBytes));

const hash = await walletClient.writeContract({
  address: '0xc3C208E3Eba8dC828e3426102AD678D0bFE15eFe',
  abi: PolkaInkRegistryABI,
  functionName: 'proposeVersion',
  args: [1n, 0n, contentHash, 'Initial version'],
});
```

### 4. Vote on a Proposal

```typescript
const hash = await walletClient.writeContract({
  address: '0x87Cb963B9A2e35DA5D8342Afa1Cd0D51b1F559aB',
  abi: GovernanceCoreABI,
  functionName: 'vote',
  args: [1n, 0], // proposalId, VoteChoice.Yes
});
```

### 5. Finalize & Execute

```typescript
// After voting period ends
await walletClient.writeContract({
  address: '0x87Cb963B9A2e35DA5D8342Afa1Cd0D51b1F559aB',
  abi: GovernanceCoreABI,
  functionName: 'finalizeProposal',
  args: [1n],
});

// After council window
await walletClient.writeContract({
  address: '0x87Cb963B9A2e35DA5D8342Afa1Cd0D51b1F559aB',
  abi: GovernanceCoreABI,
  functionName: 'executeProposal',
  args: [1n],
});
```

### 6. Donate to Treasury

```typescript
const hash = await walletClient.writeContract({
  address: '0x4c0CdB7a94cD0aF91460186F72F86297a3Ac7285',
  abi: TreasuryABI,
  functionName: 'depositRewardPool',
  args: [],
  value: parseEther('10'),
});
```

## ABI Files

Located at `frontend/src/lib/contracts/abis/`:
- `PolkaInkRegistry.json`
- `VersionStore.json`
- `GovernanceCore.json`
- `StakingManager.json`
- `ArchiveCouncil.json`
- `NFTReward.json`
- `Treasury.json`

## Frontend

React SPA at [polkaink.netlify.app](https://polkaink.netlify.app).

| Route | Page |
|-------|------|
| `/` | Home |
| `/library` | Document library (executed versions only) |
| `/document/:id` | Document detail |
| `/create` | Create document |
| `/propose/:docId` | Propose version |
| `/governance` | Governance hall |
| `/governance/:id` | Proposal detail + vote |
| `/council` | Archive Council |
| `/treasury` | DAO Treasury |
| `/staking` | Stake 88 PAS |
| `/profile/:address` | User profile + NFTs |
| `/polkaclaw` | Team page |

## Error Handling

| Error | Meaning |
|-------|---------|
| `Staking__WrongAmount` | Must send exactly 88 PAS |
| `Staking__AlreadyStaked` | Address already staked |
| `Gov__NotActiveMember` | Need active membership to vote or propose |
| `Gov__AlreadyVoted` | Already voted on this proposal |
| `Gov__ProposalNotActive` | Proposal is not in Active status |
| `Registry__DocumentNotFound` | Invalid document ID |
| `Council__NotMember` | Not a council member |
| `Council__DescriptionTooShort` | Veto description must be ≥ 50 bytes |
