import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture, stakeFor, STAKE_AMOUNT } from "../fixtures/deployFixture";

describe("GovernanceCore v2", () => {
  const VOTING_PERIOD = 7 * 24 * 3600;

  async function setupMembersAndProposal() {
    const data = await deployFixture();
    const { contracts, actors } = data;
    // Stake for all participants
    await stakeFor(contracts.stakingManager, actors.author1, 12);
    await stakeFor(contracts.stakingManager, actors.voter1, 6);
    await stakeFor(contracts.stakingManager, actors.voter2, 3);
    await stakeFor(contracts.stakingManager, actors.voter3, 3);
    // OG Gold holder also needs to stake to vote
    await stakeFor(contracts.stakingManager, actors.ogGoldHolder, 3);

    // Create proposal
    await contracts.governanceCore.connect(actors.author1).createProposal(
      0, 1, 0, "0x", "Test proposal"
    );
    return data;
  }

  describe("createProposal", () => {
    it("should create proposal for active members only", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      // Not a member yet
      await expect(
        contracts.governanceCore.connect(actors.author1).createProposal(0, 1, 0, "0x", "test")
      ).to.be.revertedWithCustomError(contracts.governanceCore, "Gov__NotActiveMember");

      // Stake and try again
      await stakeFor(contracts.stakingManager, actors.author1);
      await expect(
        contracts.governanceCore.connect(actors.author1).createProposal(0, 1, 0, "0x", "test")
      ).to.emit(contracts.governanceCore, "ProposalCreated");

      const p = await contracts.governanceCore.getProposal(1);
      expect(p.proposer).to.equal(actors.author1.address);
      expect(p.status).to.equal(0); // Active
    });
  });

  describe("vote", () => {
    it("should record vote with correct weight", async () => {
      const data = await loadFixture(setupMembersAndProposal);
      const { contracts, actors } = data;

      await contracts.governanceCore.connect(actors.voter1).vote(1, 0); // Yes
      const record = await contracts.governanceCore.getVoteRecord(1, actors.voter1.address);
      expect(record.hasVoted).to.be.true;
      expect(record.weight).to.be.gt(0n);
    });

    it("should revert on double vote", async () => {
      const data = await loadFixture(setupMembersAndProposal);
      const { contracts, actors } = data;

      await contracts.governanceCore.connect(actors.voter1).vote(1, 0);
      await expect(
        contracts.governanceCore.connect(actors.voter1).vote(1, 0)
      ).to.be.revertedWithCustomError(contracts.governanceCore, "Gov__AlreadyVoted");
    });

    it("should revert after voting period", async () => {
      const data = await loadFixture(setupMembersAndProposal);
      await time.increase(VOTING_PERIOD + 1);
      await expect(
        data.contracts.governanceCore.connect(data.actors.voter1).vote(1, 0)
      ).to.be.revertedWithCustomError(data.contracts.governanceCore, "Gov__VotingEnded");
    });
  });

  describe("OG Gold veto", () => {
    it("should instantly veto when OG Gold votes NO", async () => {
      const data = await loadFixture(setupMembersAndProposal);
      const { contracts, actors } = data;

      await expect(
        contracts.governanceCore.connect(actors.ogGoldHolder).vote(1, 1) // No
      ).to.emit(contracts.governanceCore, "GoldVeto");

      const p = await contracts.governanceCore.getProposal(1);
      expect(p.status).to.equal(3); // Vetoed
      expect(p.goldVetoed).to.be.true;
    });
  });

  describe("finalizeProposal", () => {
    it("should approve when score > 2.0", async () => {
      const data = await loadFixture(setupMembersAndProposal);
      const { contracts, actors } = data;

      // 3 YES votes should exceed threshold of 2.0
      await contracts.governanceCore.connect(actors.voter1).vote(1, 0);
      await contracts.governanceCore.connect(actors.voter2).vote(1, 0);
      await contracts.governanceCore.connect(actors.voter3).vote(1, 0);

      await time.increase(VOTING_PERIOD + 1);
      await contracts.governanceCore.finalizeProposal(1);

      const p = await contracts.governanceCore.getProposal(1);
      expect(p.status).to.equal(1); // Approved
    });

    it("should reject when score <= 2.0", async () => {
      const data = await loadFixture(setupMembersAndProposal);
      const { contracts, actors } = data;

      // 1 YES + 1 NO → score near 0
      await contracts.governanceCore.connect(actors.voter1).vote(1, 0); // Yes
      await contracts.governanceCore.connect(actors.voter2).vote(1, 1); // No

      await time.increase(VOTING_PERIOD + 1);
      await contracts.governanceCore.finalizeProposal(1);

      const p = await contracts.governanceCore.getProposal(1);
      expect(p.status).to.equal(2); // Rejected
    });
  });

  describe("cancelProposal", () => {
    it("should allow proposer to cancel", async () => {
      const data = await loadFixture(setupMembersAndProposal);
      await data.contracts.governanceCore.connect(data.actors.author1).cancelProposal(1);
      const p = await data.contracts.governanceCore.getProposal(1);
      expect(p.status).to.equal(5); // Cancelled
    });

    it("should revert if not proposer", async () => {
      const data = await loadFixture(setupMembersAndProposal);
      await expect(
        data.contracts.governanceCore.connect(data.actors.voter1).cancelProposal(1)
      ).to.be.revertedWithCustomError(data.contracts.governanceCore, "Gov__NotProposer");
    });
  });
});
