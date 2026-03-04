/**
 * PolkaInk v2 — Comprehensive E2E Test on PAS Testnet
 *
 * Uses real wallets #3, #4, #5 against deployed contracts.
 * Run: npx hardhat test test/e2e/fullE2E.test.ts --network pasTestnet
 */
import { expect } from "chai";
import { ethers } from "hardhat";
import type { Signer } from "ethers";

const ADDRS = {
  PolkaInkRegistry: "0x8b83a928C0B60CF3d197aff68Da48FC2Db8B2Ad1",
  VersionStore:     "0x5ACD32f19D26fcEc72ac96C7515a0075BA0FA8fa",
  GovernanceCore:   "0x68839E647AAe54D788BA9cD1aEC87190C7e3999e",
  TimelockController: "0xc946D5e4A4792FFB1cf435714580c935a01f6A11",
  NFTReward:        "0xe9920328718373b710845B756b29086591DCBdcb",
  Treasury:         "0x145A2B388d66d960F026DCEa09942bC8a9d9B190",
  StakingManager:   "0xd8Ea01112F866D4b17f4E92e02A9edCb939B4B71",
  ReportManager:    "0x4972c8104D838A9AEfe2AcBAC6bA114022f16c6B",
};

const PK3 = "0xa6953e8632e0261b59ee98b9e65aa0b229dc97336734d0d9ae95ca2a158896be";
const PK4 = "0x6a9ef2e57524421eb3f19c8a1397287712e1d33b0202506b13291678b374524a";
const PK5 = "0xada13a1d8ab59fe26f4e74f79fdab0b00a5be301f4a6eaa3aae3dc5abcfdd24a";

const STAKE_AMOUNT = ethers.parseEther("88");
const GAS = 1_000_000n;

async function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function sendTx(fn: () => Promise<any>, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const tx = await fn();
      const receipt = await Promise.race([
        tx.wait(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("tx.wait timeout (60s)")), 60_000)),
      ]);
      if (receipt && (receipt as any).status === 0) {
        throw new Error("Transaction reverted on-chain (receipt.status=0)");
      }
      return receipt;
    } catch (e: any) {
      const msg = e.message || String(e);
      if (msg.includes("Priority is too low") || msg.includes("nonce") || msg.includes("tx.wait timeout")) {
        console.log(`      Retry ${i + 1}/${retries}: ${msg.slice(0, 60)}...`);
        await wait(5000);
        continue;
      }
      throw e;
    }
  }
  throw new Error("Max retries exceeded");
}

async function expectRevert(fn: () => Promise<any>): Promise<boolean> {
  try {
    await fn();
    return false; // did NOT revert
  } catch {
    return true; // reverted
  }
}

describe("PolkaInk v2 — Full E2E on PAS Testnet", function () {
  this.timeout(600_000);

  let deployer: Signer;
  let wallet3: Signer, wallet4: Signer, wallet5: Signer;
  let addr3: string, addr4: string, addr5: string, addrDeployer: string;

  let staking: any, nftReward: any, registry: any;
  let governance: any, treasury: any, reportManager: any, versionStore: any;

  let docId1 = 0n, docId2 = 0n;
  let proposalId1 = 0n, proposalId2 = 0n;

  before(async function () {
    const provider = ethers.provider;
    [deployer] = await ethers.getSigners();
    addrDeployer = await deployer.getAddress();

    wallet3 = new ethers.Wallet(PK3, provider);
    wallet4 = new ethers.Wallet(PK4, provider);
    wallet5 = new ethers.Wallet(PK5, provider);
    addr3 = await wallet3.getAddress();
    addr4 = await wallet4.getAddress();
    addr5 = await wallet5.getAddress();

    console.log("  Deployer:", addrDeployer);
    console.log("  Wallet#3:", addr3);
    console.log("  Wallet#4:", addr4);
    console.log("  Wallet#5:", addr5);

    for (const [l, w] of [["#3", wallet3], ["#4", wallet4], ["#5", wallet5], ["Deployer", deployer]] as const) {
      const bal = await provider.getBalance(await (w as Signer).getAddress());
      console.log(`  Balance ${l}: ${ethers.formatEther(bal)} PAS`);
    }

    const f = async (name: string) => (await ethers.getContractFactory(name)).attach((ADDRS as any)[name]);
    staking = await f("StakingManager");
    nftReward = await f("NFTReward");
    registry = await f("PolkaInkRegistry");
    governance = await f("GovernanceCore");
    treasury = await f("Treasury");
    reportManager = await f("ReportManager");
    versionStore = await f("VersionStore");
  });

  // ═══ 1. STAKING ════════════════════════════════════════════════════
  describe("1. StakingManager", function () {
    it("Wallet#3 stakes 88 DOT (3 months)", async function () {
      if ((await staking.getStake(addr3)).active) { console.log("    Already staked"); this.skip(); }
      const r = await sendTx(() => staking.connect(wallet3).stake(3, { value: STAKE_AMOUNT, gasLimit: GAS }));
      console.log("    Tx:", r.hash);
      await wait(1000);
    });

    it("Wallet#4 stakes 88 DOT (6 months)", async function () {
      if ((await staking.getStake(addr4)).active) { console.log("    Already staked"); this.skip(); }
      const r = await sendTx(() => staking.connect(wallet4).stake(6, { value: STAKE_AMOUNT, gasLimit: GAS }));
      console.log("    Tx:", r.hash);
      await wait(1000);
    });

    it("Wallet#5 stakes 88 DOT (12 months)", async function () {
      if ((await staking.getStake(addr5)).active) { console.log("    Already staked"); this.skip(); }
      const r = await sendTx(() => staking.connect(wallet5).stake(12, { value: STAKE_AMOUNT, gasLimit: GAS }));
      console.log("    Tx:", r.hash);
      await wait(1000);
    });

    it("all 3 wallets are active members", async function () {
      expect(await staking.isActiveMember(addr3)).to.be.true;
      expect(await staking.isActiveMember(addr4)).to.be.true;
      expect(await staking.isActiveMember(addr5)).to.be.true;
      console.log("    Active members:", (await staking.totalActiveMembers()).toString());
    });

    it("StakeInfo is correct", async function () {
      const i3 = await staking.getStake(addr3);
      expect(i3.amount).to.equal(STAKE_AMOUNT);
      expect([3, 6, 12, 24]).to.include(Number(i3.lockMonths));
      expect(i3.active).to.be.true;
      expect(i3.memberNFTId).to.be.greaterThan(0n);
      console.log("    #3: lockMonths=%d, nftId=%s", i3.lockMonths, i3.memberNFTId);

      const i4 = await staking.getStake(addr4);
      expect([3, 6, 12, 24]).to.include(Number(i4.lockMonths));

      const i5 = await staking.getStake(addr5);
      expect([3, 6, 12, 24]).to.include(Number(i5.lockMonths));
    });

    it("wrong amount reverts", async function () {
      const reverted = await expectRevert(
        () => staking.connect(wallet3).stake.staticCall(3, { value: ethers.parseEther("10"), gasLimit: GAS })
      );
      expect(reverted).to.be.true;
    });

    it("invalid lock months reverts", async function () {
      const reverted = await expectRevert(
        () => staking.connect(wallet3).stake.staticCall(5, { value: STAKE_AMOUNT, gasLimit: GAS })
      );
      expect(reverted).to.be.true;
    });

    it("double stake reverts", async function () {
      const reverted = await expectRevert(
        () => staking.connect(wallet3).stake.staticCall(3, { value: STAKE_AMOUNT, gasLimit: GAS })
      );
      expect(reverted).to.be.true;
    });

    it("unstake before lock expiry reverts", async function () {
      const reverted = await expectRevert(
        () => staking.connect(wallet3).unstake.staticCall({ gasLimit: GAS })
      );
      expect(reverted).to.be.true;
    });
  });

  // ═══ 2. NFTReward ══════════════════════════════════════════════════
  describe("2. NFTReward — Member + OG NFTs", function () {
    it("Member NFTs are active for all stakers", async function () {
      expect(await nftReward.hasActiveMember(addr3)).to.be.true;
      expect(await nftReward.hasActiveMember(addr4)).to.be.true;
      expect(await nftReward.hasActiveMember(addr5)).to.be.true;
    });

    it("Member NFT metadata is correct", async function () {
      const i = await staking.getStake(addr3);
      const m = await nftReward.getNFTMetadata(i.memberNFTId);
      expect(m.nftType).to.equal(0); // Member
      expect(m.holder).to.equal(addr3);
      expect(m.active).to.be.true;
    });

    it("Admin mints OG Bronze for #3", async function () {
      if ((await nftReward.ogCount(addr3, 3)) > 0n) { console.log("    Already has OG Bronze"); this.skip(); }
      await sendTx(() => nftReward.connect(deployer).mintOGNFT(addr3, 3, { gasLimit: GAS }));
      expect(await nftReward.ogCount(addr3, 3)).to.be.greaterThan(0n);
      await wait(1000);
    });

    it("Admin mints OG Silver for #4", async function () {
      if ((await nftReward.ogCount(addr4, 4)) > 0n) { console.log("    Already has OG Silver"); this.skip(); }
      await sendTx(() => nftReward.connect(deployer).mintOGNFT(addr4, 4, { gasLimit: GAS }));
      expect(await nftReward.ogCount(addr4, 4)).to.be.greaterThan(0n);
      await wait(1000);
    });

    it("Admin mints OG Gold for #5", async function () {
      if (await nftReward.hasActiveOGGold(addr5)) { console.log("    Already has OG Gold"); this.skip(); }
      await sendTx(() => nftReward.connect(deployer).mintOGNFT(addr5, 5, { gasLimit: GAS }));
      expect(await nftReward.hasActiveOGGold(addr5)).to.be.true;
      await wait(1000);
    });

    it("OG Gold cap (max 1) enforced", async function () {
      if (!(await nftReward.hasActiveOGGold(addr5))) this.skip();
      const reverted = await expectRevert(
        () => nftReward.connect(deployer).mintOGNFT.staticCall(addr5, 5, { gasLimit: GAS })
      );
      expect(reverted).to.be.true;
    });

    it("NFTs are soulbound (transfer reverts)", async function () {
      const nfts = await nftReward.getNFTsByHolder(addr3);
      if (nfts.length === 0) this.skip();
      const reverted = await expectRevert(
        () => nftReward.connect(wallet3).transferFrom.staticCall(addr3, addr4, nfts[0], { gasLimit: GAS })
      );
      expect(reverted).to.be.true;
    });

    it("tokenURI returns valid JSON", async function () {
      const i = await staking.getStake(addr3);
      const uri = await nftReward.tokenURI(i.memberNFTId);
      expect(uri).to.contain("data:application/json");
      expect(uri).to.contain("Member");
      console.log("    URI:", uri.slice(0, 80) + "...");
    });

    it("lists all NFTs for holder", async function () {
      const nfts = await nftReward.getNFTsByHolder(addr3);
      console.log("    #3 total NFTs:", nfts.length);
      expect(nfts.length).to.be.greaterThan(0);
      const types = ["Member", "Creator", "Author", "OGBronze", "OGSilver", "OGGold"];
      for (const id of nfts) {
        const m = await nftReward.getNFTMetadata(id);
        console.log(`      NFT#${id}: ${types[m.nftType]} active=${m.active}`);
      }
    });
  });

  // ═══ 3. DOCUMENTS ══════════════════════════════════════════════════
  describe("3. PolkaInkRegistry — Documents", function () {
    it("Wallet#3 creates document", async function () {
      const totalBefore = await registry.totalDocuments();
      await wait(2000);
      const r = await sendTx(() => registry.connect(wallet3).createDocument(
        "E2E Test by Wallet3 " + Date.now(),
        ["e2e", "test"],
        { gasLimit: GAS }
      ));
      console.log("    Tx:", r.hash);
      docId1 = (await registry.totalDocuments());
      console.log("    Doc#1 ID:", docId1.toString());
      expect(docId1).to.be.greaterThan(totalBefore);
      await wait(1000);
    });

    it("document data is correct", async function () {
      if (docId1 === 0n) this.skip();
      const d = await registry.getDocument(docId1);
      expect(d.author).to.equal(addr3);
      expect(d.status).to.equal(0); // Active
      expect(d.tags.length).to.equal(2);
      console.log("    Title:", d.title, "Tags:", d.tags.join(","));
    });

    it("Author NFT minted for #3", async function () {
      if (docId1 === 0n) this.skip();
      expect(await nftReward.isAuthorOf(addr3, docId1)).to.be.true;
    });

    it("Wallet#4 creates document", async function () {
      await wait(2000);
      const r = await sendTx(() => registry.connect(wallet4).createDocument(
        "E2E Test by Wallet4 " + Date.now(),
        ["e2e", "governance"],
        { gasLimit: GAS }
      ));
      docId2 = await registry.totalDocuments();
      console.log("    Doc#2 ID:", docId2.toString());
      const doc2 = await registry.getDocument(docId2);
      expect(doc2.author).to.equal(addr4);
      await wait(1000);
    });

    it("non-member cannot create document (staticCall revert)", async function () {
      const reverted = await expectRevert(
        () => registry.connect(deployer).createDocument.staticCall("Fail", [], { gasLimit: GAS })
      );
      expect(reverted).to.be.true;
    });

    it("totalDocuments and listDocuments", async function () {
      const total = await registry.totalDocuments();
      console.log("    Total docs:", total.toString());
      expect(total).to.be.greaterThanOrEqual(2n);
      const [docs] = await registry.listDocuments(0, 10);
      expect(docs.length).to.be.greaterThan(0);
    });

    it("listDocumentsByTag", async function () {
      const [, total] = await registry.listDocumentsByTag("e2e", 0, 10);
      console.log("    Docs tagged 'e2e':", total.toString());
      expect(total).to.be.greaterThanOrEqual(1n);
    });
  });

  // ═══ 4. PROPOSALS ══════════════════════════════════════════════════
  describe("4. GovernanceCore — Proposals", function () {
    it("Wallet#3 proposeVersion on Doc#1", async function () {
      if (docId1 === 0n) this.skip();
      await wait(2000);
      const c = ethers.toUtf8Bytes("# E2E Content\n\nTest " + Date.now());
      const r = await sendTx(() => registry.connect(wallet3).proposeVersion(
        docId1, 0, ethers.keccak256(c), ethers.hexlify(c),
        { gasLimit: GAS }
      ));
      proposalId1 = await governance.totalProposals();
      console.log("    Proposal#1 ID:", proposalId1.toString(), "Tx:", r.hash);
      await wait(1000);
    });

    it("proposal state is correct", async function () {
      if (proposalId1 === 0n) this.skip();
      const p = await governance.getProposal(proposalId1);
      expect(p.status).to.equal(0); // Active
      expect(p.proposer).to.equal(addr3);
      expect(p.docId).to.equal(docId1);
      expect(p.goldVetoed).to.be.false;
      expect(p.score).to.equal(0n);
      console.log("    End:", new Date(Number(p.endTime) * 1000).toISOString());
    });

    it("Wallet#4 proposeVersion on Doc#2 (veto target)", async function () {
      if (docId2 === 0n) this.skip();
      await wait(2000);
      const c = ethers.toUtf8Bytes("# Veto target " + Date.now());
      const r = await sendTx(() => registry.connect(wallet4).proposeVersion(
        docId2, 0, ethers.keccak256(c), ethers.hexlify(c),
        { gasLimit: GAS }
      ));
      proposalId2 = await governance.totalProposals();
      console.log("    Proposal#2 ID:", proposalId2.toString());
      await wait(1000);
    });
  });

  // ═══ 5. VOTING ═════════════════════════════════════════════════════
  describe("5. Voting on Proposal#1", function () {
    it("#3 votes YES", async function () {
      if (proposalId1 === 0n) this.skip();
      const vr = await governance.getVoteRecord(proposalId1, addr3);
      if (vr.hasVoted) { console.log("    Already voted"); this.skip(); }
      await wait(2000);
      const r = await sendTx(() => governance.connect(wallet3).vote(proposalId1, 0, { gasLimit: GAS }));
      console.log("    Tx:", r.hash);
      await wait(1000);
    });

    it("#3 vote record", async function () {
      if (proposalId1 === 0n) this.skip();
      const vr = await governance.getVoteRecord(proposalId1, addr3);
      expect(vr.hasVoted).to.be.true;
      expect(vr.choice).to.equal(0); // Yes
      expect(vr.weight).to.be.greaterThan(0n);
      console.log("    Weight:", ethers.formatEther(vr.weight));
    });

    it("#4 votes YES", async function () {
      if (proposalId1 === 0n) this.skip();
      const vr = await governance.getVoteRecord(proposalId1, addr4);
      if (vr.hasVoted) { console.log("    Already voted"); this.skip(); }
      await wait(2000);
      await sendTx(() => governance.connect(wallet4).vote(proposalId1, 0, { gasLimit: GAS }));
      await wait(1000);
    });

    it("#5 votes ABSTAIN", async function () {
      if (proposalId1 === 0n) this.skip();
      const vr = await governance.getVoteRecord(proposalId1, addr5);
      if (vr.hasVoted) { console.log("    Already voted"); this.skip(); }
      await wait(2000);
      await sendTx(() => governance.connect(wallet5).vote(proposalId1, 2, { gasLimit: GAS }));
      await wait(1000);
    });

    it("score is positive, not vetoed", async function () {
      if (proposalId1 === 0n) this.skip();
      const p = await governance.getProposal(proposalId1);
      console.log("    Score:", ethers.formatEther(p.score), "noVoters:", p.noVoterCount.toString());
      expect(p.score).to.be.greaterThan(0n);
      expect(p.goldVetoed).to.be.false;
      expect(p.status).to.equal(0); // Still Active
    });

    it("double vote reverts", async function () {
      if (proposalId1 === 0n) this.skip();
      const reverted = await expectRevert(
        () => governance.connect(wallet3).vote.staticCall(proposalId1, 0, { gasLimit: GAS })
      );
      expect(reverted).to.be.true;
    });

    it("finalizeProposal reverts (voting period not ended)", async function () {
      if (proposalId1 === 0n) this.skip();
      const reverted = await expectRevert(
        () => governance.connect(wallet3).finalizeProposal.staticCall(proposalId1, { gasLimit: GAS })
      );
      expect(reverted).to.be.true;
    });
  });

  // ═══ 6. OG GOLD VETO ══════════════════════════════════════════════
  describe("6. OG Gold Veto on Proposal#2", function () {
    it("#5 (OG Gold) votes NO → instant veto", async function () {
      if (proposalId2 === 0n) this.skip();
      const vr = await governance.getVoteRecord(proposalId2, addr5);
      if (vr.hasVoted) { console.log("    Already voted"); this.skip(); }
      await wait(2000);
      const r = await sendTx(() => governance.connect(wallet5).vote(proposalId2, 1, { gasLimit: GAS }));
      console.log("    Veto tx:", r.hash);
    });

    it("proposal is Vetoed", async function () {
      if (proposalId2 === 0n) this.skip();
      const p = await governance.getProposal(proposalId2);
      expect(p.goldVetoed).to.be.true;
      expect(p.status).to.equal(3); // Vetoed
      console.log("    Status: Vetoed, goldVetoed:", p.goldVetoed);
    });

    it("voting on vetoed proposal reverts", async function () {
      if (proposalId2 === 0n) this.skip();
      const reverted = await expectRevert(
        () => governance.connect(wallet3).vote.staticCall(proposalId2, 0, { gasLimit: GAS })
      );
      expect(reverted).to.be.true;
    });
  });

  // ═══ 7. VOTING WEIGHT ═════════════════════════════════════════════
  describe("7. Voting Weight Verification", function () {
    it("#3 weight: Author + OGBronze + 3mo lock", async function () {
      if (docId1 === 0n) this.skip();
      const w = Number(await governance.getVotingWeight(addr3, docId1)) / 1e18;
      console.log("    #3 weight:", w.toFixed(4));
      expect(w).to.be.greaterThan(1.0);
      expect(w).to.be.lessThan(2.5);
    });

    it("#4 weight: OGSilver + 6mo lock", async function () {
      if (docId1 === 0n) this.skip();
      const w = Number(await governance.getVotingWeight(addr4, docId1)) / 1e18;
      console.log("    #4 weight:", w.toFixed(4));
      expect(w).to.be.greaterThan(1.0);
    });

    it("#5 weight: OGGold + 12mo lock", async function () {
      if (docId1 === 0n) this.skip();
      const w = Number(await governance.getVotingWeight(addr5, docId1)) / 1e18;
      console.log("    #5 weight:", w.toFixed(4));
      expect(w).to.be.greaterThan(1.0);
    });

    it("non-member has zero weight", async function () {
      const w = await governance.getVotingWeight(addrDeployer, 1);
      expect(w).to.equal(0n);
    });
  });

  // ═══ 8. CANCEL PROPOSAL ═══════════════════════════════════════════
  describe("8. Cancel Proposal", function () {
    let cancelPid = 0n;

    it("#3 creates proposal to cancel", async function () {
      if (docId1 === 0n) this.skip();
      await wait(2000);
      const c = ethers.toUtf8Bytes("# Cancel me " + Date.now());
      await sendTx(() => registry.connect(wallet3).proposeVersion(
        docId1, 0, ethers.keccak256(c), ethers.hexlify(c), { gasLimit: GAS }
      ));
      cancelPid = await governance.totalProposals();
      console.log("    Cancel target ID:", cancelPid.toString());
      await wait(1000);
    });

    it("non-proposer cannot cancel", async function () {
      if (cancelPid === 0n) this.skip();
      const reverted = await expectRevert(
        () => governance.connect(wallet4).cancelProposal.staticCall(cancelPid, { gasLimit: GAS })
      );
      expect(reverted).to.be.true;
    });

    it("proposer cancels", async function () {
      if (cancelPid === 0n) this.skip();
      const before = await governance.getProposal(cancelPid);
      console.log("    Before cancel: status=%d proposer=%s", before.status, before.proposer);
      if (before.status !== 0n && before.status !== 0) {
        console.log("    Already non-Active, skip");
        this.skip();
      }
      await wait(3000);
      await governance.connect(wallet3).cancelProposal.staticCall(cancelPid, { gasLimit: GAS });
      await sendTx(() => governance.connect(wallet3).cancelProposal(cancelPid, { gasLimit: GAS }));
      await wait(2000);
      const p = await governance.getProposal(cancelPid);
      expect(p.status).to.equal(5); // Cancelled
      console.log("    Cancelled proposal#", cancelPid.toString());
    });
  });

  // ═══ 9. REPORT MANAGER ════════════════════════════════════════════
  describe("9. ReportManager", function () {
    it("report on doc without approved version reverts", async function () {
      if (docId1 === 0n) this.skip();
      const reverted = await expectRevert(
        () => reportManager.connect(wallet3).report.staticCall(docId1, { gasLimit: GAS })
      );
      expect(reverted).to.be.true;
    });

    it("getReportStatus returns empty for unreported doc", async function () {
      const rs = await reportManager.getReportStatus(999);
      expect(rs.frozen).to.be.false;
      expect(rs.finalized).to.be.false;
      console.log("    ReportStatus(999): reportCount=%s frozen=%s", rs.reportCount, rs.frozen);
    });

    it("Admin setThreshold works", async function () {
      if (docId1 === 0n) this.skip();
      await wait(2000);
      await sendTx(() => reportManager.connect(deployer).setThreshold(docId1, 2, { gasLimit: GAS }));
      const rs = await reportManager.getReportStatus(docId1);
      expect(rs.threshold).to.equal(3n); // max(3, floor(2*1.5))=3
      console.log("    Threshold for doc#%s:", docId1.toString(), rs.threshold.toString());
    });
  });

  // ═══ 10. TREASURY ══════════════════════════════════════════════════
  describe("10. Treasury", function () {
    it("read balance", async function () {
      const b = await ethers.provider.getBalance(ADDRS.Treasury);
      console.log("    Treasury:", ethers.formatEther(b), "PAS");
    });

    it("getTotals", async function () {
      const [income, spent] = await treasury.getTotals();
      console.log("    Income:", ethers.formatEther(income), "Spent:", ethers.formatEther(spent));
    });

    it("accepts direct PAS", async function () {
      const before = await ethers.provider.getBalance(ADDRS.Treasury);
      await sendTx(() => deployer.sendTransaction({
        to: ADDRS.Treasury, value: ethers.parseEther("0.01"), gasLimit: GAS,
      }));
      const after = await ethers.provider.getBalance(ADDRS.Treasury);
      expect(after).to.be.greaterThan(before);
      console.log("    After donation:", ethers.formatEther(after));
    });
  });

  // ═══ 11. EARLY UNSTAKE ════════════════════════════════════════════
  describe("11. Early Unstake (#3)", function () {
    it("earlyUnstake: 10% penalty to Treasury", async function () {
      if (!(await staking.getStake(addr3)).active) { console.log("    Not staked"); this.skip(); }
      const tBefore = await ethers.provider.getBalance(ADDRS.Treasury);
      await wait(2000);
      const r = await sendTx(() => staking.connect(wallet3).earlyUnstake({ gasLimit: GAS }));
      console.log("    Tx:", r.hash);
      const tAfter = await ethers.provider.getBalance(ADDRS.Treasury);
      const penalty = tAfter - tBefore;
      console.log("    Penalty to Treasury:", ethers.formatEther(penalty));
      expect(penalty).to.be.greaterThan(ethers.parseEther("8"));
    });

    it("#3 is no longer active member", async function () {
      expect(await staking.isActiveMember(addr3)).to.be.false;
    });

    it("#3 Member NFT deactivated", async function () {
      expect(await nftReward.hasActiveMember(addr3)).to.be.false;
    });

    it("#3 voting weight is now 0", async function () {
      const w = await governance.getVotingWeight(addr3, 1);
      expect(w).to.equal(0n);
    });
  });

  // ═══ 12. VERSION STORE ════════════════════════════════════════════
  describe("12. VersionStore", function () {
    it("totalVersions", async function () {
      const t = await versionStore.totalVersions();
      console.log("    Total versions:", t.toString());
      expect(t).to.be.greaterThan(0n);
    });

    it("latest version data", async function () {
      const t = await versionStore.totalVersions();
      if (t === 0n) this.skip();
      const v = await versionStore.getVersion(t);
      console.log("    Latest: docId=%s author=%s len=%s", v.docId, v.author, v.contentLength);
    });

    it("version DAG", async function () {
      if (docId1 === 0n) this.skip();
      const dag = await versionStore.getVersionDAG(docId1);
      console.log("    DAG for doc#%s: [%s]", docId1, dag.map((i: bigint) => i.toString()).join(","));
    });
  });

  // ═══ 13. GOVERNANCE READ ══════════════════════════════════════════
  describe("13. GovernanceCore — Read Operations", function () {
    it("list active proposals", async function () {
      const [ps, t] = await governance.listProposals(0, 0, 10);
      console.log("    Active:", t.toString());
      for (const p of ps) console.log(`      #${p.id}: score=${ethers.formatEther(p.score)}`);
    });

    it("list vetoed proposals", async function () {
      const [ps, t] = await governance.listProposals(3, 0, 10);
      console.log("    Vetoed:", t.toString());
      for (const p of ps) console.log(`      #${p.id}: goldVetoed=${p.goldVetoed}`);
    });

    it("list cancelled proposals", async function () {
      const [, t] = await governance.listProposals(5, 0, 10);
      console.log("    Cancelled:", t.toString());
    });
  });

  // ═══ 14. NFT COMPREHENSIVE ════════════════════════════════════════
  describe("14. NFT Comprehensive Query", function () {
    const TYPES = ["Member", "Creator", "Author", "OGBronze", "OGSilver", "OGGold"];

    for (const [label, addrFn] of [["#3", () => addr3], ["#4", () => addr4], ["#5", () => addr5]] as const) {
      it(`all NFT types for ${label}`, async function () {
        const a = addrFn();
        for (let t = 0; t < 6; t++) {
          const ns = await nftReward.getNFTsByType(a, t);
          if (ns.length > 0) console.log(`    ${label} ${TYPES[t]}: ${ns.length}`);
        }
      });
    }

    it("activeCreatorCount check", async function () {
      const c3 = await nftReward.activeCreatorCount(addr3);
      const c4 = await nftReward.activeCreatorCount(addr4);
      console.log(`    #3 creatorCount: ${c3}, #4 creatorCount: ${c4}`);
      expect(c3).to.be.greaterThanOrEqual(0n);
      expect(c4).to.be.greaterThanOrEqual(0n);
    });
  });

  // ═══ 15. RE-STAKE #3 ══════════════════════════════════════════════
  describe("15. Re-stake #3", function () {
    it("#3 re-stakes 88 DOT (6 months)", async function () {
      if ((await staking.getStake(addr3)).active) { console.log("    Already active"); this.skip(); }
      await wait(2000);
      await sendTx(() => staking.connect(wallet3).stake(6, { value: STAKE_AMOUNT, gasLimit: GAS }));
      expect(await staking.isActiveMember(addr3)).to.be.true;
      console.log("    Re-staked OK");
    });
  });

  // ═══ 16. OG GOLD REVOKE + RE-MINT ════════════════════════════════
  describe("16. OG Gold Revoke + Re-mint", function () {
    it("Admin revokes OG Gold", async function () {
      if (!(await nftReward.hasActiveOGGold(addr5))) { console.log("    No active OG Gold"); this.skip(); }
      const golds = await nftReward.getNFTsByType(addr5, 5);
      const tid = golds[golds.length - 1];
      await wait(2000);
      await sendTx(() => nftReward.connect(deployer).revokeOGGold(tid, { gasLimit: GAS }));
      const m = await nftReward.getNFTMetadata(tid);
      expect(m.active).to.be.false;
      console.log("    Revoked NFT#", tid.toString());
    });

    it("#5 no longer has active OG Gold", async function () {
      expect(await nftReward.hasActiveOGGold(addr5)).to.be.false;
    });

    it("Re-mint OG Gold for #5", async function () {
      await wait(2000);
      await sendTx(() => nftReward.connect(deployer).mintOGNFT(addr5, 5, { gasLimit: GAS }));
      expect(await nftReward.hasActiveOGGold(addr5)).to.be.true;
      console.log("    Re-minted OG Gold");
    });
  });

  // ═══ 17. FULL PROPOSAL LIFECYCLE (Approve → Execute → Merge) ═════
  describe("17. Full Proposal Lifecycle", function () {
    let lifecycleDocId = 0n;
    let lifecyclePid = 0n;
    let versionsBefore = 0n;
    let creatorCountBefore = 0n;

    it("Admin sets voting period to 120s", async function () {
      await sendTx(() => governance.connect(deployer).setVotingPeriod(120, { gasLimit: GAS }));
      const vp = await governance.getVotingPeriod();
      expect(vp).to.equal(120n);
      console.log("    Voting period set to", vp.toString(), "seconds");
    });

    it("#4 creates a fresh document for lifecycle test", async function () {
      await wait(2000);
      const r = await sendTx(() => registry.connect(wallet4).createDocument(
        "Lifecycle Test " + Date.now(),
        ["lifecycle", "pass-test"],
        { gasLimit: GAS }
      ));
      lifecycleDocId = await registry.totalDocuments();
      console.log("    Lifecycle docId:", lifecycleDocId.toString(), "Tx:", r.hash);
      expect(lifecycleDocId).to.be.greaterThan(0n);
      await wait(1000);
    });

    it("#4 proposes a version", async function () {
      if (lifecycleDocId === 0n) this.skip();
      versionsBefore = await versionStore.totalVersions();
      creatorCountBefore = await nftReward.activeCreatorCount(addr4);
      await wait(2000);
      const content = ethers.toUtf8Bytes("# Approved Version\n\nThis version will pass governance. " + Date.now());
      const r = await sendTx(() => registry.connect(wallet4).proposeVersion(
        lifecycleDocId, 0, ethers.keccak256(content), ethers.hexlify(content),
        { gasLimit: GAS }
      ));
      lifecyclePid = await governance.totalProposals();
      console.log("    Proposal ID:", lifecyclePid.toString(), "Tx:", r.hash);
      await wait(1000);
    });

    it("proposal is Active with 120s window", async function () {
      if (lifecyclePid === 0n) this.skip();
      const p = await governance.getProposal(lifecyclePid);
      expect(p.status).to.equal(0); // Active
      const duration = Number(p.endTime) - Number(p.startTime);
      expect(duration).to.equal(120);
      console.log("    endTime:", new Date(Number(p.endTime) * 1000).toISOString());
    });

    it("#3 votes YES", async function () {
      if (lifecyclePid === 0n) this.skip();
      await wait(2000);
      await sendTx(() => governance.connect(wallet3).vote(lifecyclePid, 0, { gasLimit: GAS }));
      console.log("    #3 voted YES");
      await wait(1000);
    });

    it("#4 votes YES", async function () {
      if (lifecyclePid === 0n) this.skip();
      await wait(2000);
      await sendTx(() => governance.connect(wallet4).vote(lifecyclePid, 0, { gasLimit: GAS }));
      console.log("    #4 voted YES");
      await wait(1000);
    });

    it("#5 votes YES", async function () {
      if (lifecyclePid === 0n) this.skip();
      await wait(2000);
      await sendTx(() => governance.connect(wallet5).vote(lifecyclePid, 0, { gasLimit: GAS }));
      console.log("    #5 voted YES");
    });

    it("score exceeds threshold (2.0)", async function () {
      if (lifecyclePid === 0n) this.skip();
      const p = await governance.getProposal(lifecyclePid);
      const score = Number(ethers.formatEther(p.score));
      console.log("    Score:", score.toFixed(4), "Threshold: 2.0");
      expect(score).to.be.greaterThan(2.0);
      expect(p.goldVetoed).to.be.false;
    });

    it("wait for voting period to end", async function () {
      this.timeout(300_000);
      if (lifecyclePid === 0n) this.skip();
      const p = await governance.getProposal(lifecyclePid);
      const endTime = Number(p.endTime);
      const block = await ethers.provider.getBlock("latest");
      const now = Number(block!.timestamp);
      const remaining = endTime - now;
      if (remaining > 0) {
        console.log("    Waiting %ds for voting period to end...", remaining + 10);
        await wait((remaining + 10) * 1000);
      } else {
        console.log("    Voting period already ended.");
      }
    });

    it("finalizeProposal → Approved", async function () {
      if (lifecyclePid === 0n) this.skip();
      await wait(3000);
      await sendTx(() => governance.connect(wallet3).finalizeProposal(lifecyclePid, { gasLimit: GAS }));
      const p = await governance.getProposal(lifecyclePid);
      expect(p.status).to.equal(1); // Approved
      console.log("    ✓ Proposal APPROVED! Score:", ethers.formatEther(p.score));
    });

    it("executeProposal → Executed + mergeProposal", async function () {
      if (lifecyclePid === 0n) this.skip();
      await wait(2000);
      const r = await sendTx(() => governance.connect(wallet4).executeProposal(lifecyclePid, { gasLimit: GAS }));
      const p = await governance.getProposal(lifecyclePid);
      expect(p.status).to.equal(4); // Executed
      console.log("    ✓ Proposal EXECUTED! Tx:", r.hash);
    });

    it("document currentVersionId updated", async function () {
      if (lifecycleDocId === 0n) this.skip();
      const doc = await registry.getDocument(lifecycleDocId);
      expect(doc.currentVersionId).to.be.greaterThan(0n);
      console.log("    currentVersionId:", doc.currentVersionId.toString());
    });

    it("Creator NFT minted for proposer (#4)", async function () {
      if (lifecyclePid === 0n) this.skip();
      const after = await nftReward.activeCreatorCount(addr4);
      console.log("    Creator count before=%s after=%s", creatorCountBefore, after);
      expect(after).to.be.greaterThan(creatorCountBefore);
      const creators = await nftReward.getNFTsByType(addr4, 1); // Creator type
      expect(creators.length).to.be.greaterThan(0);
      console.log("    ✓ Creator NFT minted! Total creator NFTs:", creators.length);
    });

    it("version history updated in VersionStore", async function () {
      if (lifecycleDocId === 0n) this.skip();
      const versionsAfter = await versionStore.totalVersions();
      expect(versionsAfter).to.be.greaterThan(versionsBefore);
      const dag = await versionStore.getVersionDAG(lifecycleDocId);
      console.log("    Version DAG:", dag.map((i: bigint) => i.toString()).join(","));
      expect(dag.length).to.be.greaterThan(0);
    });

    it("list Approved → Executed proposals includes lifecycle", async function () {
      const [execs, t] = await governance.listProposals(4, 0, 10); // Executed
      console.log("    Executed proposals:", t.toString());
      const found = execs.some((p: any) => p.id === lifecyclePid);
      expect(found).to.be.true;
      console.log("    ✓ Lifecycle proposal found in Executed list");
    });

    it("Admin resets voting period to default (7 days)", async function () {
      await sendTx(() => governance.connect(deployer).setVotingPeriod(0, { gasLimit: GAS }));
      const vp = await governance.getVotingPeriod();
      expect(vp).to.equal(604800n);
      console.log("    Voting period restored to", vp.toString(), "seconds (7 days)");
    });
  });

  // ═══ 18. PROPOSAL REJECTED LIFECYCLE ══════════════════════════════
  describe("18. Proposal Rejected Lifecycle", function () {
    let rejectPid = 0n;

    it("Admin sets voting period to 120s again", async function () {
      await sendTx(() => governance.connect(deployer).setVotingPeriod(120, { gasLimit: GAS }));
      console.log("    Voting period: 120s");
    });

    it("#3 proposes version on existing doc", async function () {
      if (docId1 === 0n) this.skip();
      await wait(2000);
      const c = ethers.toUtf8Bytes("# Should be rejected " + Date.now());
      await sendTx(() => registry.connect(wallet3).proposeVersion(
        docId1, 0, ethers.keccak256(c), ethers.hexlify(c), { gasLimit: GAS }
      ));
      rejectPid = await governance.totalProposals();
      console.log("    Reject target proposal ID:", rejectPid.toString());
      await wait(1000);
    });

    it("#3 votes NO, #4 votes NO → negative score", async function () {
      if (rejectPid === 0n) this.skip();
      await wait(2000);
      await sendTx(() => governance.connect(wallet3).vote(rejectPid, 1, { gasLimit: GAS }));
      await wait(2000);
      await sendTx(() => governance.connect(wallet4).vote(rejectPid, 1, { gasLimit: GAS }));
      const p = await governance.getProposal(rejectPid);
      console.log("    Score:", ethers.formatEther(p.score));
      expect(p.score).to.be.lessThan(0n);
    });

    it("wait for voting period", async function () {
      this.timeout(300_000);
      if (rejectPid === 0n) this.skip();
      const p = await governance.getProposal(rejectPid);
      const endTime = Number(p.endTime);
      const block = await ethers.provider.getBlock("latest");
      const now = Number(block!.timestamp);
      const remaining = endTime - now;
      if (remaining > 0) {
        console.log("    Waiting %ds for voting period to end...", remaining + 15);
        await wait((remaining + 15) * 1000);
      } else {
        console.log("    Voting period already ended.");
      }
    });

    it("finalizeProposal → Rejected", async function () {
      this.timeout(300_000);
      if (rejectPid === 0n) this.skip();
      const p0 = await governance.getProposal(rejectPid);
      const blk = await ethers.provider.getBlock("latest");
      const gap = Number(p0.endTime) - Number(blk!.timestamp);
      console.log("    endTime=%d blockTime=%d gap=%ds", p0.endTime, blk!.timestamp, gap);
      if (gap > 0) {
        console.log("    Still not ended, waiting extra %ds...", gap + 20);
        await wait((gap + 20) * 1000);
      }
      console.log("    Sending finalizeProposal...");
      await wait(3000);
      // staticCall first to check it won't revert
      await governance.connect(wallet3).finalizeProposal.staticCall(rejectPid, { gasLimit: GAS });
      console.log("    staticCall OK, sending real tx...");
      await sendTx(() => governance.connect(wallet3).finalizeProposal(rejectPid, { gasLimit: GAS }));
      const p = await governance.getProposal(rejectPid);
      expect(p.status).to.equal(2); // Rejected
      console.log("    ✓ Proposal REJECTED! Score:", ethers.formatEther(p.score));
    });

    it("executeProposal on rejected reverts", async function () {
      if (rejectPid === 0n) this.skip();
      const reverted = await expectRevert(
        () => governance.connect(wallet3).executeProposal.staticCall(rejectPid, { gasLimit: GAS })
      );
      expect(reverted).to.be.true;
      console.log("    ✓ Execute on rejected proposal correctly reverts");
    });

    it("Admin resets voting period to default", async function () {
      await sendTx(() => governance.connect(deployer).setVotingPeriod(0, { gasLimit: GAS }));
      const vp = await governance.getVotingPeriod();
      expect(vp).to.equal(604800n);
      console.log("    Voting period restored to 7 days");
    });
  });

  // ═══ SUMMARY ══════════════════════════════════════════════════════
  after(async function () {
    console.log("\n  ══════════ Final State ══════════");
    console.log("  Members:", (await staking.totalActiveMembers()).toString());
    console.log("  Documents:", (await registry.totalDocuments()).toString());
    console.log("  Proposals:", (await governance.totalProposals()).toString());
    console.log("  Treasury:", ethers.formatEther(await ethers.provider.getBalance(ADDRS.Treasury)), "PAS");
    for (const [l, a] of [["#3", addr3], ["#4", addr4], ["#5", addr5]]) {
      const mem = await staking.isActiveMember(a);
      const nfts = (await nftReward.getNFTsByHolder(a)).length;
      const gold = await nftReward.hasActiveOGGold(a);
      console.log(`  Wallet${l}: member=${mem} NFTs=${nfts} OGGold=${gold}`);
    }
    console.log("  ══════════════════════════════════\n");
  });
});
