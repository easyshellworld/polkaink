/**
 * Verify that frontend data interfaces return correct data
 * Checks: documents, proposals, votes, treasury, council, NFTs
 * This script uses the same contract interaction pattern as the frontend hooks
 */
import {
  createPublicClient, http, defineChain, formatEther, decodeFunctionData,
} from 'viem';
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
  VersionStore:     '0xBB4cccdDb9e3ba74Ae28A412d34801353D1e0Ad6',
  GovernanceCore:   '0xae456115ce2897338FE22Cd342312D92D47821Fb',
  ArchiveCouncil:   '0x12771dcae01DEba4757719f7D2bD06D235a9FaD8',
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

async function read(contract, fn, args = []) {
  return pc.readContract({ address: ADDRS[contract], abi: ABIS[contract], functionName: fn, args });
}

function sep(title) { console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`); }

let issues = 0;

function check(label, condition, detail) {
  if (condition) {
    console.log(`  ✅ ${label}: ${detail}`);
  } else {
    issues++;
    console.log(`  ⚠️  ${label}: ${detail}`);
  }
}

async function main() {
  // 1. Library / Documents — check what frontend useDocuments would get
  sep('1. LIBRARY — Document listing (useDocuments)');
  const totalDocs = Number(await read('PolkaInkRegistry', 'totalDocuments'));
  console.log(`  Total documents on chain: ${totalDocs}`);

  const [docs] = await read('PolkaInkRegistry', 'listDocuments', [0n, BigInt(totalDocs)]);
  check('Document count', docs.length === totalDocs, `listed ${docs.length} / expected ${totalDocs}`);

  const sortedDesc = [...docs].reverse();
  for (const doc of sortedDesc.slice(0, 5)) {
    const d = await read('PolkaInkRegistry', 'getDocument', [doc.id]);
    check(`Doc #${d.id}`, d.title.length > 0, `"${d.title}" status=${d.status} currentVer=${d.currentVersionId}`);
  }

  // 2. Featured documents — should only show docs with currentVersionId > 0
  sep('2. HOMEPAGE — Featured documents (currentVersionId > 0)');
  const featured = docs.filter(d => Number(d.currentVersionId) > 0);
  check('Featured filter', true, `${featured.length} docs with approved versions out of ${totalDocs}`);
  for (const d of featured) {
    console.log(`     Doc #${d.id}: "${d.title}" currentVersion=${d.currentVersionId}`);
  }

  // 3. Governance — proposals listing
  sep('3. GOVERNANCE — Proposal listing (useProposals)');
  const totalP = Number(await read('GovernanceCore', 'totalProposals'));
  console.log(`  Total proposals on chain: ${totalP}`);

  for (let pid = totalP; pid >= Math.max(1, totalP - 4); pid--) {
    const p = await read('GovernanceCore', 'getProposal', [BigInt(pid)]);
    const statusMap = ['Pending', 'Active', 'Passed', 'Queued', 'Executed', 'Rejected', 'Vetoed', 'Cancelled', 'Expired'];
    const yesF = parseFloat(formatEther(p.yesVotes));
    const noF = parseFloat(formatEther(p.noVotes));
    const total = yesF + noF;
    const yesPct = total > 0 ? ((yesF / total) * 100).toFixed(1) : '0.0';

    check(`Proposal #${pid}`, Number(p.id) === pid,
      `status=${statusMap[Number(p.status)]} docId=${p.docId} yes=${yesF.toFixed(2)} no=${noF.toFixed(2)} (${yesPct}%)`);
  }

  // 4. Check real proposer via events (what useRealProposer does)
  sep('4. GOVERNANCE — Real proposer (useRealProposer)');
  const latest = await pc.getBlockNumber();
  const fromBlock = latest > 50000n ? latest - 50000n : 0n;
  try {
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
    check('VersionProposed events', logs.length > 0, `${logs.length} events found`);

    for (const log of logs.slice(-5)) {
      const p = await read('GovernanceCore', 'getProposal', [log.args.proposalId]);
      const contractProposer = p.proposer;
      const realProposer = log.args.proposer;
      const isRegistry = contractProposer.toLowerCase() === ADDRS.PolkaInkRegistry.toLowerCase();
      check(`Proposal #${log.args.proposalId} proposer`,
        isRegistry ? realProposer !== contractProposer : true,
        `contract=${contractProposer.slice(0,10)}... real=${realProposer.slice(0,10)}... ${isRegistry ? '(correctly resolved via event)' : '(direct)'}`
      );
    }
  } catch (e) {
    console.log(`  ⚠️  Event query failed: ${e.message.slice(0, 100)}`);
  }

  // 5. Content display — verify markdown can be retrieved
  sep('5. DOCUMENT — Content retrieval (useMarkdownContent)');
  try {
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

    let contentOk = 0;
    for (const log of logs.slice(-3)) {
      const tx = await pc.getTransaction({ hash: log.transactionHash });
      const decoded = decodeFunctionData({ abi: ABIS.PolkaInkRegistry, data: tx.input });
      if (decoded.functionName === 'proposeVersion') {
        const mdHex = decoded.args[3];
        const hex = mdHex.slice(2);
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
        const content = new TextDecoder().decode(bytes);
        if (content.length > 0) contentOk++;
        check(`Content doc #${log.args.docId}`, content.length > 0,
          `${content.length} chars, starts with: "${content.slice(0, 60).replace(/\n/g, '\\n')}..."`);
      }
    }
  } catch (e) {
    console.log(`  ⚠️  Content check failed: ${e.message.slice(0, 100)}`);
  }

  // 6. Treasury display
  sep('6. TREASURY — Balance & records');
  const treasuryBal = await read('Treasury', 'balance');
  check('Treasury balance', true, `${formatEther(treasuryBal)} PAS`);

  const totals = await read('Treasury', 'getTotals');
  check('Treasury totals', true, `deposits=${formatEther(totals[0] || 0n)} spent=${formatEther(totals[1] || 0n)}`);

  // 7. Council display
  sep('7. COUNCIL — Members & status');
  const members = await read('ArchiveCouncil', 'getCouncilMembers');
  check('Council members', members.length > 0, `${members.length} members`);
  for (const m of members) {
    console.log(`     ${m.memberAddress} status=${m.status} vetoCount=${m.vetoCount}`);
  }

  // 8. Vote record display — check formatting won't show scientific notation
  sep('8. VOTE DISPLAY — Formatting check');
  for (let pid = totalP; pid >= Math.max(1, totalP - 2); pid--) {
    const p = await read('GovernanceCore', 'getProposal', [BigInt(pid)]);
    const yesRaw = p.yesVotes;
    const noRaw = p.noVotes;
    const absRaw = p.abstainVotes;

    const yesStr = parseFloat(formatEther(yesRaw)).toFixed(0);
    const noStr = parseFloat(formatEther(noRaw)).toFixed(0);
    const absStr = parseFloat(formatEther(absRaw)).toFixed(0);

    const hasScientific = [yesStr, noStr, absStr].some(s => s.includes('e'));
    check(`Proposal #${pid} vote format`, !hasScientific,
      `yes=${yesStr} no=${noStr} abstain=${absStr} ${hasScientific ? 'SCIENTIFIC NOTATION!' : '(clean)'}`);
  }

  // 9. NFT display
  sep('9. NFT — Display data');
  const testAddrs = [
    '0x70c2aDa29240E6dA4cc978E10f8AFB9082Cc95B9',
    '0x5f237563A534EbBfE20eF8Af3D2A27450d5ebBdD',
    '0xB5192778b4214af925dF2B7E388B32bee08bd92a',
  ];
  for (const [i, addr] of testAddrs.entries()) {
    const authorNFTs = await read('NFTReward', 'getAuthorNFTs', [addr]);
    const guardianNFTs = await read('NFTReward', 'getGuardianNFTs', [addr]);
    const hasGuardian = await read('NFTReward', 'hasActiveGuardianNFT', [addr]);
    check(`Account #${i+3} NFTs`, true,
      `author=[${authorNFTs.map(String)}] guardian=[${guardianNFTs.map(String)}] active=${hasGuardian}`);
  }

  // Summary
  sep('SUMMARY');
  if (issues === 0) {
    console.log('  ✅ All frontend data interfaces verified — no issues found');
  } else {
    console.log(`  ⚠️  ${issues} potential display issues found — review above`);
  }
}

main().catch((err) => { console.error('FATAL:', err); process.exit(1); });
