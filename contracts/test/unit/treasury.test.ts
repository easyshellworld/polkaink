import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture, stakeFor } from "../fixtures/deployFixture";

describe("Treasury v3.4", () => {
  const EPOCH_DURATION = 3600; // 1 hour MVP
  const VOTING_PERIOD  = 10 * 60;
  const COUNCIL_WINDOW = 3 * 60;
  async function lowPoolFixture() {
    return deployFixture(ethers.parseEther("4"));
  }

  describe("depositRewardPool", () => {
    it("should accept open donations from anyone", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const before = await contracts.treasury.rewardPoolBalance();
      await contracts.treasury.connect(actors.author1).depositRewardPool({
        value: ethers.parseEther("10"),
      });
      const after = await contracts.treasury.rewardPoolBalance();
      expect(after - before).to.equal(ethers.parseEther("10"));
    });

    it("should accept direct ETH transfers into rewardPool", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const before = await contracts.treasury.rewardPoolBalance();
      await actors.author1.sendTransaction({
        to: await contracts.treasury.getAddress(),
        value: ethers.parseEther("5"),
      });
      const after = await contracts.treasury.rewardPoolBalance();
      expect(after - before).to.equal(ethers.parseEther("5"));
    });
  });

  describe("epochStartTime", () => {
    it("should return deployment timestamp", async () => {
      const { contracts } = await loadFixture(deployFixture);
      const est = await contracts.treasury.epochStartTime();
      expect(est).to.be.gt(0n);
    });
  });

  describe("executeSpend", () => {
    it("should revert for unauthorized callers", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await expect(
        contracts.treasury.connect(actors.author1).executeSpend(
          actors.author1.address, ethers.parseEther("1"), 0, "test"
        )
      ).to.be.reverted;
    });
  });

  describe("distributeCouncilAllowance", () => {
    it("should revert for non-COUNCIL_ROLE callers", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await expect(
        contracts.treasury.connect(actors.author1).distributeCouncilAllowance(
          actors.author1.address, 0
        )
      ).to.be.reverted;
    });

    it("should not mark claimed when pool is insufficient, and allow later claim after refill", async () => {
      const { contracts, actors } = await loadFixture(lowPoolFixture);

      await time.increase(EPOCH_DURATION + 1);
      await expect(
        contracts.archiveCouncil.connect(actors.councilMember1).claimCouncilAllowance(0)
      ).to.be.revertedWithCustomError(contracts.archiveCouncil, "Council__InsufficientRewardPool");
      expect(
        await contracts.archiveCouncil.isAllowanceClaimed(actors.councilMember1.address, 0)
      ).to.equal(false);

      await contracts.treasury.connect(actors.admin).depositRewardPool({
        value: ethers.parseEther("10"),
      });

      await expect(
        contracts.archiveCouncil.connect(actors.councilMember1).claimCouncilAllowance(0)
      ).to.emit(contracts.archiveCouncil, "CouncilAllowanceClaimed");
      expect(
        await contracts.archiveCouncil.isAllowanceClaimed(actors.councilMember1.address, 0)
      ).to.equal(true);
    });
  });

  describe("recordEpochVoterWeight", () => {
    it("should revert for non-GOVERNANCE_ROLE callers", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await expect(
        (contracts.treasury as any).connect(actors.author1).recordEpochVoterWeight(
          0, actors.author1.address, ethers.parseEther("1")
        )
      ).to.be.reverted;
    });
  });

  describe("Voter Epoch Reward Distribution (v3.4 fix)", () => {
    it("should populate _pendingRewards after finalizeEpoch", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);

      await stakeFor(contracts.stakingManager, actors.author1, 12);
      await stakeFor(contracts.stakingManager, actors.voter1, 6);
      await stakeFor(contracts.stakingManager, actors.voter2, 3);
      await stakeFor(contracts.stakingManager, actors.voter3, 3);

      await contracts.registry.connect(actors.author1)
        .createDocument("Epoch Reward Doc", ["#test"], "desc");
      await contracts.registry.connect(actors.author1)
        .proposeVersion(1, 0, ethers.keccak256(ethers.toUtf8Bytes("v1")), "version 1");

      await contracts.governanceCore.connect(actors.voter1).vote(1, 0);
      await contracts.governanceCore.connect(actors.voter2).vote(1, 0);
      await contracts.governanceCore.connect(actors.voter3).vote(1, 0);

      await time.increase(VOTING_PERIOD + 1);
      await contracts.governanceCore.finalizeProposal(1);
      await time.increase(COUNCIL_WINDOW + 1);
      await contracts.governanceCore.executeProposal(1);

      await time.increase(EPOCH_DURATION + 1);
      await contracts.treasury.finalizeEpoch(0);

      const voter1Pending = await contracts.treasury.pendingReward(actors.voter1.address, 0);
      const voter2Pending = await contracts.treasury.pendingReward(actors.voter2.address, 0);
      const voter3Pending = await contracts.treasury.pendingReward(actors.voter3.address, 0);

      expect(voter1Pending).to.be.gt(0n, "voter1 should have pending reward");
      expect(voter2Pending).to.be.gt(0n, "voter2 should have pending reward");
      expect(voter3Pending).to.be.gt(0n, "voter3 should have pending reward");
    });

    it("should allow voters to claim epoch rewards after finalization", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);

      await stakeFor(contracts.stakingManager, actors.author1, 12);
      await stakeFor(contracts.stakingManager, actors.voter1, 6);
      await stakeFor(contracts.stakingManager, actors.voter2, 3);

      await contracts.registry.connect(actors.author1)
        .createDocument("Claim Doc", [], "desc");
      await contracts.registry.connect(actors.author1)
        .proposeVersion(1, 0, ethers.keccak256(ethers.toUtf8Bytes("v1")), "v1");

      await contracts.governanceCore.connect(actors.voter1).vote(1, 0);
      await contracts.governanceCore.connect(actors.voter2).vote(1, 0);

      await time.increase(VOTING_PERIOD + 1);
      await contracts.governanceCore.finalizeProposal(1);
      await time.increase(COUNCIL_WINDOW + 1);
      await contracts.governanceCore.executeProposal(1);

      await time.increase(EPOCH_DURATION + 1);
      await contracts.treasury.finalizeEpoch(0);

      const pending = await contracts.treasury.pendingReward(actors.voter1.address, 0);
      expect(pending).to.be.gt(0n);

      const before = await ethers.provider.getBalance(actors.voter1.address);
      const tx = await contracts.treasury.connect(actors.voter1).claimEpochReward(0);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const after = await ethers.provider.getBalance(actors.voter1.address);

      expect(after + gasUsed - before).to.equal(pending);
    });

    it("should revert claimEpochReward if nothing to claim", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);

      await time.increase(EPOCH_DURATION + 1);
      await contracts.treasury.finalizeEpoch(0);

      await expect(
        contracts.treasury.connect(actors.author1).claimEpochReward(0)
      ).to.be.revertedWithCustomError(contracts.treasury, "Treasury__NothingToClaim");
    });

    it("should distribute voter rewards proportionally by weight", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);

      await stakeFor(contracts.stakingManager, actors.author1, 12);
      await stakeFor(contracts.stakingManager, actors.voter1, 24); // higher weight
      await stakeFor(contracts.stakingManager, actors.voter2, 3);  // lower weight

      await contracts.registry.connect(actors.author1)
        .createDocument("Weight Doc", [], "desc");
      await contracts.registry.connect(actors.author1)
        .proposeVersion(1, 0, ethers.keccak256(ethers.toUtf8Bytes("v1")), "v1");

      await contracts.governanceCore.connect(actors.voter1).vote(1, 0);
      await contracts.governanceCore.connect(actors.voter2).vote(1, 0);

      await time.increase(VOTING_PERIOD + 1);
      await contracts.governanceCore.finalizeProposal(1);
      await time.increase(COUNCIL_WINDOW + 1);
      await contracts.governanceCore.executeProposal(1);

      await time.increase(EPOCH_DURATION + 1);
      await contracts.treasury.finalizeEpoch(0);

      const v1Pending = await contracts.treasury.pendingReward(actors.voter1.address, 0);
      const v2Pending = await contracts.treasury.pendingReward(actors.voter2.address, 0);

      expect(v1Pending).to.be.gt(v2Pending, "higher weight voter should get more reward");
    });
  });
});
