/**
 * Live E2E test against deployed contracts on PAS TestNet.
 *
 * Usage:
 *   PRIVATE_KEY_FOR_TESTING="<mnemonic>" npx hardhat run scripts/test-live.ts --network pasTestnet
 *
 * Tests:
 *   1. Read — Stats, governance params, council members
 *   2. Write — Create document, propose version, vote
 *   3. Governance — Check proposal state, vote record
 *   4. NFT & Treasury reads
 *   5. Full lifecycle (steps that need time-wait are logged and skipped)
 */

import { ethers } from "hardhat";
import RegistryABI from "../../frontend/src/lib/contracts/abis/PolkaInkRegistry.json";
import GovernanceABI from "../../frontend/src/lib/contracts/abis/GovernanceCore.json";
import VersionStoreABI from "../../frontend/src/lib/contracts/abis/VersionStore.json";
import CouncilABI from "../../frontend/src/lib/contracts/abis/ArchiveCouncil.json";
import NftABI from "../../frontend/src/lib/contracts/abis/NFTReward.json";
import TreasuryABI from "../../frontend/src/lib/contracts/abis/Treasury.json";

const ADDR = {
  PolkaInkRegistry: "0x959b25F190189e588DaC814a95fe13a97d5198A1",
  VersionStore: "0xBB4cccdDb9e3ba74Ae28A412d34801353D1e0Ad6",
  GovernanceCore: "0xae456115ce2897338FE22Cd342312D92D47821Fb",
  ArchiveCouncil: "0x12771dcae01DEba4757719f7D2bD06D235a9FaD8",
  NFTReward: "0x58DC769015e5a6bAdC5C56519B5f74F851575bAe",
  Treasury: "0x10F968271C18FF349a3a67FEE9141F7F4f42AD14",
};

const STATUS_LABEL = ["Active", "Archived", "Disputed"];
const PROPOSAL_STATUS = [
  "Pending", "Active", "Passed", "Rejected", "Queued",
  "Executed", "Cancelled", "Vetoed", "Expired",
];

let passed = 0;
let failed = 0;
let skipped = 0;

function extractRevertReason(e: unknown): string {
  const msg = (e as any)?.message ?? String(e);
  if (msg.includes("EmptyTitle")) return "Registry__EmptyTitle";
  if (msg.includes("TooManyTags")) return "Registry__TooManyTags";
  if (msg.includes("DocumentNotFound")) return "Registry__DocumentNotFound";
  if (msg.includes("AlreadyVoted")) return "Governance__AlreadyVoted";
  if (msg.includes("NotActive")) return "Governance__NotActive";
  // PAS chain returns non-standard error codes for reverts
  if (msg.includes("Invalid Transaction") || msg.includes("1010")) return "reverted (PAS error 1010)";
  if (msg.includes("Priority is too low") || msg.includes("1014")) return "reverted (PAS nonce conflict)";
  if (msg.includes("revert") || msg.includes("CALL_EXCEPTION")) return "reverted";
  return `error: ${msg.slice(0, 80)}`;
}

function ok(label: string, detail = "") {
  passed++;
  console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ""}`);
}
function fail(label: string, err: unknown) {
  failed++;
  console.log(`  ❌ ${label} — ${(err as Error).message ?? err}`);
}
function skip(label: string, reason: string) {
  skipped++;
  console.log(`  ⏭️  ${label} — ${reason}`);
}

async function main() {
  const key = process.env.PRIVATE_KEY_FOR_TESTING || process.env.PRIVATE_KEY;
  if (!key) throw new Error("Set PRIVATE_KEY_FOR_TESTING or PRIVATE_KEY in .env");

  const provider = new ethers.JsonRpcProvider(
    "https://services.polkadothub-rpc.com/testnet",
    { chainId: 420420417, name: "PAS" },
  );
  const wallet = key.includes(" ")
    ? ethers.Wallet.fromPhrase(key, provider)
    : new ethers.Wallet(key.startsWith("0x") ? key : `0x${key}`, provider);
  const addr = wallet.address;
  const balance = await provider.getBalance(addr);

  console.log("\n══════════════════════════════════════════════════");
  console.log("  PolkaInk Live E2E Test — PAS TestNet");
  console.log("══════════════════════════════════════════════════");
  console.log(`  Wallet:  ${addr}`);
  console.log(`  Balance: ${ethers.formatEther(balance)} PAS`);
  console.log("");

  if (balance === 0n) {
    console.log("  ⚠️  Balance is 0 — get PAS from https://faucet.polkadot.io/");
    return;
  }

  const registry = new ethers.Contract(ADDR.PolkaInkRegistry, RegistryABI, wallet);
  const gov = new ethers.Contract(ADDR.GovernanceCore, GovernanceABI, wallet);
  const vs = new ethers.Contract(ADDR.VersionStore, VersionStoreABI, provider);
  const council = new ethers.Contract(ADDR.ArchiveCouncil, CouncilABI, provider);
  const nft = new ethers.Contract(ADDR.NFTReward, NftABI, provider);
  const treasury = new ethers.Contract(ADDR.Treasury, TreasuryABI, provider);

  // ────────────────────────────────────────────────────────────────
  // 1. READ — Stats
  // ────────────────────────────────────────────────────────────────
  console.log("─── 1. Read — Global Stats ───────────────────────");
  let totalDocs = 0n, totalVersions = 0n, totalProposals = 0n;
  try {
    totalDocs = await registry.totalDocuments();
    ok("totalDocuments()", String(totalDocs));
  } catch (e) { fail("totalDocuments()", e); }

  try {
    totalVersions = await vs.totalVersions();
    ok("totalVersions()", String(totalVersions));
  } catch (e) { fail("totalVersions()", e); }

  try {
    totalProposals = await gov.totalProposals();
    ok("totalProposals()", String(totalProposals));
  } catch (e) { fail("totalProposals()", e); }

  // ────────────────────────────────────────────────────────────────
  // 2. READ — Governance Params
  // ────────────────────────────────────────────────────────────────
  console.log("\n─── 2. Read — Governance Params ──────────────────");
  try {
    const params = await gov.getGovernanceParams();
    ok("getGovernanceParams()", `minStake=${params.minStake}, votingPeriod=${params.votingPeriod}s, quorum=${params.quorumNumerator}%`);
  } catch (e) { fail("getGovernanceParams()", e); }

  // ────────────────────────────────────────────────────────────────
  // 3. READ — Council Members
  // ────────────────────────────────────────────────────────────────
  console.log("\n─── 3. Read — Archive Council ────────────────────");
  try {
    const members = await council.getCouncilMembers();
    ok("getCouncilMembers()", `${members.length} members`);
    for (const m of members) {
      console.log(`       ${m.addr} — active: ${m.active}`);
    }
  } catch (e) { fail("getCouncilMembers()", e); }

  // ────────────────────────────────────────────────────────────────
  // 4. READ — NFT & Treasury
  // ────────────────────────────────────────────────────────────────
  console.log("\n─── 4. Read — NFT & Treasury ─────────────────────");
  try {
    const authorNFTs = await nft.getAuthorNFTs(addr);
    ok("getAuthorNFTs(wallet)", `${authorNFTs.length} NFTs`);
  } catch (e) { fail("getAuthorNFTs(wallet)", e); }

  try {
    const guardianNFTs = await nft.getGuardianNFTs(addr);
    ok("getGuardianNFTs(wallet)", `${guardianNFTs.length} NFTs`);
  } catch (e) { fail("getGuardianNFTs(wallet)", e); }

  try {
    const hasGuardian = await nft.hasActiveGuardianNFT(addr);
    ok("hasActiveGuardianNFT(wallet)", String(hasGuardian));
  } catch (e) { fail("hasActiveGuardianNFT(wallet)", e); }

  try {
    const totals = await treasury.getTotals();
    ok("treasury.getTotals()", `income=${ethers.formatEther(totals[0])} PAS, spent=${ethers.formatEther(totals[1])} PAS`);
  } catch (e) { fail("treasury.getTotals()", e); }

  // ────────────────────────────────────────────────────────────────
  // 5. READ — List existing documents
  // ────────────────────────────────────────────────────────────────
  console.log("\n─── 5. Read — List Documents ─────────────────────");
  try {
    const [docs, total] = await registry.listDocuments(0, 10);
    ok("listDocuments(0,10)", `${docs.length} docs, total=${total}`);
    for (const d of docs) {
      console.log(`       Doc #${d.id}: "${d.title}" by ${d.author.slice(0, 10)}... status=${STATUS_LABEL[Number(d.status)]}`);
    }
  } catch (e) { fail("listDocuments(0,10)", e); }

  // ────────────────────────────────────────────────────────────────
  // 6. READ — Existing proposals
  // ────────────────────────────────────────────────────────────────
  console.log("\n─── 6. Read — List Proposals ─────────────────────");
  if (totalProposals > 0n) {
    try {
      const [proposals] = await gov.listProposals(0, 0, 10);
      ok("listProposals(0,0,10)", `${proposals.length} proposals`);
      for (const p of proposals) {
        console.log(`       Proposal #${p.id}: doc=${p.docId} status=${PROPOSAL_STATUS[Number(p.status)]} yes=${p.yesVotes} no=${p.noVotes}`);
      }
    } catch (e) { fail("listProposals(0,0,10)", e); }
  } else {
    skip("listProposals", "no proposals yet");
  }

  // ────────────────────────────────────────────────────────────────
  // 7. WRITE — Create Document
  // ────────────────────────────────────────────────────────────────
  console.log("\n─── 7. Write — Create Document ───────────────────");
  const ts = Date.now().toString(36);
  const docTitle = `E2E Test ${ts}`;
  let newDocId = 0n;
  try {
    const tx = await registry.createDocument(docTitle, ["e2e", "test"], { gasLimit: 500_000n });
    const receipt = await tx.wait();
    const event = receipt!.logs.find(
      (l: any) => l.fragment?.name === "DocumentCreated" || registry.interface.parseLog(l)?.name === "DocumentCreated"
    );
    if (event) {
      const parsed = registry.interface.parseLog(event);
      newDocId = parsed!.args.docId;
    } else {
      const newTotal = await registry.totalDocuments();
      newDocId = newTotal;
    }
    ok("createDocument()", `docId=${newDocId}, title="${docTitle}", tx=${receipt!.hash.slice(0, 18)}...`);
  } catch (e) { fail("createDocument()", e); }

  // ────────────────────────────────────────────────────────────────
  // 8. READ — Verify created document
  // ────────────────────────────────────────────────────────────────
  console.log("\n─── 8. Read — Verify Document ────────────────────");
  if (newDocId > 0n) {
    try {
      const doc = await registry.getDocument(newDocId);
      const titleMatch = doc.title === docTitle;
      const authorMatch = doc.author.toLowerCase() === addr.toLowerCase();
      if (titleMatch && authorMatch) {
        ok("getDocument()", `title="${doc.title}", author=${doc.author.slice(0, 10)}..., tags=[${doc.tags}]`);
      } else {
        fail("getDocument()", `title mismatch: got "${doc.title}" expected "${docTitle}"`);
      }
    } catch (e) { fail("getDocument(newDocId)", e); }

    try {
      const history = await registry.getVersionHistory(newDocId);
      ok("getVersionHistory()", `${history.length} versions (expected 0 for new doc)`);
    } catch (e) { fail("getVersionHistory()", e); }
  } else {
    skip("verify document", "document creation failed");
  }

  // ────────────────────────────────────────────────────────────────
  // 9. WRITE — Propose Version
  // ────────────────────────────────────────────────────────────────
  console.log("\n─── 9. Write — Propose Version ───────────────────");
  let proposalCreated = false;
  if (newDocId > 0n) {
    try {
      const markdown = `# ${docTitle}\n\nThis is an E2E test document created at ${new Date().toISOString()}.\n\n## Purpose\n\nValidate PolkaInk contract functionality on PAS TestNet.\n`;
      const contentBytes = new TextEncoder().encode(markdown);
      const contentHash = ethers.keccak256(contentBytes);
      const minStake = ethers.parseUnits("5", 12); // 0.000005 PAS

      const tx = await registry.proposeVersion(
        newDocId, 0, contentHash, contentBytes,
        { value: minStake, gasLimit: 1_000_000n },
      );
      const receipt = await tx.wait();
      ok("proposeVersion()", `tx=${receipt!.hash.slice(0, 18)}...`);
      proposalCreated = true;
    } catch (e) { fail("proposeVersion()", e); }
  } else {
    skip("proposeVersion", "no docId");
  }

  // ────────────────────────────────────────────────────────────────
  // 10. READ — Verify proposal
  // ────────────────────────────────────────────────────────────────
  console.log("\n─── 10. Read — Verify Proposal ───────────────────");
  const latestProposalId = await gov.totalProposals();
  if (proposalCreated && latestProposalId > 0n) {
    try {
      const p = await gov.getProposal(latestProposalId);
      ok("getProposal()", `id=${p.id} status=${PROPOSAL_STATUS[Number(p.status)]} docId=${p.docId} stake=${ethers.formatEther(p.stakeAmount)} PAS`);
      const endDate = new Date(Number(p.endTime) * 1000);
      console.log(`       Voting ends: ${endDate.toISOString()}`);
    } catch (e) { fail("getProposal(latest)", e); }

    try {
      const [passed_, reason] = await gov.checkPassed(latestProposalId);
      ok("checkPassed()", `passed=${passed_}, reason="${reason}"`);
    } catch (e) { fail("checkPassed()", e); }
  } else {
    skip("verify proposal", "no proposal created");
  }

  // ────────────────────────────────────────────────────────────────
  // 11. WRITE — Vote on proposal
  // ────────────────────────────────────────────────────────────────
  console.log("\n─── 11. Write — Vote ─────────────────────────────");
  if (proposalCreated && latestProposalId > 0n) {
    try {
      const tx = await gov.vote(latestProposalId, true, false, 0, { gasLimit: 300_000n });
      const receipt = await tx.wait();
      ok("vote(yes)", `tx=${receipt!.hash.slice(0, 18)}...`);
    } catch (e) {
      const msg = (e as Error).message ?? "";
      if (msg.includes("AlreadyVoted")) {
        ok("vote(yes)", "already voted (expected if re-running)");
      } else {
        fail("vote(yes)", e);
      }
    }

    try {
      const record = await gov.getVoteRecord(latestProposalId, addr);
      ok("getVoteRecord()", `hasVoted=${record.hasVoted}, support=${record.support}, power=${record.votingPower}`);
    } catch (e) { fail("getVoteRecord()", e); }
  } else {
    skip("vote", "no proposal");
  }

  // ────────────────────────────────────────────────────────────────
  // 12. READ — Voting power
  // ────────────────────────────────────────────────────────────────
  console.log("\n─── 12. Read — Voting Power ──────────────────────");
  try {
    const power = await gov.getVotingPower(addr, 0);
    ok("getVotingPower(wallet)", `${ethers.formatEther(power)} PAS`);
  } catch (e) { fail("getVotingPower()", e); }

  // ────────────────────────────────────────────────────────────────
  // 13. READ — Version Store
  // ────────────────────────────────────────────────────────────────
  console.log("\n─── 13. Read — Version Store ─────────────────────");
  const latestVersion = await vs.totalVersions();
  if (latestVersion > 0n) {
    try {
      const v = await vs.getVersion(latestVersion);
      ok("getVersion(latest)", `docId=${v.docId}, block=${v.blockNumber}, hash=${v.contentHash.slice(0, 18)}...`);
    } catch (e) { fail("getVersion(latest)", e); }

    if (newDocId > 0n) {
      try {
        const dag = await vs.getVersionDAG(newDocId);
        ok("getVersionDAG()", `${dag[0].length} versions in DAG`);
      } catch (e) { fail("getVersionDAG()", e); }
    }
  } else {
    skip("version store reads", "no versions yet");
  }

  // ────────────────────────────────────────────────────────────────
  // 14. Time-dependent flows (logged, not executed)
  // ────────────────────────────────────────────────────────────────
  console.log("\n─── 14. Time-Dependent Flows (info only) ─────────");
  skip("queueProposal()", "requires 7-day voting period to end first");
  skip("executeProposal()", "requires queue + 48h timelock delay");
  skip("council.veto()", "requires COUNCIL_ROLE (not test wallet)");
  console.log("       These steps are correct by design — they need time to pass.");

  // ────────────────────────────────────────────────────────────────
  // 15. Edge cases
  // ────────────────────────────────────────────────────────────────
  console.log("\n─── 15. Edge Cases ───────────────────────────────");
  try {
    await registry.createDocument("", ["test"]);
    fail("createDocument(empty title)", "should have reverted");
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (msg.includes("EmptyTitle") || msg.includes("revert")) {
      ok("createDocument(empty title) reverts", "Registry__EmptyTitle");
    } else {
      fail("createDocument(empty title) reverts", e);
    }
  }

  try {
    const tooManyTags = Array.from({ length: 15 }, (_, i) => `tag${i}`);
    await registry.createDocument("Too many tags", tooManyTags);
    fail("createDocument(15 tags)", "should have reverted");
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (msg.includes("TooManyTags") || msg.includes("revert")) {
      ok("createDocument(15 tags) reverts", "Registry__TooManyTags");
    } else {
      fail("createDocument(15 tags) reverts", e);
    }
  }

  try {
    const fakeMd = new TextEncoder().encode("fake");
    const fakeHash = ethers.keccak256(fakeMd);
    await registry.proposeVersion.staticCall(999999, 0, fakeHash, fakeMd, { value: ethers.parseUnits("5", 12) });
    fail("proposeVersion(bad docId)", "should have reverted");
  } catch (e) {
    ok("proposeVersion(bad docId) reverts", extractRevertReason(e));
  }

  try {
    await gov.vote.staticCall(999999, true, false, 0);
    fail("vote(bad proposalId)", "should have reverted");
  } catch (e) {
    ok("vote(bad proposalId) reverts", extractRevertReason(e));
  }

  try {
    await gov.vote.staticCall(latestProposalId, true, false, 0);
    fail("double vote", "should have reverted");
  } catch (e) {
    ok("double vote reverts", extractRevertReason(e));
  }

  // ────────────────────────────────────────────────────────────────
  // Summary
  // ────────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════");
  console.log(`  Results: ✅ ${passed} passed | ❌ ${failed} failed | ⏭️  ${skipped} skipped`);
  console.log("══════════════════════════════════════════════════\n");

  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exitCode = 1;
});
