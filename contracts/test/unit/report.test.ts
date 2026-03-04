import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture, stakeFor } from "../fixtures/deployFixture";

describe("ReportManager", () => {
  const VOTING_PERIOD = 7 * 24 * 3600;

  async function setupApprovedDoc() {
    const data = await deployFixture();
    const { contracts, actors } = data;

    // Stake everyone
    await stakeFor(contracts.stakingManager, actors.author1, 6);
    await stakeFor(contracts.stakingManager, actors.author2, 3);
    await stakeFor(contracts.stakingManager, actors.voter1, 3);
    await stakeFor(contracts.stakingManager, actors.voter2, 3);
    await stakeFor(contracts.stakingManager, actors.voter3, 3);

    // Create doc and propose version
    await contracts.registry.connect(actors.author1).createDocument("Reportable Doc", ["test"]);
    const contentHash = ethers.keccak256(ethers.toUtf8Bytes("content"));
    await contracts.registry.connect(actors.author1).proposeVersion(
      1, 0, contentHash, ethers.toUtf8Bytes("# Content")
    );

    // Vote YES to pass
    await contracts.governanceCore.connect(actors.voter1).vote(1, 0); // Yes
    await contracts.governanceCore.connect(actors.voter2).vote(1, 0); // Yes
    await contracts.governanceCore.connect(actors.voter3).vote(1, 0); // Yes

    // Finalize and execute
    await time.increase(VOTING_PERIOD + 1);
    await contracts.governanceCore.finalizeProposal(1);
    await contracts.governanceCore.executeProposal(1);

    return data;
  }

  describe("report", () => {
    it("should accept reports from active members", async () => {
      const data = await loadFixture(setupApprovedDoc);
      const { contracts, actors } = data;

      await expect(
        contracts.reportManager.connect(actors.voter1).report(1)
      ).to.emit(contracts.reportManager, "DocReported");
    });

    it("should revert for non-members", async () => {
      const data = await loadFixture(setupApprovedDoc);
      const signers = await ethers.getSigners();
      await expect(
        data.contracts.reportManager.connect(signers[15]).report(1)
      ).to.be.revertedWithCustomError(data.contracts.reportManager, "Report__NotActiveMember");
    });

    it("should freeze document after threshold reached", async () => {
      const data = await loadFixture(setupApprovedDoc);
      const { contracts, actors } = data;

      // Default threshold is 3
      await contracts.reportManager.connect(actors.voter1).report(1);
      await contracts.reportManager.connect(actors.voter2).report(1);
      await expect(
        contracts.reportManager.connect(actors.voter3).report(1)
      ).to.emit(contracts.reportManager, "DocFrozen");

      const doc = await contracts.registry.getDocument(1);
      expect(doc.status).to.equal(3); // Frozen
    });
  });

  describe("revote and finalize", () => {
    it("should maintain document when YES > NO", async () => {
      const data = await loadFixture(setupApprovedDoc);
      const { contracts, actors } = data;

      // Trigger freeze
      await contracts.reportManager.connect(actors.voter1).report(1);
      await contracts.reportManager.connect(actors.voter2).report(1);
      await contracts.reportManager.connect(actors.voter3).report(1);

      // Wait for freeze period to end
      await time.increase(72 * 3600 + 1);

      // Cast revotes: 4 YES, 1 NO (need 5 for quorum)
      await contracts.reportManager.connect(actors.author1).revote(1, true);
      await contracts.reportManager.connect(actors.author2).revote(1, true);
      await contracts.reportManager.connect(actors.voter1).revote(1, true);
      await contracts.reportManager.connect(actors.voter2).revote(1, true);
      await contracts.reportManager.connect(actors.voter3).revote(1, false);

      // Wait for revote period to end
      await time.increase(72 * 3600 + 1);

      await expect(
        contracts.reportManager.finalize(1)
      ).to.emit(contracts.reportManager, "DocMaintained");

      const doc = await contracts.registry.getDocument(1);
      expect(doc.status).to.equal(0); // Active
    });

    it("should revoke document when NO >= YES", async () => {
      const data = await loadFixture(setupApprovedDoc);
      const { contracts, actors } = data;

      // Trigger freeze
      await contracts.reportManager.connect(actors.voter1).report(1);
      await contracts.reportManager.connect(actors.voter2).report(1);
      await contracts.reportManager.connect(actors.voter3).report(1);

      await time.increase(72 * 3600 + 1);

      // 2 YES, 3 NO
      await contracts.reportManager.connect(actors.author1).revote(1, true);
      await contracts.reportManager.connect(actors.author2).revote(1, true);
      await contracts.reportManager.connect(actors.voter1).revote(1, false);
      await contracts.reportManager.connect(actors.voter2).revote(1, false);
      await contracts.reportManager.connect(actors.voter3).revote(1, false);

      await time.increase(72 * 3600 + 1);

      await expect(
        contracts.reportManager.finalize(1)
      ).to.emit(contracts.reportManager, "DocRevoked");

      const doc = await contracts.registry.getDocument(1);
      expect(doc.status).to.equal(4); // Revoked
    });
  });
});
