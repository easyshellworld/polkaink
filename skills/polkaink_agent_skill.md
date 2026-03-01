# PolkaInk Agent Skill

## Overview

PolkaInk is an on-chain Polkadot history preservation protocol. It uses a multi-contract architecture deployed on PAS (Polkadot Hub TestNet, Chain ID 420420417).

The protocol allows users to:
- **Create documents** (history records) on-chain
- **Propose version updates** with Markdown content stored as calldata
- **Vote** on proposals with DOT-weighted governance
- **Execute** passed proposals after timelock
- **Manage** an Archive Council for ethical oversight

## Network Configuration

- **Chain**: Polkadot Hub TestNet (PAS)
- **Chain ID**: 420420417 (hex: 0x190f1b41)
- **RPC URL**: `https://services.polkadothub-rpc.com/testnet`
- **Blockchain Explorer**: `https://polkadot.testnet.routescan.io`
- **Native Token**: PAS (18 decimals)
- **Faucet**: `https://faucet.polkadot.io/` (select "Polkadot Hub Testnet")

## Deployed Contract Addresses

All contracts are deployed on PAS TestNet:

| Contract | Address | Description |
|----------|---------|-------------|
| PolkaInkRegistry | `0x959b25F190189e588DaC814a95fe13a97d5198A1` | Document registry, version proposals, merge |
| VersionStore | `0xBB4cccdDb9e3ba74Ae28A412d34801353D1e0Ad6` | Version data storage, DAG tracking |
| GovernanceCore | `0xae456115ce2897338FE22Cd342312D92D47821Fb` | Proposal lifecycle, voting, execution |
| ArchiveCouncil | `0x12771dcae01DEba4757719f7D2bD06D235a9FaD8` | 7-member ethics council, veto power |
| TimelockController | `0x684018c8709105437c277Eec60953cF335EaB5D9` | 48-hour delay for executed proposals |
| NFTReward | `0x58DC769015e5a6bAdC5C56519B5f74F851575bAe` | Author NFTs + Guardian NFTs (ERC-721) |
| Treasury | `0x10F968271C18FF349a3a67FEE9141F7F4f42AD14` | DAO treasury, reward distribution |
| ProxyAdmin | `0x646664752E351ecb1f4c3B627Ba7cd76F7fF294c` | UUPS proxy admin (owned by Timelock) |

## How to Connect

Use ethers.js v6:

```javascript
const { ethers } = require("ethers");
const provider = new ethers.JsonRpcProvider(
  "https://services.polkadothub-rpc.com/testnet",
  { chainId: 420420417, name: "PAS" }
);
// For write operations, create a wallet from private key:
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
```

## Contract Interfaces

### 1. PolkaInkRegistry — Document Lifecycle

**Read Operations:**

```
totalDocuments() → uint256
  Returns the total number of documents.

getDocument(uint256 docId) → (uint256 id, string title, address author, uint256 currentVersionId, uint256 createdAt, uint256 updatedAt, uint8 status, string[] tags)
  Returns full document metadata.
  Status: 0 = Active, 1 = Archived, 2 = Disputed

listDocuments(uint256 offset, uint256 limit) → (Document[] docs, uint256 total)
  Returns paginated documents.

listDocumentsByTag(string tag, uint256 offset, uint256 limit) → (Document[] docs, uint256 total)
  Returns documents filtered by tag.

getVersionHistory(uint256 docId) → uint256[]
  Returns array of version IDs for a document.
```

**Write Operations:**

```
createDocument(string title, string[] tags) → uint256 docId
  Creates a new document. Anyone can call.
  Gas: ~200,000
  Example: createDocument("Polkadot Governance History", ["governance", "history"])

proposeVersion(uint256 docId, uint256 parentVersionId, bytes32 contentHash, bytes markdownCalldata) → uint256 proposalId [payable]
  Proposes a new version for an existing document.
  Requires msg.value >= minStake (5e12 wei = 0.000005 PAS).
  contentHash = keccak256(markdownBytes)
  markdownCalldata = raw UTF-8 bytes of the Markdown content
  Gas: ~500,000 - 1,000,000 (depends on content size)
```

### 2. GovernanceCore — Voting & Proposal Execution

**Read Operations:**

```
totalProposals() → uint256
  Returns the total number of proposals.

getProposal(uint256 proposalId) → (uint256 id, uint8 proposalType, address proposer, uint256 docId, uint256 targetVersionId, uint256 stakeAmount, uint256 yesVotes, uint256 noVotes, uint256 abstainVotes, uint256 totalVotingPower, uint256 snapshotBlock, uint256 startTime, uint256 endTime, uint8 status, bytes callData, string description, bytes32 timelockId)
  ProposalType: 0 = VersionUpdate, 1 = ParameterChange, 2 = ContractUpgrade
  ProposalStatus: 0 = Pending, 1 = Active, 2 = Passed, 3 = Rejected, 4 = Queued, 5 = Executed, 6 = Cancelled, 7 = Vetoed, 8 = Expired

listProposals(uint8 statusFilter, uint256 offset, uint256 limit) → (Proposal[] proposals, uint256 total)
  statusFilter: pass the ProposalStatus enum value to filter. Use 0 for Active.

getVoteRecord(uint256 proposalId, address voter) → (bool hasVoted, bool support, bool abstain, uint256 votingPower, uint256 timestamp)
  Returns the vote record for a specific voter on a specific proposal.

getVotingPower(address voter, uint256 snapshotBlock) → uint256
  Returns the voting power of an address.

checkPassed(uint256 proposalId) → (bool passed, string reason)
  Checks whether a proposal has met passing criteria.

getGovernanceParams() → GovernanceParams
  Returns all governance parameters (minStake, votingPeriod, thresholds, etc.).
```

**Write Operations:**

```
vote(uint256 proposalId, bool support, bool abstain, uint256 lockDays)
  Casts a vote on an active proposal.
  support: true = yes, false = no
  abstain: true = abstain (overrides support)
  lockDays: 0 for no lock, 30/90/180 for bonus multiplier
  Gas: ~150,000

queueProposal(uint256 proposalId)
  Queues a passed proposal into the timelock.
  Can only be called after voting period ends and proposal passed.
  Gas: ~200,000

executeProposal(uint256 proposalId)
  Executes a queued proposal after timelock delay (48 hours).
  Gas: ~300,000 - 500,000
```

### 3. VersionStore — Version Data

**Read Operations:**

```
totalVersions() → uint256
  Returns total number of stored versions.

getVersion(uint256 versionId) → (uint256 id, uint256 docId, uint256 parentVersionId, address author, bytes32 contentHash, uint256 blockNumber, uint256 timestamp, uint8 compression, uint32 contentLength)
  Returns full version metadata.

getVersionDAG(uint256 docId) → (uint256[] versionIds, uint256[] parentIds)
  Returns the version tree (DAG) for a document.

getAncestors(uint256 versionId) → uint256[]
  Returns all ancestor version IDs.

getChildren(uint256 versionId) → uint256[]
  Returns all child version IDs.
```

### 4. ArchiveCouncil — Ethics Oversight

**Read Operations:**

```
getCouncilMembers() → CouncilMember[]
  Returns all 7 council members with their status.

isActiveMember(address addr) → bool
  Checks if an address is an active council member.

getVetoStatus(uint256 proposalId) → (uint256 vetoCount, bool vetoed)
  Returns current veto status for a proposal.

getVetoRecord(uint256 proposalId) → VetoRecord
  Returns detailed veto information.
```

**Write Operations (council members only):**

```
veto(uint256 proposalId, string reason)
  Casts a veto vote. Requires 5/7 council votes to fully veto.

approve(uint256 proposalId)
  Explicitly approves a proposal.
```

### 5. NFTReward — NFT Queries

**Read Operations:**

```
balanceOf(address owner) → uint256
  Returns total NFTs held.

getNFTMetadata(uint256 tokenId) → NFTMetadata
  Returns metadata including nftType, proposalId, docId, versionId, active status.

getAuthorNFTs(address holder) → uint256[]
  Returns all Author NFT token IDs for an address.

getGuardianNFTs(address holder) → uint256[]
  Returns all Guardian NFT token IDs for an address.

hasActiveGuardianNFT(address holder) → bool
  Returns true if holder has an active Guardian NFT.

tokenURI(uint256 tokenId) → string
  Returns on-chain SVG token URI (base64 encoded).
```

### 6. Treasury — DAO Funds

**Read Operations:**

```
balance() → uint256
  Returns current treasury balance in wei.

getTotals() → (uint256 totalIncome, uint256 totalSpent)
  Returns cumulative income and spending.

listSpendRecords(uint256 offset, uint256 limit) → (SpendRecord[] records, uint256 total)
  Returns paginated spend history.
```

## Complete User Flows

### Flow 1: Create a Document

```javascript
const registry = new ethers.Contract(REGISTRY_ADDRESS, RegistryABI, wallet);
const tx = await registry.createDocument("Polkadot JAM Protocol History", ["jam", "polkadot", "protocol"]);
const receipt = await tx.wait();
// Parse DocumentCreated event to get docId
const event = receipt.logs.find(l => l.fragment?.name === "DocumentCreated");
const docId = event.args.docId;
console.log("Created document:", docId.toString());
```

### Flow 2: Propose a Version Update

```javascript
const content = "# JAM Protocol\n\nContent here...";
const contentBytes = new TextEncoder().encode(content);
const contentHash = ethers.keccak256(contentBytes);
const minStake = ethers.parseUnits("5", 12); // 0.000005 PAS

const registry = new ethers.Contract(REGISTRY_ADDRESS, RegistryABI, wallet);
const tx = await registry.proposeVersion(
  docId,           // document ID
  0,               // parentVersionId (0 for first version)
  contentHash,     // keccak256 of content
  contentBytes,    // raw Markdown bytes (stored as calldata)
  { value: minStake, gasLimit: 1_000_000n }
);
const receipt = await tx.wait();
console.log("Proposal created, tx:", receipt.hash);
```

### Flow 3: Vote on a Proposal

```javascript
const gov = new ethers.Contract(GOVERNANCE_ADDRESS, GovernanceABI, wallet);

// Check proposal details
const proposal = await gov.getProposal(proposalId);
console.log("Status:", proposal.status, "Ends:", new Date(Number(proposal.endTime) * 1000));

// Cast YES vote (no abstain, no lock)
const tx = await gov.vote(proposalId, true, false, 0);
await tx.wait();
console.log("Vote cast!");
```

### Flow 4: Execute a Passed Proposal

After voting period ends and proposal passed:

```javascript
const gov = new ethers.Contract(GOVERNANCE_ADDRESS, GovernanceABI, wallet);

// Step 1: Queue into timelock
const queueTx = await gov.queueProposal(proposalId);
await queueTx.wait();
console.log("Queued in timelock");

// Step 2: Wait 48 hours (timelock delay)
// ...

// Step 3: Execute
const execTx = await gov.executeProposal(proposalId);
await execTx.wait();
console.log("Proposal executed! Version merged, Author NFT minted.");
```

### Flow 5: Read Document and Version Data

```javascript
const registry = new ethers.Contract(REGISTRY_ADDRESS, RegistryABI, provider);
const versionStore = new ethers.Contract(VERSION_STORE_ADDRESS, VersionStoreABI, provider);

// Get document
const doc = await registry.getDocument(1);
console.log("Title:", doc.title, "Author:", doc.author, "Tags:", doc.tags);

// Get version history
const versionIds = await registry.getVersionHistory(1);
console.log("Versions:", versionIds.map(v => Number(v)));

// Get specific version
if (versionIds.length > 0) {
  const version = await versionStore.getVersion(versionIds[0]);
  console.log("Version block:", Number(version.blockNumber), "Hash:", version.contentHash);
}
```

### Flow 6: Query Governance Stats

```javascript
const gov = new ethers.Contract(GOVERNANCE_ADDRESS, GovernanceABI, provider);
const registry = new ethers.Contract(REGISTRY_ADDRESS, RegistryABI, provider);
const vs = new ethers.Contract(VERSION_STORE_ADDRESS, VersionStoreABI, provider);

const [totalDocs, totalVersions, totalProposals] = await Promise.all([
  registry.totalDocuments(),
  vs.totalVersions(),
  gov.totalProposals(),
]);

console.log("Documents:", Number(totalDocs));
console.log("Versions:", Number(totalVersions));
console.log("Proposals:", Number(totalProposals));
```

### Flow 7: Check Voting Power and NFTs

```javascript
const gov = new ethers.Contract(GOVERNANCE_ADDRESS, GovernanceABI, provider);
const nft = new ethers.Contract(NFT_ADDRESS, NFTRewardABI, provider);

const address = "0x...";
const power = await gov.getVotingPower(address, 0);
console.log("Voting power:", ethers.formatEther(power), "PAS");

const authorNFTs = await nft.getAuthorNFTs(address);
const guardianNFTs = await nft.getGuardianNFTs(address);
console.log("Author NFTs:", authorNFTs.length, "Guardian NFTs:", guardianNFTs.length);
```

## ABI Files

ABI JSON files are located at:
- `frontend/src/lib/contracts/abis/PolkaInkRegistry.json`
- `frontend/src/lib/contracts/abis/GovernanceCore.json`
- `frontend/src/lib/contracts/abis/ArchiveCouncil.json`
- `frontend/src/lib/contracts/abis/NFTReward.json`
- `frontend/src/lib/contracts/abis/Treasury.json`
- `frontend/src/lib/contracts/abis/VersionStore.json`

## Governance Parameters (defaults)

| Parameter | Value | Description |
|-----------|-------|-------------|
| minStake | 5e12 wei (0.000005 PAS) | Minimum stake to create a proposal |
| votingPeriod | 7 days | Duration of voting window |
| timelockDelay | 48 hours | Delay after queueing before execution |
| quorumNumerator | 5% | Minimum participation required |
| passingThreshold | 60% | YES votes needed to pass |
| superMajority | 80% | Threshold for parameter changes |
| nftVoteMultiplier | 150% | Voting bonus for Author NFT holders |
| guardianVoteMultiplier | 200% | Voting bonus for Guardian NFT holders |

## Error Handling

Common revert reasons:
- `"Registry__DocumentNotFound"` — Invalid document ID
- `"Registry__EmptyTitle"` — Title cannot be empty
- `"Governance__InsufficientStake"` — Need to send at least minStake
- `"Governance__AlreadyVoted"` — Address already voted on this proposal
- `"Governance__NotActive"` — Proposal is not in Active status
- `"Governance__VotingNotEnded"` — Cannot queue/execute during voting
- `"Governance__NotPassed"` — Proposal did not meet passing criteria
- `"Council__NotActiveMember"` — Only active council members can veto

## Frontend

The frontend is a React SPA available at:
- **Local dev**: `http://localhost:5173/` (or 5174 if 5173 is in use)
- **Hash router** paths: `/#/`, `/#/library`, `/#/create`, `/#/document/:id`, `/#/propose/:docId`, `/#/governance`, `/#/governance/:id`, `/#/profile/:address`, `/#/council`, `/#/treasury`

## Testing Checklist for Agent

1. **Read stats**: Call `totalDocuments()`, `totalVersions()`, `totalProposals()` — should return 0 on fresh deployment
2. **Create document**: Call `createDocument("Test Doc", ["test"])` — should return docId = 1
3. **Verify document**: Call `getDocument(1)` — should return title "Test Doc"
4. **Propose version**: Call `proposeVersion(1, 0, contentHash, markdownBytes, {value: 5e12})` — should create proposal
5. **Check proposal**: Call `getProposal(1)` on GovernanceCore — should show Active status
6. **Vote**: Call `vote(1, true, false, 0)` — should succeed
7. **Verify vote**: Call `getVoteRecord(1, voterAddress)` — should show hasVoted = true
8. **List documents**: Call `listDocuments(0, 10)` — should return 1 document
