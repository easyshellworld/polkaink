import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture, stakeFor } from "../fixtures/deployFixture";

describe("Integration: Full VersionUpdate Proposal Flow", () => {
  const VOTING_PERIOD  = 10 * 60; // MVP: 10 minutes
  const COUNCIL_WINDOW = 3  * 60; // MVP: 3 minutes
  async function lowRewardPoolFixture() {
    return deployFixture(ethers.parseEther("40"));
  }

  it("should complete full lifecycle: stake → propose → vote → approve → execute → reward", async () => {
    const { contracts, actors } = await loadFixture(deployFixture);

    // Stake for participants
    await stakeFor(contracts.stakingManager, actors.author1, 12);
    await stakeFor(contracts.stakingManager, actors.voter1,  6);
    await stakeFor(contracts.stakingManager, actors.voter2,  3);
    await stakeFor(contracts.stakingManager, actors.voter3,  3);

    // Create document
    await contracts.registry.connect(actors.author1)
      .createDocument("Polkadot History", ["#history"], "Genesis doc");
    const doc = await contracts.registry.getDocument(1);
    expect(doc.title).to.equal("Polkadot History");

    // Propose version
    const contentHash = ethers.keccak256(ethers.toUtf8Bytes("Initial Polkadot history content"));
    await contracts.registry.connect(actors.author1)
      .proposeVersion(1, 0, contentHash, "Add 2020-2024 history");

    const p0 = await contracts.governanceCore.getProposal(1);
    expect(p0.status).to.equal(0); // Active

    // Vote
    await contracts.governanceCore.connect(actors.voter1).vote(1, 0); // Yes
    await contracts.governanceCore.connect(actors.voter2).vote(1, 0); // Yes
    await contracts.governanceCore.connect(actors.voter3).vote(1, 0); // Yes

    // End voting
    await time.increase(VOTING_PERIOD + 1);
    await contracts.governanceCore.finalizeProposal(1);

    const p1 = await contracts.governanceCore.getProposal(1);
    expect(p1.status).to.equal(1); // Approved
    expect(p1.voterCount).to.equal(3n);

    // Wait out council window
    await time.increase(COUNCIL_WINDOW + 1);

    const poolBefore = await contracts.treasury.rewardPoolBalance();

    // Execute
    await contracts.governanceCore.executeProposal(1);
    const p2 = await contracts.governanceCore.getProposal(1);
    expect(p2.status).to.equal(4); // Executed

    // Document version updated
    const updatedDoc = await contracts.registry.getDocument(1);
    expect(updatedDoc.currentVersionId).to.be.gt(0n);
    expect(updatedDoc.latestProposalId).to.equal(0n);

    // Creator NFT minted
    expect(await contracts.nftReward.activeCreatorCount(actors.author1.address)).to.equal(1n);

    // Proposer rewarded (pool reduced)
    const poolAfter = await contracts.treasury.rewardPoolBalance();
    expect(poolAfter).to.be.lt(poolBefore);
  });

  it("should skip reward when pool balance < 50 PAS", async () => {
    const { contracts, actors } = await loadFixture(lowRewardPoolFixture);

    await stakeFor(contracts.stakingManager, actors.author1, 6);
    await stakeFor(contracts.stakingManager, actors.voter1, 3);
    await stakeFor(contracts.stakingManager, actors.voter2, 3);
    await stakeFor(contracts.stakingManager, actors.voter3, 3);
    await contracts.registry.connect(actors.author1)
      .createDocument("Doc", [], "desc");
    await contracts.registry.connect(actors.author1)
      .proposeVersion(1, 0, ethers.keccak256(ethers.toUtf8Bytes("v1")), "v1");

    await contracts.governanceCore.connect(actors.voter1).vote(1, 0);
    await contracts.governanceCore.connect(actors.voter2).vote(1, 0);
    await contracts.governanceCore.connect(actors.voter3).vote(1, 0);
    await time.increase(VOTING_PERIOD + 1);
    await contracts.governanceCore.finalizeProposal(1);
    await time.increase(COUNCIL_WINDOW + 1);

    await expect(contracts.governanceCore.executeProposal(1))
      .to.emit(contracts.governanceCore, "RewardSkipped")
      .withArgs(1, 0)
      .and.to.emit(contracts.governanceCore, "ProposalExecuted");
  });
});

describe("Integration: EmergencyConfirm Flow (v3.4 fix)", () => {
  const EMERGENCY_VOTE_PERIOD = 5 * 60;
  const FREEZE_CONFIRM_PERIOD = 15 * 60;

  it("should auto-unfreeze document if EmergencyConfirm deadline passes without DAO execution", async () => {
    const { contracts, actors } = await loadFixture(deployFixture);

    await stakeFor(contracts.stakingManager, actors.author1, 6);
    await contracts.registry.connect(actors.author1)
      .createDocument("Freeze Test Doc", [], "desc");

    // Council triggers emergency freeze (need 5/7 members)
    const signers = await ethers.getSigners();
    const vetoDesc = "A".repeat(50); // >= 50 bytes

    for (let i = 6; i <= 10; i++) { // 5 of the 7 genesis members
      await contracts.archiveCouncil.connect(signers[i])
        .castEmergencyFreeze(1, 0, vetoDesc);
    }

    // Verify document is Frozen
    let doc = await contracts.registry.getDocument(1);
    expect(doc.status).to.equal(1); // Frozen

    // Advance past freeze confirm deadline (no DAO execution)
    await time.increase(FREEZE_CONFIRM_PERIOD + 1);

    // Anyone can trigger auto-unfreeze
    await contracts.archiveCouncil.checkAndAutoUnfreeze(1);
    doc = await contracts.registry.getDocument(1);
    expect(doc.status).to.equal(0); // Active again
  });

  it("should execute EmergencyConfirm without council window and mark freeze as confirmed", async () => {
    const { contracts, actors } = await loadFixture(deployFixture);
    await stakeFor(contracts.stakingManager, actors.author1, 12);
    await stakeFor(contracts.stakingManager, actors.voter1, 6);
    await stakeFor(contracts.stakingManager, actors.voter2, 3);
    await stakeFor(contracts.stakingManager, actors.voter3, 3);
    await contracts.registry.connect(actors.author1).createDocument("Freeze Confirm Doc", [], "desc");

    const signers = await ethers.getSigners();
    for (let i = 6; i <= 10; i++) {
      await contracts.archiveCouncil.connect(signers[i]).castEmergencyFreeze(1, 0, "D".repeat(50));
    }

    await contracts.governanceCore.connect(actors.voter1).vote(1, 0);
    await contracts.governanceCore.connect(actors.voter2).vote(1, 0);
    await contracts.governanceCore.connect(actors.voter3).vote(1, 0);
    await time.increase(EMERGENCY_VOTE_PERIOD + 1);
    await contracts.governanceCore.finalizeProposal(1);

    const p = await contracts.governanceCore.getProposal(1);
    expect(p.status).to.equal(1); // Approved
    expect(p.councilWindowEnd).to.equal(0n); // EmergencyConfirm has no council window

    await contracts.governanceCore.executeProposal(1);
    const fr = await contracts.archiveCouncil.getFreezeRecord(1);
    expect(fr.confirmed).to.equal(true);

    await time.increase(FREEZE_CONFIRM_PERIOD + 1);
    await contracts.archiveCouncil.checkAndAutoUnfreeze(1);
    const doc = await contracts.registry.getDocument(1);
    expect(doc.status).to.equal(1); // Still Frozen after deadline because confirmed
  });

  it("should unfreeze when EmergencyConfirm is rejected", async () => {
    const { contracts, actors } = await loadFixture(deployFixture);
    await stakeFor(contracts.stakingManager, actors.author1, 12);
    await contracts.registry.connect(actors.author1).createDocument("Freeze Reject Doc", [], "desc");

    const signers = await ethers.getSigners();
    for (let i = 6; i <= 10; i++) {
      await contracts.archiveCouncil.connect(signers[i]).castEmergencyFreeze(1, 0, "E".repeat(50));
    }

    await time.increase(EMERGENCY_VOTE_PERIOD + 1);
    await contracts.governanceCore.finalizeProposal(1);

    const p = await contracts.governanceCore.getProposal(1);
    expect(p.status).to.equal(3); // Rejected
    const doc = await contracts.registry.getDocument(1);
    expect(doc.status).to.equal(0); // Active
  });

  it("should NOT be able to freeze the same document twice (MAX_FREEZE_PER_DOC = 1)", async () => {
    const { contracts, actors } = await loadFixture(deployFixture);

    await stakeFor(contracts.stakingManager, actors.author1, 6);
    await contracts.registry.connect(actors.author1)
      .createDocument("Double Freeze Doc", [], "desc");

    const signers = await ethers.getSigners();
    const vetoDesc = "B".repeat(50);

    // First freeze attempt
    for (let i = 6; i <= 10; i++) {
      await contracts.archiveCouncil.connect(signers[i])
        .castEmergencyFreeze(1, 0, vetoDesc);
    }

    // Auto-unfreeze
    await time.increase(FREEZE_CONFIRM_PERIOD + 1);
    await contracts.archiveCouncil.checkAndAutoUnfreeze(1);

    // Second freeze attempt should fail: MAX_FREEZE_PER_DOC = 1 already exhausted
    await expect(
      contracts.archiveCouncil.connect(signers[6])
        .castEmergencyFreeze(1, 0, vetoDesc)
    ).to.be.revertedWithCustomError(contracts.archiveCouncil, "Council__DocAlreadyFrozenByCouncil");
  });

  it("should revert castEmergencyFreeze if document is already Frozen (v3.4 fix)", async () => {
    const { contracts, actors } = await loadFixture(deployFixture);

    await stakeFor(contracts.stakingManager, actors.author1, 6);
    await contracts.registry.connect(actors.author1)
      .createDocument("Already Frozen Doc", [], "desc");

    // Manually freeze via COUNCIL_ROLE
    const COUNCIL_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COUNCIL_ROLE"));
    await (contracts.registry as any).grantRole(COUNCIL_ROLE, actors.admin.address);
    await contracts.registry.connect(actors.admin).setDocumentStatus(1, 1); // Frozen

    // Trying to cast freeze on already-frozen doc should revert
    const signers = await ethers.getSigners();
    await expect(
      contracts.archiveCouncil.connect(signers[6])
        .castEmergencyFreeze(1, 0, "C".repeat(50))
    ).to.be.revertedWithCustomError(contracts.archiveCouncil, "Council__DocNotActive");
  });
});
