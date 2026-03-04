import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture } from "../fixtures/deployFixture";

describe("Treasury v2", () => {
  describe("receive", () => {
    it("should accept DOT and track income", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await actors.admin.sendTransaction({
        to: await contracts.treasury.getAddress(),
        value: ethers.parseEther("1"),
      });
      const bal = await contracts.treasury.balance();
      expect(bal).to.equal(ethers.parseEther("1"));
      const [income] = await contracts.treasury.getTotals();
      expect(income).to.equal(ethers.parseEther("1"));
    });
  });

  describe("createSpendRequest / executeSpend", () => {
    it("should create and execute spend", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      // Fund treasury
      await actors.admin.sendTransaction({
        to: await contracts.treasury.getAddress(),
        value: ethers.parseEther("10"),
      });

      await contracts.treasury.connect(actors.admin).createSpendRequest(
        0, actors.author1.address, ethers.parseEther("1"), "reward", 0
      );

      const SPEND_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SPEND_ROLE"));
      await contracts.treasury.connect(actors.admin).grantRole(SPEND_ROLE, actors.admin.address);

      const balBefore = await ethers.provider.getBalance(actors.author1.address);
      await contracts.treasury.connect(actors.admin).executeSpend(1);
      const balAfter = await ethers.provider.getBalance(actors.author1.address);

      expect(balAfter - balBefore).to.equal(ethers.parseEther("1"));
    });
  });
});
