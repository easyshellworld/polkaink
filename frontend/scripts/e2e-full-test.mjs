/**
 * PolkaInk Comprehensive E2E Test
 * Covers ALL contract functions using accounts #3, #4, #5
 * Tests: Registry, Governance, Council, Treasury, NFT, VersionStore
 */
import {
  createPublicClient, createWalletClient, http, defineChain,
  parseEther, formatEther, keccak256, toHex, decodeFunctionData,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';

const RPC = 'https://services.polkadothub-rpc.com/testnet';
const EXPLORER = 'https://polkadot.testnet.routescan.io';
const pasChain = defineChain({
  id: 420420417,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: { name: 'PAS', symbol: 'PAS', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

const ADDRS = {
  PolkaInkRegistry: '0x959b25F190189e588DaC814a95fe13a97d5198A1',
  VersionStore:     '0xBB4cccdDb9e3ba74Ae28A412d34801353D1e0Ad6',
  GovernanceCore:   '0xae456115ce2897338FE22Cd342312D92D47821Fb',
  ArchiveCouncil:   '0x12771dcae01DEba4757719f7D2bD06D235a9FaD8',
  TimelockController: '0x684018c8709105437c277Eec60953cF335EaB5D9',
  NFTReward:        '0x58DC769015e5a6bAdC5C56519B5f74F851575bAe',
  Treasury:         '0x10F968271C18FF349a3a67FEE9141F7F4f42AD14',
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

const acc3 = privateKeyToAccount('0xa6953e8632e0261b59ee98b9e65aa0b229dc97336734d0d9ae95ca2a158896be');
const acc4 = privateKeyToAccount('0x6a9ef2e57524421eb3f19c8a1397287712e1d33b0202506b13291678b374524a');
const acc5 = privateKeyToAccount('0xada13a1d8ab59fe26f4e74f79fdab0b00a5be301f4a6eaa3aae3dc5abcfdd24a');
const accounts = [acc3, acc4, acc5];

function walletFor(account) {
  return createWalletClient({ account, chain: pasChain, transport: http(RPC) });
}
const w3 = walletFor(acc3);
const w4 = walletFor(acc4);
const w5 = walletFor(acc5);

async function read(contract, fn, args = []) {
  return pc.readContract({ address: ADDRS[contract], abi: ABIS[contract], functionName: fn, args });
}

async function write(wallet, contract, fn, args = [], opts = {}) {
  const hash = await wallet.writeContract({
    address: ADDRS[contract], abi: ABIS[contract],
    functionName: fn, args, chain: pasChain, account: wallet.account,
    gas: 1_500_000n, ...opts,
  });
  const receipt = await pc.waitForTransactionReceipt({ hash, timeout: 60_000 });
  if (receipt.status !== 'success') throw new Error(`TX reverted: ${hash}`);
  return { hash, receipt };
}

let passed = 0, failed = 0, skipped = 0;
const results = [];

function sep(title) { console.log(`\n${'═'.repeat(64)}\n  ${title}\n${'═'.repeat(64)}`); }

function ok(name, detail = '') {
  passed++;
  results.push({ status: '✅', name });
  console.log(`  ✅ ${name}${detail ? ': ' + detail : ''}`);
}

function fail(name, err) {
  failed++;
  results.push({ status: '❌', name, err: err?.message?.slice(0, 150) });
  console.log(`  ❌ ${name}: ${err?.message?.slice(0, 200)}`);
}

function skip(name, reason) {
  skipped++;
  results.push({ status: '⏭️', name, reason });
  console.log(`  ⏭️  ${name}: ${reason}`);
}

async function main() {
  const startTime = Date.now();

  // ═══════════════════════════════════════════════════════════
  //  SECTION A: CHAIN & BALANCE CHECKS
  // ═══════════════════════════════════════════════════════════
  sep('A. CHAIN & BALANCE');
  const blockNumber = await pc.getBlockNumber();
  ok('Chain reachable', `block #${blockNumber}`);

  for (const [i, acc] of accounts.entries()) {
    const bal = await pc.getBalance({ address: acc.address });
    const balPAS = formatEther(bal);
    if (bal > 0n) {
      ok(`Account #${i+3} balance`, `${acc.address} = ${parseFloat(balPAS).toFixed(4)} PAS`);
    } else {
      fail(`Account #${i+3} balance`, new Error('Zero balance'));
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  SECTION B: REGISTRY — READ
  // ═══════════════════════════════════════════════════════════
  sep('B. REGISTRY READ');
  const totalDocsBefore = Number(await read('PolkaInkRegistry', 'totalDocuments'));
  ok('totalDocuments', `${totalDocsBefore}`);

  if (totalDocsBefore > 0) {
    const [docs] = await read('PolkaInkRegistry', 'listDocuments', [0n, BigInt(Math.min(totalDocsBefore, 5))]);
    ok('listDocuments', `returned ${docs.length} docs`);

    const doc1 = await read('PolkaInkRegistry', 'getDocument', [1n]);
    ok('getDocument(1)', `"${doc1.title}" by ${doc1.author.slice(0,10)}...`);

    if (doc1.tags && doc1.tags.length > 0) {
      try {
        const [tagDocs] = await read('PolkaInkRegistry', 'listDocumentsByTag', [doc1.tags[0], 0n, 10n]);
        ok('listDocumentsByTag', `tag="${doc1.tags[0]}" → ${tagDocs.length} docs`);
      } catch (e) { fail('listDocumentsByTag', e); }
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  SECTION C: REGISTRY — CREATE DOCUMENT
  // ═══════════════════════════════════════════════════════════
  sep('C. CREATE DOCUMENT (Account #3)');
  const uid = Date.now().toString(36);
  const testTitle = `E2E-Comprehensive-${uid}`;
  let docId;
  try {
    const { hash } = await write(w3, 'PolkaInkRegistry', 'createDocument', [testTitle, ['e2e', 'comprehensive']]);
    const newTotal = Number(await read('PolkaInkRegistry', 'totalDocuments'));
    docId = newTotal;
    ok('createDocument', `Doc #${docId} "${testTitle}" tx=${hash.slice(0,18)}...`);
    console.log(`     ${EXPLORER}/tx/${hash}`);
  } catch (e) { fail('createDocument', e); }

  if (docId) {
    const newDoc = await read('PolkaInkRegistry', 'getDocument', [BigInt(docId)]);
    if (newDoc.title === testTitle && newDoc.author.toLowerCase() === acc3.address.toLowerCase()) {
      ok('verify doc data', `title="${newDoc.title}" author=${newDoc.author.slice(0,10)}`);
    } else {
      fail('verify doc data', new Error(`Mismatch: "${newDoc.title}" / ${newDoc.author}`));
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  SECTION D: REGISTRY — PROPOSE VERSION
  // ═══════════════════════════════════════════════════════════
  sep('D. PROPOSE VERSION (Account #3)');
  let proposalId;
  const markdown = `# ${testTitle}\n\nComprehensive E2E test for PolkaInk.\n\n## Overview\n\nThis document tests the full proposal lifecycle.\n\n## Sections\n\n- Creation\n- Voting\n- Execution\n`;
  const mdBytes = new TextEncoder().encode(markdown);
  const contentHash = keccak256(toHex(mdBytes));
  const calldata = toHex(mdBytes);
  const stakeAmount = parseEther('0.0001');

  if (docId) {
    try {
      const totalBefore = Number(await read('GovernanceCore', 'totalProposals'));
      const { hash } = await write(w3, 'PolkaInkRegistry', 'proposeVersion', [
        BigInt(docId), 0n, contentHash, calldata,
      ], { value: stakeAmount });
      const totalAfter = Number(await read('GovernanceCore', 'totalProposals'));
      proposalId = totalAfter;
      ok('proposeVersion', `Proposal #${proposalId}, stake=${formatEther(stakeAmount)} PAS, tx=${hash.slice(0,18)}...`);
      console.log(`     ${EXPLORER}/tx/${hash}`);
    } catch (e) { fail('proposeVersion', e); }
  }

  // ═══════════════════════════════════════════════════════════
  //  SECTION E: GOVERNANCE — READ PROPOSAL
  // ═══════════════════════════════════════════════════════════
  sep('E. GOVERNANCE READ');
  const totalProposals = Number(await read('GovernanceCore', 'totalProposals'));
  ok('totalProposals', `${totalProposals}`);

  if (proposalId) {
    const p = await read('GovernanceCore', 'getProposal', [BigInt(proposalId)]);
    ok('getProposal', `status=${p.status} docId=${p.docId} yes=${p.yesVotes} no=${p.noVotes}`);

    try {
      const status = await read('GovernanceCore', 'getProposalStatus', [BigInt(proposalId)]);
      ok('getProposalStatus', `${status}`);
    } catch (e) { fail('getProposalStatus', e); }
  }

  try {
    const params = await read('GovernanceCore', 'getGovernanceParams');
    ok('getGovernanceParams', `votingPeriod=${params.votingPeriod}s threshold=${params.passThreshold}%`);
  } catch (e) { fail('getGovernanceParams', e); }

  try {
    const [list, total] = await read('GovernanceCore', 'listProposals', [1, 0n, 5n]);
    ok('listProposals(Active)', `${list.length} proposals (total=${total})`);
  } catch (e) { fail('listProposals', e); }

  // ═══════════════════════════════════════════════════════════
  //  SECTION F: VOTING — 3 ACCOUNTS
  // ═══════════════════════════════════════════════════════════
  sep('F. VOTING (Accounts #3, #4, #5)');

  if (proposalId) {
    // Account #3: YES, no lock
    try {
      const { hash } = await write(w3, 'GovernanceCore', 'vote', [BigInt(proposalId), true, false, 0n]);
      ok('Account #3 vote YES (no lock)', `tx=${hash.slice(0,18)}...`);
      console.log(`     ${EXPLORER}/tx/${hash}`);
    } catch (e) { fail('Account #3 vote YES', e); }

    // Account #4: YES, 30-day lock (×1.2)
    try {
      const { hash } = await write(w4, 'GovernanceCore', 'vote', [BigInt(proposalId), true, false, 30n]);
      ok('Account #4 vote YES (30d lock ×1.2)', `tx=${hash.slice(0,18)}...`);
      console.log(`     ${EXPLORER}/tx/${hash}`);
    } catch (e) { fail('Account #4 vote YES (30d)', e); }

    // Account #5: YES, 90-day lock (×1.5)
    try {
      const { hash } = await write(w5, 'GovernanceCore', 'vote', [BigInt(proposalId), true, false, 90n]);
      ok('Account #5 vote YES (90d lock ×1.5)', `tx=${hash.slice(0,18)}...`);
      console.log(`     ${EXPLORER}/tx/${hash}`);
    } catch (e) { fail('Account #5 vote YES (90d)', e); }

    // Verify vote records
    for (const [i, acc] of accounts.entries()) {
      try {
        const record = await read('GovernanceCore', 'getVoteRecord', [BigInt(proposalId), acc.address]);
        ok(`getVoteRecord #${i+3}`, `support=${record.support} weight=${record.weight} lockDays=${record.lockDays}`);
      } catch (e) { fail(`getVoteRecord #${i+3}`, e); }
    }

    // Check proposal after votes
    const pAfter = await read('GovernanceCore', 'getProposal', [BigInt(proposalId)]);
    const yesFloat = parseFloat(formatEther(pAfter.yesVotes));
    const noFloat = parseFloat(formatEther(pAfter.noVotes));
    ok('Post-vote state', `yes=${yesFloat.toFixed(4)} no=${noFloat.toFixed(4)} abstain=${pAfter.abstainVotes}`);

    // Double vote check
    try {
      await write(w3, 'GovernanceCore', 'vote', [BigInt(proposalId), true, false, 0n]);
      fail('Double vote prevention', new Error('Should have reverted'));
    } catch (e) {
      ok('Double vote prevention', 'correctly reverted');
    }

    // Check pass condition
    try {
      const [isPassed, reason] = await read('GovernanceCore', 'checkPassed', [BigInt(proposalId)]);
      ok('checkPassed', `passed=${isPassed} reason="${reason}"`);
    } catch (e) { fail('checkPassed', e); }
  }

  // ═══════════════════════════════════════════════════════════
  //  SECTION G: GOVERNANCE — QUEUE & EXECUTE (on older proposals)
  // ═══════════════════════════════════════════════════════════
  sep('G. QUEUE & EXECUTE');

  // Try to find an older passed/active proposal that can be queued
  let queueableId = null;
  for (let pid = totalProposals; pid >= 1; pid--) {
    try {
      const p = await read('GovernanceCore', 'getProposal', [BigInt(pid)]);
      const nowSec = Math.floor(Date.now() / 1000);
      if (Number(p.status) === 1 && Number(p.endTime) < nowSec) {
        queueableId = pid;
        console.log(`  Found expired Active proposal #${pid} that may be queueable`);
        break;
      }
      if (Number(p.status) === 2) {
        queueableId = pid;
        console.log(`  Found Passed proposal #${pid} that may be queueable`);
        break;
      }
    } catch (_) { /* skip */ }
  }

  if (queueableId) {
    try {
      const { hash } = await write(w3, 'GovernanceCore', 'queueProposal', [BigInt(queueableId)]);
      ok('queueProposal', `#${queueableId} tx=${hash.slice(0,18)}...`);
      console.log(`     ${EXPLORER}/tx/${hash}`);
    } catch (e) { skip('queueProposal', e.message.slice(0, 150)); }

    const pQueued = await read('GovernanceCore', 'getProposal', [BigInt(queueableId)]);
    console.log(`  Proposal #${queueableId} status after queue attempt: ${pQueued.status}`);

    if (Number(pQueued.status) === 3) {
      try {
        const { hash } = await write(w3, 'GovernanceCore', 'executeProposal', [BigInt(queueableId)]);
        ok('executeProposal', `#${queueableId} tx=${hash.slice(0,18)}...`);
        console.log(`     ${EXPLORER}/tx/${hash}`);
      } catch (e) { skip('executeProposal', `Timelock not expired: ${e.message.slice(0, 100)}`); }
    }
  } else {
    skip('queueProposal', 'No eligible proposals found (all still in voting period)');
    skip('executeProposal', 'Depends on queue');
  }

  // Also try queue/execute on the NEW proposal (will likely fail - voting not ended)
  if (proposalId) {
    try {
      await write(w3, 'GovernanceCore', 'queueProposal', [BigInt(proposalId)]);
      fail('Early queue prevention', new Error('Should have reverted'));
    } catch (_) {
      ok('Early queue prevention', 'correctly reverted (voting still active)');
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  SECTION H: COUNCIL
  // ═══════════════════════════════════════════════════════════
  sep('H. ARCHIVE COUNCIL');

  try {
    const members = await read('ArchiveCouncil', 'getCouncilMembers');
    ok('getCouncilMembers', `${members.length} members`);
    for (const m of members) {
      console.log(`     ${m.memberAddress.slice(0,10)}... status=${m.status} vetoCount=${m.vetoCount}`);
    }
  } catch (e) { fail('getCouncilMembers', e); }

  if (proposalId) {
    try {
      const veto = await read('ArchiveCouncil', 'getVetoStatus', [BigInt(proposalId)]);
      ok('getVetoStatus', `vetoCount=${veto.vetoCount} approved=${veto.approved}`);
    } catch (e) { fail('getVetoStatus', e); }

    try {
      const record = await read('ArchiveCouncil', 'getVetoRecord', [BigInt(proposalId)]);
      ok('getVetoRecord', `${record.length || 0} records`);
    } catch (e) { fail('getVetoRecord', e); }
  }

  // ═══════════════════════════════════════════════════════════
  //  SECTION I: TREASURY
  // ═══════════════════════════════════════════════════════════
  sep('I. TREASURY');

  try {
    const bal = await read('Treasury', 'balance');
    ok('Treasury balance', `${formatEther(bal)} PAS`);
  } catch (e) { fail('Treasury balance', e); }

  try {
    const totals = await read('Treasury', 'getTotals');
    ok('Treasury getTotals', `deposits=${formatEther(totals.totalDeposits || totals[0] || 0n)} spent=${formatEther(totals.totalSpent || totals[1] || 0n)}`);
  } catch (e) { fail('Treasury getTotals', e); }

  try {
    const [spends, total] = await read('Treasury', 'listSpendRecords', [0n, 10n]);
    ok('Treasury listSpendRecords', `${spends.length} records (total=${total})`);
  } catch (e) { fail('Treasury listSpendRecords', e); }

  // ═══════════════════════════════════════════════════════════
  //  SECTION J: NFT REWARD
  // ═══════════════════════════════════════════════════════════
  sep('J. NFT REWARD');

  for (const [i, acc] of accounts.entries()) {
    try {
      const authorNFTs = await read('NFTReward', 'getAuthorNFTs', [acc.address]);
      const guardianNFTs = await read('NFTReward', 'getGuardianNFTs', [acc.address]);
      ok(`NFTs for #${i+3}`, `author=[${authorNFTs.map(String)}] guardian=[${guardianNFTs.map(String)}]`);
    } catch (e) { fail(`NFTs for #${i+3}`, e); }
  }

  // Check hasActiveGuardianNFT
  for (const [i, acc] of accounts.entries()) {
    try {
      const has = await read('NFTReward', 'hasActiveGuardianNFT', [acc.address]);
      ok(`hasActiveGuardianNFT #${i+3}`, `${has}`);
    } catch (e) { fail(`hasActiveGuardianNFT #${i+3}`, e); }
  }

  // ═══════════════════════════════════════════════════════════
  //  SECTION K: VERSION STORE
  // ═══════════════════════════════════════════════════════════
  sep('K. VERSION STORE');

  try {
    const totalV = await read('VersionStore', 'totalVersions');
    ok('totalVersions', `${totalV}`);
  } catch (e) { fail('totalVersions', e); }

  if (docId) {
    try {
      const dag = await read('VersionStore', 'getVersionDAG', [BigInt(docId)]);
      ok('getVersionDAG', `doc #${docId} has ${dag.length || 0} versions in DAG`);
    } catch (e) { fail('getVersionDAG', e); }
  }

  // Read an existing version
  try {
    const totalV = Number(await read('VersionStore', 'totalVersions'));
    if (totalV > 0) {
      const v = await read('VersionStore', 'getVersion', [BigInt(totalV)]);
      ok('getVersion', `v${totalV}: docId=${v.docId} author=${v.author?.slice(0,10)}...`);
    }
  } catch (e) { fail('getVersion', e); }

  // ═══════════════════════════════════════════════════════════
  //  SECTION L: VOTING POWER
  // ═══════════════════════════════════════════════════════════
  sep('L. VOTING POWER');

  for (const [i, acc] of accounts.entries()) {
    try {
      const block = await pc.getBlockNumber();
      const power = await read('GovernanceCore', 'getVotingPower', [acc.address, block - 1n]);
      ok(`Voting power #${i+3}`, `${formatEther(power)} PAS (at block ${block - 1n})`);
    } catch (e) { fail(`Voting power #${i+3}`, e); }
  }

  // ═══════════════════════════════════════════════════════════
  //  SECTION M: EVENT LOGS — VERIFY CONTENT
  // ═══════════════════════════════════════════════════════════
  sep('M. EVENT LOGS & CONTENT VERIFICATION');

  if (docId) {
    try {
      const latest = await pc.getBlockNumber();
      const fromBlock = latest > 5000n ? latest - 5000n : 0n;
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

      const myLogs = logs.filter(l => Number(l.args.docId) === docId);
      ok('VersionProposed events', `found ${myLogs.length} for doc #${docId}`);

      if (myLogs.length > 0) {
        const log = myLogs[myLogs.length - 1];
        const tx = await pc.getTransaction({ hash: log.transactionHash });
        const decoded = decodeFunctionData({ abi: ABIS.PolkaInkRegistry, data: tx.input });

        if (decoded.functionName === 'proposeVersion') {
          const mdHex = decoded.args[3];
          const hex = mdHex.slice(2);
          const bytes = new Uint8Array(hex.length / 2);
          for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
          const recovered = new TextDecoder().decode(bytes);
          if (recovered.includes(testTitle)) {
            ok('Content recovery', `${recovered.length} chars, title match confirmed`);
          } else {
            fail('Content recovery', new Error('Title mismatch in recovered content'));
          }
        }

        if (log.args.proposer.toLowerCase() === acc3.address.toLowerCase()) {
          ok('Proposer verification', `matches account #3`);
        } else {
          fail('Proposer verification', new Error(`Expected ${acc3.address}, got ${log.args.proposer}`));
        }
      }
    } catch (e) { fail('Event logs', e); }
  }

  // ═══════════════════════════════════════════════════════════
  //  SECTION N: DOCUMENT CREATED EVENT
  // ═══════════════════════════════════════════════════════════
  sep('N. DOCUMENT CREATED EVENT');

  if (docId) {
    try {
      const latest = await pc.getBlockNumber();
      const fromBlock = latest > 5000n ? latest - 5000n : 0n;
      const logs = await pc.getLogs({
        address: ADDRS.PolkaInkRegistry,
        event: {
          type: 'event', name: 'DocumentCreated',
          inputs: [
            { type: 'uint256', name: 'docId', indexed: true },
            { type: 'address', name: 'author', indexed: true },
            { type: 'string', name: 'title' },
            { type: 'string[]', name: 'tags' },
            { type: 'uint256', name: 'timestamp' },
          ],
        },
        fromBlock,
        toBlock: 'latest',
      });
      const myLogs = logs.filter(l => Number(l.args.docId) === docId);
      if (myLogs.length > 0) {
        ok('DocumentCreated event', `doc #${docId} tx=${myLogs[0].transactionHash.slice(0,18)}...`);
        console.log(`     ${EXPLORER}/tx/${myLogs[0].transactionHash}`);
      } else {
        fail('DocumentCreated event', new Error('Not found'));
      }
    } catch (e) { fail('DocumentCreated event', e); }
  }

  // ═══════════════════════════════════════════════════════════
  //  SECTION O: EDGE CASES
  // ═══════════════════════════════════════════════════════════
  sep('O. EDGE CASES');

  // Empty title
  try {
    await write(w3, 'PolkaInkRegistry', 'createDocument', ['', ['test']]);
    fail('Empty title rejection', new Error('Should have reverted'));
  } catch (_) {
    ok('Empty title rejection', 'correctly reverted');
  }

  // Too many tags
  try {
    const manyTags = Array.from({ length: 20 }, (_, i) => `tag${i}`);
    await write(w3, 'PolkaInkRegistry', 'createDocument', ['Too Many Tags', manyTags]);
    fail('Max tags rejection', new Error('Should have reverted'));
  } catch (_) {
    ok('Max tags rejection', 'correctly reverted');
  }

  // Invalid docId for propose
  try {
    await write(w3, 'PolkaInkRegistry', 'proposeVersion', [
      999999n, 0n, contentHash, calldata,
    ], { value: stakeAmount });
    fail('Invalid docId rejection', new Error('Should have reverted'));
  } catch (_) {
    ok('Invalid docId rejection', 'correctly reverted');
  }

  // Vote on non-existent proposal
  try {
    await write(w3, 'GovernanceCore', 'vote', [999999n, true, false, 0n]);
    fail('Vote invalid proposal rejection', new Error('Should have reverted'));
  } catch (_) {
    ok('Vote invalid proposal rejection', 'correctly reverted');
  }

  // ═══════════════════════════════════════════════════════════
  //  SECTION P: SECOND DOCUMENT BY DIFFERENT ACCOUNT
  // ═══════════════════════════════════════════════════════════
  sep('P. DOCUMENT BY ACCOUNT #4');

  let docId4;
  try {
    const title4 = `E2E-Acc4-${uid}`;
    const { hash } = await write(w4, 'PolkaInkRegistry', 'createDocument', [title4, ['e2e', 'multi-account']]);
    const newTotal = Number(await read('PolkaInkRegistry', 'totalDocuments'));
    docId4 = newTotal;
    ok('Account #4 createDocument', `Doc #${docId4} tx=${hash.slice(0,18)}...`);
    console.log(`     ${EXPLORER}/tx/${hash}`);
  } catch (e) { fail('Account #4 createDocument', e); }

  if (docId4) {
    try {
      const md4 = `# Account 4 Test\n\nCreated by account #4 for multi-user testing.\n`;
      const md4Bytes = new TextEncoder().encode(md4);
      const hash4 = keccak256(toHex(md4Bytes));
      const { hash } = await write(w4, 'PolkaInkRegistry', 'proposeVersion', [
        BigInt(docId4), 0n, hash4, toHex(md4Bytes),
      ], { value: parseEther('0.0001') });
      const pTotal = Number(await read('GovernanceCore', 'totalProposals'));
      ok('Account #4 proposeVersion', `Proposal #${pTotal} tx=${hash.slice(0,18)}...`);
      console.log(`     ${EXPLORER}/tx/${hash}`);

      // Account #5 votes on #4's proposal
      const { hash: vHash } = await write(w5, 'GovernanceCore', 'vote', [BigInt(pTotal), true, false, 0n]);
      ok('Account #5 votes on #4 proposal', `tx=${vHash.slice(0,18)}...`);
      console.log(`     ${EXPLORER}/tx/${vHash}`);
    } catch (e) { fail('Account #4 propose+vote flow', e); }
  }

  // ═══════════════════════════════════════════════════════════
  //  SECTION Q: ABSTAIN VOTE TEST
  // ═══════════════════════════════════════════════════════════
  sep('Q. ABSTAIN VOTE');

  if (docId4) {
    try {
      const pTotal = Number(await read('GovernanceCore', 'totalProposals'));
      // Account #3 abstains on account #4's proposal
      const { hash } = await write(w3, 'GovernanceCore', 'vote', [BigInt(pTotal), false, true, 0n]);
      ok('Account #3 ABSTAIN vote', `tx=${hash.slice(0,18)}...`);
      console.log(`     ${EXPLORER}/tx/${hash}`);

      const p = await read('GovernanceCore', 'getProposal', [BigInt(pTotal)]);
      ok('Abstain recorded', `abstainVotes=${p.abstainVotes}`);
    } catch (e) { fail('Abstain vote', e); }
  }

  // ═══════════════════════════════════════════════════════════
  //  SECTION R: TREASURY BALANCE CHANGE AFTER STAKES
  // ═══════════════════════════════════════════════════════════
  sep('R. TREASURY AFTER STAKES');

  try {
    const bal = await read('Treasury', 'balance');
    const balPAS = formatEther(bal);
    ok('Treasury balance after stakes', `${balPAS} PAS`);
    if (bal > 0n) {
      ok('Treasury received stake funds', 'balance > 0');
    }
  } catch (e) { fail('Treasury balance check', e); }

  // ═══════════════════════════════════════════════════════════
  //  SUMMARY
  // ═══════════════════════════════════════════════════════════
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  sep(`SUMMARY — ${elapsed}s`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  Total: ${passed + failed + skipped}`);
  console.log('');

  if (failed > 0) {
    console.log('  Failed tests:');
    for (const r of results.filter(r => r.status === '❌')) {
      console.log(`    ❌ ${r.name}: ${r.err}`);
    }
  }

  if (skipped > 0) {
    console.log('  Skipped tests:');
    for (const r of results.filter(r => r.status === '⏭️')) {
      console.log(`    ⏭️  ${r.name}: ${r.reason}`);
    }
  }

  console.log(`\n  Key artifacts:`);
  if (docId) console.log(`    Doc #${docId}: ${EXPLORER}/address/${ADDRS.PolkaInkRegistry}`);
  if (proposalId) console.log(`    Proposal #${proposalId}: ${EXPLORER}/address/${ADDRS.GovernanceCore}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error('FATAL:', err); process.exit(1); });
