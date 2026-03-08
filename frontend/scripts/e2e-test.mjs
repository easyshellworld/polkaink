/**
 * PolkaInk E2E Test Script
 * Tests: read chain state, create document, propose version, vote, 
 *        query events/content, check NFTs
 */
import { createPublicClient, createWalletClient, http, defineChain, parseEther, keccak256, toHex, decodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';

const RPC = 'https://services.polkadothub-rpc.com/testnet';
const pasChain = defineChain({
  id: 420420417,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: { name: 'PAS', symbol: 'PAS', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

const ADDRS = {
  PolkaInkRegistry: '0x959b25F190189e588DaC814a95fe13a97d5198A1',
  VersionStore: '0xBB4cccdDb9e3ba74Ae28A412d34801353D1e0Ad6',
  GovernanceCore: '0xae456115ce2897338FE22Cd342312D92D47821Fb',
  ArchiveCouncil: '0x12771dcae01DEba4757719f7D2bD06D235a9FaD8',
  NFTReward: '0x58DC769015e5a6bAdC5C56519B5f74F851575bAe',
  Treasury: '0x10F968271C18FF349a3a67FEE9141F7F4f42AD14',
};

function loadAbi(name) {
  return JSON.parse(readFileSync(`./src/lib/contracts/abis/${name}.json`, 'utf-8'));
}

const ABIS = {
  PolkaInkRegistry: loadAbi('PolkaInkRegistry'),
  GovernanceCore: loadAbi('GovernanceCore'),
  VersionStore: loadAbi('VersionStore'),
  NFTReward: loadAbi('NFTReward'),
  ArchiveCouncil: loadAbi('ArchiveCouncil'),
  Treasury: loadAbi('Treasury'),
};

const pc = createPublicClient({ chain: pasChain, transport: http(RPC) });

const accounts = [
  privateKeyToAccount('0xa6953e8632e0261b59ee98b9e65aa0b229dc97336734d0d9ae95ca2a158896be'),
  privateKeyToAccount('0x6a9ef2e57524421eb3f19c8a1397287712e1d33b0202506b13291678b374524a'),
  privateKeyToAccount('0xada13a1d8ab59fe26f4e74f79fdab0b00a5be301f4a6eaa3aae3dc5abcfdd24a'),
];

function walletFor(account) {
  return createWalletClient({ account, chain: pasChain, transport: http(RPC) });
}

async function read(contract, fn, args = []) {
  return pc.readContract({ address: ADDRS[contract], abi: ABIS[contract], functionName: fn, args });
}

async function write(wallet, contract, fn, args = [], opts = {}) {
  const hash = await wallet.writeContract({
    address: ADDRS[contract], abi: ABIS[contract],
    functionName: fn, args, chain: pasChain, account: wallet.account,
    gas: 1_000_000n, ...opts,
  });
  console.log(`  tx: ${hash}`);
  const receipt = await pc.waitForTransactionReceipt({ hash });
  console.log(`  status: ${receipt.status}, gasUsed: ${receipt.gasUsed}`);
  if (receipt.status !== 'success') throw new Error(`TX reverted: ${hash}`);
  return receipt;
}

function sep(title) { console.log(`\n${'='.repeat(60)}\n${title}\n${'='.repeat(60)}`); }

async function main() {
  // ─── 1. Check Chain State ───
  sep('1. CHAIN STATE');
  const blockNumber = await pc.getBlockNumber();
  console.log(`Block number: ${blockNumber}`);

  for (const [i, acc] of accounts.entries()) {
    const bal = await pc.getBalance({ address: acc.address });
    console.log(`Account #${i+3} ${acc.address}: ${Number(bal) / 1e18} PAS`);
  }

  // ─── 2. Read Contract State ───
  sep('2. CONTRACT STATE');
  const totalDocs = await read('PolkaInkRegistry', 'totalDocuments');
  console.log(`Total documents: ${totalDocs}`);

  const totalProposals = await read('GovernanceCore', 'totalProposals');
  console.log(`Total proposals: ${totalProposals}`);

  const totalVersions = await read('VersionStore', 'totalVersions');
  console.log(`Total versions: ${totalVersions}`);

  const treasuryBalance = await read('Treasury', 'balance');
  console.log(`Treasury balance: ${Number(treasuryBalance) / 1e18} PAS`);

  // ─── 3. List Existing Documents ───
  sep('3. EXISTING DOCUMENTS');
  if (Number(totalDocs) > 0) {
    const [docs] = await read('PolkaInkRegistry', 'listDocuments', [0n, BigInt(Math.min(Number(totalDocs), 10))]);
    for (const doc of docs) {
      console.log(`  Doc #${doc.id}: "${doc.title}" by ${doc.author.slice(0,10)}... status=${doc.status} currentVersion=${doc.currentVersionId}`);
    }
  }

  // ─── 4. Test getLogs for VersionProposed ───
  sep('4. TEST getLogs (VersionProposed)');
  try {
    const latestBlock = await pc.getBlockNumber();
    const fromBlock = latestBlock > 10000n ? latestBlock - 10000n : 0n;
    console.log(`Querying logs from block ${fromBlock} to latest (${latestBlock})...`);
    
    const logs = await pc.getLogs({
      address: ADDRS.PolkaInkRegistry,
      event: {
        type: 'event', name: 'VersionProposed',
        inputs: [
          { type: 'uint256', name: 'proposalId', indexed: true },
          { type: 'uint256', name: 'docId', indexed: true },
          { type: 'address', name: 'proposer', indexed: true },
          { type: 'uint256', name: 'parentVersionId' },
          { type: 'bytes32', name: 'contentHash' },
          { type: 'uint256', name: 'stakeAmount' },
        ],
      },
      fromBlock,
      toBlock: 'latest',
    });
    console.log(`Found ${logs.length} VersionProposed events`);
    for (const log of logs) {
      console.log(`  block=${log.blockNumber} tx=${log.transactionHash.slice(0,18)}... docId=${log.args.docId} proposalId=${log.args.proposalId}`);
    }
  } catch (err) {
    console.error(`getLogs FAILED: ${err.message}`);
    console.log('Trying with smaller block range...');
    try {
      const latest = await pc.getBlockNumber();
      const logs = await pc.getLogs({
        address: ADDRS.PolkaInkRegistry,
        event: {
          type: 'event', name: 'VersionProposed',
          inputs: [
            { type: 'uint256', name: 'proposalId', indexed: true },
            { type: 'uint256', name: 'docId', indexed: true },
            { type: 'address', name: 'proposer', indexed: true },
            { type: 'uint256', name: 'parentVersionId' },
            { type: 'bytes32', name: 'contentHash' },
            { type: 'uint256', name: 'stakeAmount' },
          ],
        },
        fromBlock: latest - 1000n,
        toBlock: 'latest',
      });
      console.log(`Found ${logs.length} events in last 1000 blocks`);
    } catch (err2) {
      console.error(`Still failing: ${err2.message}`);
    }
  }

  // ─── 5. Create Document ───
  sep('5. CREATE DOCUMENT (Account #3)');
  const w3 = walletFor(accounts[0]);
  const title = `E2E Full Test ${Date.now().toString(36)}`;
  console.log(`Creating document: "${title}"`);
  const createReceipt = await write(w3, 'PolkaInkRegistry', 'createDocument', [title, ['e2e', 'test']]);

  const newTotalDocs = await read('PolkaInkRegistry', 'totalDocuments');
  const docId = Number(newTotalDocs);
  console.log(`Document created: #${docId}`);

  // ─── 6. Propose Version ───
  sep('6. PROPOSE VERSION (Account #3)');
  const markdown = `# ${title}\n\nThis is an E2E test document for PolkaInk.\n\n## Section 1\n\nLorem ipsum dolor sit amet.\n\n## Section 2\n\n- Item 1\n- Item 2\n- Item 3\n`;
  const mdBytes = new TextEncoder().encode(markdown);
  const contentHash = keccak256(toHex(mdBytes));
  const calldata = toHex(mdBytes);
  const stakeAmount = parseEther('0.0001');
  
  console.log(`Content hash: ${contentHash}`);
  console.log(`Content length: ${mdBytes.length} bytes`);
  console.log(`Stake: ${Number(stakeAmount) / 1e18} PAS`);

  const proposeReceipt = await write(w3, 'PolkaInkRegistry', 'proposeVersion', [
    BigInt(docId), 0n, contentHash, calldata,
  ], { value: stakeAmount });

  const newTotalProposals = await read('GovernanceCore', 'totalProposals');
  const proposalId = Number(newTotalProposals);
  console.log(`Proposal created: #${proposalId}`);

  // ─── 7. Read Proposal ───
  sep('7. READ PROPOSAL');
  const proposal = await read('GovernanceCore', 'getProposal', [BigInt(proposalId)]);
  console.log(`Proposal #${proposalId}:`);
  console.log(`  status: ${proposal.status}`);
  console.log(`  proposer: ${proposal.proposer}`);
  console.log(`  docId: ${proposal.docId}`);
  console.log(`  yesVotes: ${proposal.yesVotes}`);
  console.log(`  noVotes: ${proposal.noVotes}`);
  console.log(`  stakeAmount: ${Number(proposal.stakeAmount) / 1e18} PAS`);
  console.log(`  startTime: ${new Date(Number(proposal.startTime) * 1000).toISOString()}`);
  console.log(`  endTime: ${new Date(Number(proposal.endTime) * 1000).toISOString()}`);

  // ─── 8. Vote (all 3 accounts) ───
  sep('8. VOTE ON PROPOSAL');
  for (const [i, acc] of accounts.entries()) {
    const w = walletFor(acc);
    console.log(`Account #${i+3} (${acc.address.slice(0,10)}...) voting YES...`);
    try {
      await write(w, 'GovernanceCore', 'vote', [BigInt(proposalId), true, false, 0n]);
    } catch (err) {
      console.log(`  Vote failed: ${err.message.slice(0, 200)}`);
    }
  }

  const proposalAfterVote = await read('GovernanceCore', 'getProposal', [BigInt(proposalId)]);
  console.log(`After voting - yes: ${proposalAfterVote.yesVotes}, no: ${proposalAfterVote.noVotes}, status: ${proposalAfterVote.status}`);

  // ─── 9. Check pass condition ───
  sep('9. CHECK PASS CONDITION');
  try {
    const [passed, reason] = await read('GovernanceCore', 'checkPassed', [BigInt(proposalId)]);
    console.log(`Passed: ${passed}, Reason: ${reason}`);
  } catch (err) {
    console.log(`checkPassed error: ${err.message.slice(0, 200)}`);
  }

  // ─── 10. Try Queue ───
  sep('10. QUEUE PROPOSAL');
  try {
    await write(w3, 'GovernanceCore', 'queueProposal', [BigInt(proposalId)]);
    console.log('Proposal queued!');
  } catch (err) {
    console.log(`Queue failed (may need to wait for voting period): ${err.message.slice(0, 200)}`);
  }

  // ─── 11. Try Execute ───
  sep('11. EXECUTE PROPOSAL');
  try {
    await write(w3, 'GovernanceCore', 'executeProposal', [BigInt(proposalId)]);
    console.log('Proposal executed!');
  } catch (err) {
    console.log(`Execute failed (may need timelock): ${err.message.slice(0, 200)}`);
  }

  // ─── 12. Re-check proposal status ───
  sep('12. FINAL PROPOSAL STATUS');
  const finalProposal = await read('GovernanceCore', 'getProposal', [BigInt(proposalId)]);
  console.log(`Final status: ${finalProposal.status}`);
  console.log(`  0=Pending, 1=Active, 2=Passed, 3=Queued, 4=Executed, 5=Rejected, 6=Vetoed, 7=Cancelled, 8=Expired`);

  // ─── 13. Verify Content Retrieval ───
  sep('13. VERIFY CONTENT RETRIEVAL');
  try {
    const latest = await pc.getBlockNumber();
    const fromBlock = latest > 50000n ? latest - 50000n : 0n;
    const logs = await pc.getLogs({
      address: ADDRS.PolkaInkRegistry,
      event: {
        type: 'event', name: 'VersionProposed',
        inputs: [
          { type: 'uint256', name: 'proposalId', indexed: true },
          { type: 'uint256', name: 'docId', indexed: true },
          { type: 'address', name: 'proposer', indexed: true },
          { type: 'uint256', name: 'parentVersionId' },
          { type: 'bytes32', name: 'contentHash' },
          { type: 'uint256', name: 'stakeAmount' },
        ],
      },
      args: { docId: BigInt(docId) },
      fromBlock,
      toBlock: 'latest',
    });
    console.log(`Found ${logs.length} VersionProposed events for doc #${docId}`);
    
    if (logs.length > 0) {
      const latestLog = logs[logs.length - 1];
      console.log(`  tx: ${latestLog.transactionHash}`);
      const tx = await pc.getTransaction({ hash: latestLog.transactionHash });
      console.log(`  tx.to: ${tx.to}`);
      console.log(`  tx.input length: ${tx.input.length}`);
      
      const decoded = decodeFunctionData({ abi: ABIS.PolkaInkRegistry, data: tx.input });
      console.log(`  functionName: ${decoded.functionName}`);
      
      if (decoded.functionName === 'proposeVersion') {
        const mdHex = decoded.args[3];
        const hex = mdHex.slice(2);
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
          bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
        }
        const content = new TextDecoder().decode(bytes);
        console.log(`  ✅ Content recovered (${content.length} chars):`);
        console.log(`  "${content.slice(0, 200)}..."`);
      }
    }
  } catch (err) {
    console.error(`Content retrieval FAILED: ${err.message}`);
  }

  // ─── 14. Check NFTs ───
  sep('14. CHECK NFTs');
  for (const [i, acc] of accounts.entries()) {
    try {
      const authorNFTs = await read('NFTReward', 'getAuthorNFTs', [acc.address]);
      const guardianNFTs = await read('NFTReward', 'getGuardianNFTs', [acc.address]);
      console.log(`Account #${i+3}: Author NFTs: [${authorNFTs}], Guardian NFTs: [${guardianNFTs}]`);
    } catch (err) {
      console.log(`Account #${i+3}: NFT query error: ${err.message.slice(0, 100)}`);
    }
  }

  // ─── 15. Check Doc after execution ───
  sep('15. DOCUMENT FINAL STATE');
  const finalDoc = await read('PolkaInkRegistry', 'getDocument', [BigInt(docId)]);
  console.log(`Doc #${docId}: currentVersion=${finalDoc.currentVersionId}, status=${finalDoc.status}`);

  // ─── 16. Council State ───
  sep('16. COUNCIL STATE');
  try {
    const members = await read('ArchiveCouncil', 'getCouncilMembers');
    console.log(`Council members: ${members.length}`);
    for (const m of members) {
      console.log(`  ${m.memberAddress.slice(0,10)}... status=${m.status} vetoCount=${m.vetoCount}`);
    }
  } catch (err) {
    console.log(`Council query: ${err.message.slice(0, 200)}`);
  }

  // ─── 17. Governance Params ───
  sep('17. GOVERNANCE PARAMS');
  try {
    const params = await read('GovernanceCore', 'getGovernanceParams');
    console.log(JSON.stringify(params, (_k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
  } catch (err) {
    console.log(`Params query: ${err.message.slice(0, 200)}`);
  }

  sep('DONE');
}

main().catch(console.error);
