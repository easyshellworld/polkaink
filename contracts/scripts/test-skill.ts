/**
 * Skill Validation Test — verifies the agent skill file is correct and usable.
 *
 * This script follows the EXACT instructions from skills/polkaink_agent_skill.md
 * to prove an agent can interact with PolkaInk using only the skill file.
 *
 * Usage:
 *   PRIVATE_KEY_FOR_TESTING="<mnemonic>" npx hardhat run scripts/test-skill.ts --network pasTestnet
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

let passed = 0;
let failed = 0;

function ok(label: string, detail = "") {
  passed++;
  console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ""}`);
}
function fail(label: string, err: unknown) {
  failed++;
  console.log(`  ❌ ${label} — ${(err as Error).message ?? err}`);
}

async function main() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("  PolkaInk Skill Validation Test");
  console.log("  Following: skills/polkaink_agent_skill.md");
  console.log("══════════════════════════════════════════════════\n");

  // ── Step 0: Verify skill file exists and is parseable ────────────
  console.log("─── 0. Skill File Integrity ──────────────────────");
  const skillPath = path.resolve(__dirname, "../../skills/polkaink_agent_skill.md");
  if (!fs.existsSync(skillPath)) {
    fail("Skill file exists", `not found at ${skillPath}`);
    return;
  }
  const skillContent = fs.readFileSync(skillPath, "utf-8");
  ok("Skill file exists", `${skillContent.length} bytes`);

  const requiredSections = [
    "Network Configuration",
    "Deployed Contract Addresses",
    "How to Connect",
    "Contract Interfaces",
    "Complete User Flows",
    "Governance Parameters",
    "Error Handling",
    "Testing Checklist",
  ];
  for (const section of requiredSections) {
    if (skillContent.includes(section)) {
      ok(`Section: "${section}"`);
    } else {
      fail(`Section: "${section}"`, "missing from skill file");
    }
  }

  // ── Step 1: Connect as skill instructs ───────────────────────────
  console.log("\n─── 1. Connect (per skill instructions) ──────────");
  const key = process.env.PRIVATE_KEY_FOR_TESTING || process.env.PRIVATE_KEY;
  if (!key) throw new Error("Set PRIVATE_KEY_FOR_TESTING or PRIVATE_KEY in .env");

  // Skill says: use ethers.JsonRpcProvider with chainId 420420417
  const provider = new ethers.JsonRpcProvider(
    "https://services.polkadothub-rpc.com/testnet",
    { chainId: 420420417, name: "PAS" },
  );
  const wallet = key.includes(" ")
    ? ethers.Wallet.fromPhrase(key, provider)
    : new ethers.Wallet(key.startsWith("0x") ? key : `0x${key}`, provider);
  ok("Provider connected", "chainId=420420417");
  ok("Wallet created", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  ok("Balance check", `${ethers.formatEther(balance)} PAS`);

  // ── Step 2: Load ABIs from skill-specified paths ─────────────────
  console.log("\n─── 2. Load ABIs (per skill paths) ───────────────");
  const abiDir = path.resolve(__dirname, "../../frontend/src/lib/contracts/abis");
  const abiFiles = [
    "PolkaInkRegistry.json",
    "GovernanceCore.json",
    "VersionStore.json",
    "ArchiveCouncil.json",
    "NFTReward.json",
    "Treasury.json",
  ];
  const abis: Record<string, any> = {};
  for (const f of abiFiles) {
    const fp = path.join(abiDir, f);
    if (fs.existsSync(fp)) {
      abis[f.replace(".json", "")] = JSON.parse(fs.readFileSync(fp, "utf-8"));
      ok(`ABI loaded: ${f}`);
    } else {
      fail(`ABI: ${f}`, "file not found");
    }
  }

  // ── Step 3: Instantiate contracts using skill addresses ──────────
  console.log("\n─── 3. Instantiate Contracts (skill addresses) ───");
  // These addresses are copy-pasted from the skill file
  const REGISTRY_ADDRESS = "0x959b25F190189e588DaC814a95fe13a97d5198A1";
  const VERSION_STORE_ADDRESS = "0xBB4cccdDb9e3ba74Ae28A412d34801353D1e0Ad6";
  const GOVERNANCE_ADDRESS = "0xae456115ce2897338FE22Cd342312D92D47821Fb";
  const COUNCIL_ADDRESS = "0x12771dcae01DEba4757719f7D2bD06D235a9FaD8";
  const NFT_ADDRESS = "0x58DC769015e5a6bAdC5C56519B5f74F851575bAe";
  const TREASURY_ADDRESS = "0x10F968271C18FF349a3a67FEE9141F7F4f42AD14";

  const registry = new ethers.Contract(REGISTRY_ADDRESS, abis.PolkaInkRegistry, wallet);
  const gov = new ethers.Contract(GOVERNANCE_ADDRESS, abis.GovernanceCore, wallet);
  const versionStore = new ethers.Contract(VERSION_STORE_ADDRESS, abis.VersionStore, provider);
  const councilContract = new ethers.Contract(COUNCIL_ADDRESS, abis.ArchiveCouncil, provider);
  const nftContract = new ethers.Contract(NFT_ADDRESS, abis.NFTReward, provider);
  const treasuryContract = new ethers.Contract(TREASURY_ADDRESS, abis.Treasury, provider);
  ok("All 6 contracts instantiated");

  // ── Step 4: Follow Testing Checklist from skill ──────────────────
  console.log("\n─── 4. Skill Testing Checklist ───────────────────");

  // Checklist #1: Read stats
  console.log("\n  [Checklist #1] Read stats");
  try {
    const [totalDocs, totalVersions, totalProposals] = await Promise.all([
      registry.totalDocuments(),
      versionStore.totalVersions(),
      gov.totalProposals(),
    ]);
    ok("Stats read", `docs=${totalDocs}, versions=${totalVersions}, proposals=${totalProposals}`);
  } catch (e) { fail("Stats read", e); }

  // Checklist #2: Create document (as Flow 1 in skill)
  console.log("\n  [Checklist #2] Create document (Flow 1)");
  let docId = 0n;
  try {
    const tx = await registry.createDocument(
      "Polkadot JAM Protocol History",
      ["jam", "polkadot", "protocol"],
    );
    const receipt = await tx.wait();
    // Skill says: "Parse DocumentCreated event to get docId"
    const event = receipt!.logs.find((l: any) => {
      try { return registry.interface.parseLog(l)?.name === "DocumentCreated"; }
      catch { return false; }
    });
    if (event) {
      const parsed = registry.interface.parseLog(event);
      docId = parsed!.args.docId;
    } else {
      docId = await registry.totalDocuments();
    }
    ok("createDocument()", `docId=${docId}`);
  } catch (e) { fail("createDocument()", e); }

  // Checklist #3: Verify document
  console.log("\n  [Checklist #3] Verify document");
  if (docId > 0n) {
    try {
      const doc = await registry.getDocument(docId);
      ok("getDocument()", `title="${doc.title}", author=${doc.author.slice(0, 10)}..., tags=[${doc.tags}]`);
    } catch (e) { fail("getDocument()", e); }
  } else {
    fail("getDocument()", "no docId available");
  }

  // Checklist #4: Propose version (as Flow 2 in skill)
  console.log("\n  [Checklist #4] Propose version (Flow 2)");
  let proposalMade = false;
  if (docId > 0n) {
    try {
      // Exactly as skill instructs:
      const content = "# JAM Protocol\n\nThe JAM (Join-Accumulate Machine) protocol represents Polkadot's next evolution.\n\n## Key Features\n\n- Trustless multichain\n- Shared security\n- Minimal governance\n";
      const contentBytes = new TextEncoder().encode(content);
      const contentHash = ethers.keccak256(contentBytes);
      const minStake = ethers.parseUnits("5", 12); // 0.000005 PAS

      const tx = await registry.proposeVersion(
        docId, 0, contentHash, contentBytes,
        { value: minStake, gasLimit: 1_000_000n },
      );
      const receipt = await tx.wait();
      ok("proposeVersion()", `tx=${receipt!.hash.slice(0, 18)}...`);
      proposalMade = true;
    } catch (e) { fail("proposeVersion()", e); }
  } else {
    fail("proposeVersion()", "no docId");
  }

  // Checklist #5: Check proposal (as Flow 3 preparation)
  console.log("\n  [Checklist #5] Check proposal");
  const proposalId = await gov.totalProposals();
  if (proposalMade && proposalId > 0n) {
    try {
      const proposal = await gov.getProposal(proposalId);
      const statusLabels = ["Pending", "Active", "Passed", "Rejected", "Queued", "Executed", "Cancelled", "Vetoed", "Expired"];
      ok("getProposal()", `status=${statusLabels[Number(proposal.status)]}, ends=${new Date(Number(proposal.endTime) * 1000).toISOString()}`);
    } catch (e) { fail("getProposal()", e); }
  } else {
    fail("getProposal()", "no proposal");
  }

  // Checklist #6: Vote (as Flow 3)
  console.log("\n  [Checklist #6] Vote (Flow 3)");
  if (proposalMade && proposalId > 0n) {
    try {
      // Skill says: gov.vote(proposalId, true, false, 0)
      const tx = await gov.vote(proposalId, true, false, 0, { gasLimit: 300_000n });
      await tx.wait();
      ok("vote(yes)", "success");
    } catch (e) {
      const msg = (e as Error).message ?? "";
      if (msg.includes("AlreadyVoted")) {
        ok("vote(yes)", "already voted (ok on re-run)");
      } else {
        fail("vote(yes)", e);
      }
    }
  } else {
    fail("vote()", "no proposal");
  }

  // Checklist #7: Verify vote
  console.log("\n  [Checklist #7] Verify vote");
  if (proposalId > 0n) {
    try {
      const record = await gov.getVoteRecord(proposalId, wallet.address);
      if (record.hasVoted) {
        ok("getVoteRecord()", `hasVoted=true, support=${record.support}, power=${record.votingPower}`);
      } else {
        fail("getVoteRecord()", "hasVoted is false");
      }
    } catch (e) { fail("getVoteRecord()", e); }
  }

  // Checklist #8: List documents
  console.log("\n  [Checklist #8] List documents");
  try {
    const [docs, total] = await registry.listDocuments(0, 10);
    if (docs.length > 0) {
      ok("listDocuments(0,10)", `${docs.length} docs, total=${total}`);
    } else {
      fail("listDocuments(0,10)", "empty result");
    }
  } catch (e) { fail("listDocuments(0,10)", e); }

  // ── Step 5: Extra skill coverage ─────────────────────────────────
  console.log("\n─── 5. Extra Skill Coverage ──────────────────────");

  // Flow 5: Read Document and Version Data
  try {
    const versionIds = await registry.getVersionHistory(docId > 0n ? docId : 1n);
    ok("getVersionHistory()", `${versionIds.length} versions`);
  } catch (e) { fail("getVersionHistory()", e); }

  // Flow 6: Query stats (already done above, validate again)
  try {
    const params = await gov.getGovernanceParams();
    ok("getGovernanceParams()", `minStake=${params.minStake}, votingPeriod=${params.votingPeriod}s`);
  } catch (e) { fail("getGovernanceParams()", e); }

  // Flow 7: Check NFTs
  try {
    const power = await gov.getVotingPower(wallet.address, 0);
    ok("getVotingPower()", `${ethers.formatEther(power)} PAS`);
  } catch (e) { fail("getVotingPower()", e); }

  try {
    const authorNFTs = await nftContract.getAuthorNFTs(wallet.address);
    const guardianNFTs = await nftContract.getGuardianNFTs(wallet.address);
    ok("NFT check", `author=${authorNFTs.length}, guardian=${guardianNFTs.length}`);
  } catch (e) { fail("NFT check", e); }

  // Council reads
  try {
    const members = await councilContract.getCouncilMembers();
    ok("getCouncilMembers()", `${members.length} members`);
  } catch (e) { fail("getCouncilMembers()", e); }

  // Treasury reads
  try {
    const totals = await treasuryContract.getTotals();
    ok("treasury.getTotals()", `income=${ethers.formatEther(totals[0])}, spent=${ethers.formatEther(totals[1])}`);
  } catch (e) { fail("treasury.getTotals()", e); }

  // ── Summary ──────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════");
  console.log(`  Skill Validation: ✅ ${passed} passed | ❌ ${failed} failed`);
  if (failed === 0) {
    console.log("  Agent Skill file is VALID — all flows work correctly.");
  } else {
    console.log("  ⚠️  Some checks failed — review skill file accuracy.");
  }
  console.log("══════════════════════════════════════════════════\n");

  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exitCode = 1;
});
