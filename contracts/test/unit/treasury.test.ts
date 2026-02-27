import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture } from "../fixtures/deployFixture";

describe("Treasury", () => {
  describe("receive", () => {
    it("should accept ETH/DOT and emit FundsReceived", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { treasury } = contracts;

      await expect(
        actors.admin.sendTransaction({ to: await treasury.getAddress(), value: ethers.parseEther("1") })
      ).to.emit(treasury, "FundsReceived");

      const bal = await treasury.balance();
      expect(bal).to.equal(ethers.parseEther("1"));
    });
  });

  describe("distributeProposalReward", () => {
    it("should distribute 70% to proposer and retain 30%", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { treasury } = contracts;
      const { admin, author1 } = actors;

      // Fund treasury
      await admin.sendTransaction({ to: await treasury.getAddress(), value: ethers.parseEther("10") });

      // Grant DISTRIBUTOR_ROLE to admin
      const DISTRIBUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE"));
      await treasury.connect(admin).grantRole(DISTRIBUTOR_ROLE, admin.address);

      const totalReward = ethers.parseEther("1");
      const proposerExpected = (totalReward * 70n) / 100n;

      const balBefore = await ethers.provider.getBalance(author1.address);
      await expect(
        treasury.connect(admin).distributeProposalReward(1, author1.address, totalReward)
      )
        .to.emit(treasury, "RewardDistributed")
        .withArgs(1, author1.address, proposerExpected, totalReward - proposerExpected);

      const balAfter = await ethers.provider.getBalance(author1.address);
      expect(balAfter - balBefore).to.equal(proposerExpected);
    });

    it("should revert if treasury has insufficient balance", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { treasury, admin } = { ...contracts, admin: actors.admin };

      const DISTRIBUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE"));
      await treasury.connect(admin).grantRole(DISTRIBUTOR_ROLE, admin.address);

      await expect(
        treasury.connect(admin).distributeProposalReward(1, actors.author1.address, ethers.parseEther("999"))
      ).to.be.reverted;
    });

    it("should skip distribution when totalReward is 0", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { treasury } = contracts;

      const DISTRIBUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE"));
      await treasury.connect(actors.admin).grantRole(DISTRIBUTOR_ROLE, actors.admin.address);

      // Should not revert or emit
      await expect(
        treasury.connect(actors.admin).distributeProposalReward(1, actors.author1.address, 0)
      ).to.not.emit(treasury, "RewardDistributed");
    });
  });

  describe("createSpendRequest / executeSpend", () => {
    it("should create and execute a spend request", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { treasury } = contracts;
      const { admin, author1 } = actors;

      // Fund treasury
      await admin.sendTransaction({ to: await treasury.getAddress(), value: ethers.parseEther("10") });

      // Create request
      await treasury.connect(admin).createSpendRequest(0, author1.address, ethers.parseEther("1"), "reward", 0);

      // Grant SPEND_ROLE to admin for test
      const SPEND_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SPEND_ROLE"));
      await treasury.connect(admin).grantRole(SPEND_ROLE, admin.address);

      const balBefore = await ethers.provider.getBalance(author1.address);
      await expect(treasury.connect(admin).executeSpend(1))
        .to.emit(treasury, "SpendExecuted");

      const balAfter = await ethers.provider.getBalance(author1.address);
      expect(balAfter - balBefore).to.equal(ethers.parseEther("1"));
    });

    it("should revert double execution", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { treasury } = contracts;
      const { admin, author1 } = actors;

      await admin.sendTransaction({ to: await treasury.getAddress(), value: ethers.parseEther("10") });
      await treasury.connect(admin).createSpendRequest(0, author1.address, ethers.parseEther("1"), "reward", 0);

      const SPEND_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SPEND_ROLE"));
      await treasury.connect(admin).grantRole(SPEND_ROLE, admin.address);

      await treasury.connect(admin).executeSpend(1);
      await expect(treasury.connect(admin).executeSpend(1)).to.be.reverted;
    });
  });

  describe("getTotals", () => {
    it("should track income and spending", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { treasury } = contracts;
      const { admin, author1 } = actors;

      await admin.sendTransaction({ to: await treasury.getAddress(), value: ethers.parseEther("5") });
      const DISTRIBUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE"));
      await treasury.connect(admin).grantRole(DISTRIBUTOR_ROLE, admin.address);
      await treasury.connect(admin).distributeProposalReward(1, author1.address, ethers.parseEther("1"));

      const [income, spent] = await treasury.getTotals();
      expect(income).to.equal(ethers.parseEther("5"));
      expect(spent).to.equal(ethers.parseEther("0.7")); // 70% of 1 ETH
    });
  });
});
