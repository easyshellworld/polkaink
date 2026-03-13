import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture, stakeFor } from "../fixtures/deployFixture";

describe("PolkaInkRegistry v3.3", () => {
  const VOTING_PERIOD = 10 * 60;

  describe("createDocument", () => {
    it("should allow active members to create documents", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1);

      await expect(
        contracts.registry.connect(actors.author1).createDocument("My Doc", ["#test"], "desc")
      ).to.emit(contracts.registry, "DocumentCreated");

      const doc = await contracts.registry.getDocument(1);
      expect(doc.title).to.equal("My Doc");
      expect(doc.isSeed).to.be.false;
    });

    it("should revert for non-members", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await expect(
        contracts.registry.connect(actors.author1).createDocument("Doc", [], "desc")
      ).to.be.revertedWithCustomError(contracts.registry, "Registry__NotActiveMember");
    });
  });

  describe("createSeedDocument", () => {
    it("should allow SEED_CREATOR_ROLE to create seed documents with empty content", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);

      await expect(
        contracts.registry.connect(actors.admin).createSeedDocument("Seed Doc", ["#seed"])
      ).to.emit(contracts.registry, "DocumentCreated");

      const doc = await contracts.registry.getDocument(1);
      expect(doc.isSeed).to.be.true;
      expect(doc.title).to.equal("Seed Doc");
      expect(doc.currentVersionId).to.equal(0);
    });

    it("should revert after SEED_CREATOR_ROLE is renounced", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const SEED_CREATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SEED_CREATOR_ROLE"));
      await (contracts.registry as any).renounceRole(SEED_CREATOR_ROLE, actors.admin.address);

      await expect(
        contracts.registry.connect(actors.admin).createSeedDocument("Seed", [])
      ).to.be.reverted;
    });
  });

  describe("proposeVersion", () => {
    it("should create proposal for active members", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1);
      await contracts.registry.connect(actors.author1).createDocument("Doc", [], "desc");

      await expect(
        contracts.registry.connect(actors.author1)
          .proposeVersion(1, 0, ethers.keccak256(ethers.toUtf8Bytes("v1")), "First version")
      ).to.emit(contracts.registry, "VersionProposed");
    });

    it("should revert if active proposal already exists", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1);
      await stakeFor(contracts.stakingManager, actors.author2);
      await contracts.registry.connect(actors.author1).createDocument("Doc", [], "desc");

      await contracts.registry.connect(actors.author1)
        .proposeVersion(1, 0, ethers.keccak256(ethers.toUtf8Bytes("v1")), "v1");

      await expect(
        contracts.registry.connect(actors.author2)
          .proposeVersion(1, 0, ethers.keccak256(ethers.toUtf8Bytes("v1b")), "v1b")
      ).to.be.revertedWithCustomError(contracts.registry, "Registry__ActiveProposalExists");
    });

    it("should allow parentVersionId case B when previous proposal is Approved but unexecuted", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1, 12);
      await stakeFor(contracts.stakingManager, actors.voter1, 6);
      await stakeFor(contracts.stakingManager, actors.voter2, 3);
      await stakeFor(contracts.stakingManager, actors.voter3, 3);

      await contracts.registry.connect(actors.author1).createDocument("Doc", [], "desc");
      await contracts.registry.connect(actors.author1)
        .proposeVersion(1, 0, ethers.keccak256(ethers.toUtf8Bytes("v1")), "v1");

      await contracts.governanceCore.connect(actors.voter1).vote(1, 0);
      await contracts.governanceCore.connect(actors.voter2).vote(1, 0);
      await contracts.governanceCore.connect(actors.voter3).vote(1, 0);
      await time.increase(VOTING_PERIOD + 1);
      await contracts.governanceCore.finalizeProposal(1);

      const p1 = await contracts.governanceCore.getProposal(1);
      expect(p1.status).to.equal(1); // Approved

      await expect(
        contracts.registry.connect(actors.author1)
          .proposeVersion(1, p1.targetVersionId, ethers.keccak256(ethers.toUtf8Bytes("v2")), "v2")
      ).to.emit(contracts.registry, "VersionProposed");
    });

    it("should reject parentVersionId=currentVersionId when case B parent is required", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1, 12);
      await stakeFor(contracts.stakingManager, actors.voter1, 6);
      await stakeFor(contracts.stakingManager, actors.voter2, 3);
      await stakeFor(contracts.stakingManager, actors.voter3, 3);

      await contracts.registry.connect(actors.author1).createDocument("Doc", [], "desc");
      await contracts.registry.connect(actors.author1)
        .proposeVersion(1, 0, ethers.keccak256(ethers.toUtf8Bytes("v1")), "v1");

      await contracts.governanceCore.connect(actors.voter1).vote(1, 0);
      await contracts.governanceCore.connect(actors.voter2).vote(1, 0);
      await contracts.governanceCore.connect(actors.voter3).vote(1, 0);
      await time.increase(VOTING_PERIOD + 1);
      await contracts.governanceCore.finalizeProposal(1);

      await expect(
        contracts.registry.connect(actors.author1)
          .proposeVersion(1, 0, ethers.keccak256(ethers.toUtf8Bytes("v2")), "v2")
      ).to.be.revertedWithCustomError(contracts.registry, "Registry__InvalidParentVersion");
    });
  });

  describe("setDocumentStatus", () => {
    it("should allow COUNCIL_ROLE to freeze and unfreeze documents", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1);
      await contracts.registry.connect(actors.author1).createDocument("Doc", [], "desc");

      const COUNCIL_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COUNCIL_ROLE"));
      await (contracts.registry as any).grantRole(COUNCIL_ROLE, actors.admin.address);

      await contracts.registry.connect(actors.admin).setDocumentStatus(1, 1); // Frozen
      let doc = await contracts.registry.getDocument(1);
      expect(doc.status).to.equal(1); // Frozen

      await contracts.registry.connect(actors.admin).setDocumentStatus(1, 0); // Active
      doc = await contracts.registry.getDocument(1);
      expect(doc.status).to.equal(0); // Active
    });
  });
});
