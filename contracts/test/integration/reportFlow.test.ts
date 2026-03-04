import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture, stakeFor } from "../fixtures/deployFixture";

describe("Report Flow (v2)", () => {
  const VOTING_PERIOD = 7 * 24 * 3600;
  const FREEZE_DURATION = 72 * 3600;
  const REVOTE_DURATION = 72 * 3600;

  async function setupApprovedDoc() {
    const data = await deployFixture();
    const { contracts, actors } = data;

    const signers = await ethers.getSigners();
    const extraVoters = signers.slice(7, 12); // 5 extra signers for quorum

    // Stake all participants
    await stakeFor(contracts.stakingManager, actors.author1, 12);
    await stakeFor(contracts.stakingManager, actors.voter1, 3);
    await stakeFor(contracts.stakingManager, actors.voter2, 3);
    await stakeFor(contracts.stakingManager, actors.voter3, 3);
    for (const v of extraVoters) {
      await stakeFor(contracts.stakingManager, v, 3);
    }

    // Create doc + propose + vote + finalize + execute
    await contracts.registry.connect(actors.author1).createDocument("Report Test", ["test"]);
    const hash = ethers.keccak256(ethers.toUtf8Bytes("content"));
    await contracts.registry.connect(actors.author1).proposeVersion(
      1, 0, hash, ethers.toUtf8Bytes("# content")
    );

    await contracts.governanceCore.connect(actors.voter1).vote(1, 0);
    await contracts.governanceCore.connect(actors.voter2).vote(1, 0);
    await contracts.governanceCore.connect(actors.voter3).vote(1, 0);

    await time.increase(VOTING_PERIOD + 1);
    await contracts.governanceCore.finalizeProposal(1);
    await contracts.governanceCore.executeProposal(1);

    return { ...data, extraVoters };
  }

  it("full report → freeze → revote → maintain flow", async () => {
    const { contracts, actors, extraVoters } = await loadFixture(setupApprovedDoc);

    // Report 3 times to trigger freeze
    await contracts.reportManager.connect(actors.voter1).report(1);
    await contracts.reportManager.connect(actors.voter2).report(1);
    await contracts.reportManager.connect(actors.voter3).report(1);

    // Document should be Frozen
    let doc = await contracts.registry.getDocument(1);
    expect(doc.status).to.equal(3); // Frozen

    // Wait for freeze period
    await time.increase(FREEZE_DURATION + 1);

    // Revote: 5 members vote YES (quorum = 5)
    await contracts.reportManager.connect(actors.author1).revote(1, true);
    await contracts.reportManager.connect(actors.voter1).revote(1, true);
    await contracts.reportManager.connect(actors.voter2).revote(1, true);
    await contracts.reportManager.connect(actors.voter3).revote(1, true);
    await contracts.reportManager.connect(extraVoters[0]).revote(1, true);

    // Wait for revote period
    await time.increase(REVOTE_DURATION + 1);

    // Finalize: YES wins → maintained
    await contracts.reportManager.finalize(1);

    doc = await contracts.registry.getDocument(1);
    expect(doc.status).to.equal(0); // Active (restored)
  });

  it("full report → freeze → revote → revoke flow", async () => {
    const { contracts, actors, extraVoters } = await loadFixture(setupApprovedDoc);

    // Trigger freeze
    await contracts.reportManager.connect(actors.voter1).report(1);
    await contracts.reportManager.connect(actors.voter2).report(1);
    await contracts.reportManager.connect(actors.voter3).report(1);

    await time.increase(FREEZE_DURATION + 1);

    // Revote: majority NO
    await contracts.reportManager.connect(actors.author1).revote(1, false);
    await contracts.reportManager.connect(actors.voter1).revote(1, false);
    await contracts.reportManager.connect(actors.voter2).revote(1, false);
    await contracts.reportManager.connect(actors.voter3).revote(1, true);
    await contracts.reportManager.connect(extraVoters[0]).revote(1, true);

    await time.increase(REVOTE_DURATION + 1);

    await contracts.reportManager.finalize(1);

    const doc = await contracts.registry.getDocument(1);
    expect(doc.status).to.equal(4); // Revoked
  });
});
