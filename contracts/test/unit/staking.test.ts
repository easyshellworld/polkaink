import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture, stakeFor, STAKE_AMOUNT } from "../fixtures/deployFixture";

describe("StakingManager", () => {
  describe("stake", () => {
    it("should stake 88 DOT and mint Member NFT", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await expect(
        contracts.stakingManager.connect(actors.author1).stake(3, { value: STAKE_AMOUNT })
      ).to.emit(contracts.stakingManager, "Staked");

      const info = await contracts.stakingManager.getStake(actors.author1.address);
      expect(info.active).to.be.true;
      expect(info.amount).to.equal(STAKE_AMOUNT);
      expect(info.lockMonths).to.equal(3);
      expect(await contracts.stakingManager.isActiveMember(actors.author1.address)).to.be.true;
      expect(await contracts.stakingManager.totalActiveMembers()).to.equal(1n);
    });

    it("should revert on wrong amount", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await expect(
        contracts.stakingManager.connect(actors.author1).stake(3, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(contracts.stakingManager, "Staking__WrongAmount");
    });

    it("should revert on invalid lock months", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await expect(
        contracts.stakingManager.connect(actors.author1).stake(5, { value: STAKE_AMOUNT })
      ).to.be.revertedWithCustomError(contracts.stakingManager, "Staking__InvalidLockMonths");
    });

    it("should revert on double stake", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1);
      await expect(
        contracts.stakingManager.connect(actors.author1).stake(3, { value: STAKE_AMOUNT })
      ).to.be.revertedWithCustomError(contracts.stakingManager, "Staking__AlreadyStaked");
    });
  });

  describe("unstake", () => {
    it("should return 88 DOT after lock expires", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1, 3);

      // Advance 3 months
      await time.increase(3 * 30 * 24 * 3600 + 1);

      const balBefore = await ethers.provider.getBalance(actors.author1.address);
      const tx = await contracts.stakingManager.connect(actors.author1).unstake();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const balAfter = await ethers.provider.getBalance(actors.author1.address);

      expect(balAfter + gasUsed - balBefore).to.equal(STAKE_AMOUNT);
      expect(await contracts.stakingManager.isActiveMember(actors.author1.address)).to.be.false;
    });

    it("should revert before lock expires", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1, 3);
      await expect(
        contracts.stakingManager.connect(actors.author1).unstake()
      ).to.be.revertedWithCustomError(contracts.stakingManager, "Staking__LockNotExpired");
    });
  });

  describe("earlyUnstake", () => {
    it("should return 90% and send 10% penalty to Treasury", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1, 3);

      const treasuryAddr = await contracts.treasury.getAddress();
      const treasuryBalBefore = await ethers.provider.getBalance(treasuryAddr);

      const tx = await contracts.stakingManager.connect(actors.author1).earlyUnstake();
      await tx.wait();

      const treasuryBalAfter = await ethers.provider.getBalance(treasuryAddr);
      const penalty = (STAKE_AMOUNT * 10n) / 100n; // 8.8 DOT
      expect(treasuryBalAfter - treasuryBalBefore).to.equal(penalty);
      expect(await contracts.stakingManager.isActiveMember(actors.author1.address)).to.be.false;
    });
  });
});
