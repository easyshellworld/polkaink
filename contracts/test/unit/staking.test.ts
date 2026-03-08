import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture, stakeFor, STAKE_AMOUNT } from "../fixtures/deployFixture";

describe("StakingManager v3.3", () => {
  describe("stake", () => {
    it("should stake 88 PAS and mint Member NFT", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1, 3);

      expect(await contracts.stakingManager.isActiveMember(actors.author1.address)).to.be.true;
      const info = await contracts.stakingManager.getStake(actors.author1.address);
      expect(info.amount).to.equal(STAKE_AMOUNT);
      expect(info.lockMonths).to.equal(3);

      expect(await contracts.nftReward.hasActiveMember(actors.author1.address)).to.be.true;
    });

    it("should reject wrong amount", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await expect(
        contracts.stakingManager.connect(actors.author1).stake(3, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(contracts.stakingManager, "Staking__WrongAmount");
    });

    it("should reject invalid lock months", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await expect(
        contracts.stakingManager.connect(actors.author1).stake(5, { value: STAKE_AMOUNT })
      ).to.be.revertedWithCustomError(contracts.stakingManager, "Staking__InvalidLockMonths");
    });

    it("should reject double stake", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1, 3);
      await expect(
        stakeFor(contracts.stakingManager, actors.author1, 3)
      ).to.be.revertedWithCustomError(contracts.stakingManager, "Staking__AlreadyStaked");
    });

    it("should track totalActiveMemberWeight", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      expect(await contracts.stakingManager.totalActiveMemberWeight()).to.equal(0n);

      await stakeFor(contracts.stakingManager, actors.author1, 3);
      expect(await contracts.stakingManager.totalActiveMemberWeight()).to.equal(ethers.parseEther("1"));

      await stakeFor(contracts.stakingManager, actors.voter1, 3);
      expect(await contracts.stakingManager.totalActiveMemberWeight()).to.equal(ethers.parseEther("2"));
    });
  });

  describe("unstake", () => {
    it("should return 88 PAS after lock expires", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1, 3);

      await time.increase(3 * 30 * 24 * 3600 + 1);

      const before = await ethers.provider.getBalance(actors.author1.address);
      const tx = await contracts.stakingManager.connect(actors.author1).unstake();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const after = await ethers.provider.getBalance(actors.author1.address);

      expect(after + gasUsed - before).to.equal(STAKE_AMOUNT);
      expect(await contracts.stakingManager.isActiveMember(actors.author1.address)).to.be.false;
    });

    it("should revert if lock not expired", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1, 3);

      await expect(
        contracts.stakingManager.connect(actors.author1).unstake()
      ).to.be.revertedWithCustomError(contracts.stakingManager, "Staking__LockNotExpired");
    });
  });

  describe("earlyUnstake", () => {
    it("should apply 10% penalty and send to Treasury", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const poolBefore = await contracts.treasury.rewardPoolBalance();

      await stakeFor(contracts.stakingManager, actors.author1, 12);

      const tx = await contracts.stakingManager.connect(actors.author1).earlyUnstake();
      await tx.wait();

      const penalty = STAKE_AMOUNT / 10n;
      const poolAfter = await contracts.treasury.rewardPoolBalance();

      expect(poolAfter - poolBefore).to.equal(penalty);
      expect(await contracts.stakingManager.isActiveMember(actors.author1.address)).to.be.false;
    });
  });
});
