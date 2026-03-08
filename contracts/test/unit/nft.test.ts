import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture, stakeFor } from "../fixtures/deployFixture";

describe("NFTReward v3.3", () => {
  describe("Guardian NFT", () => {
    it("should mint Guardian NFTs in constructor for all 7 genesis members", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      // councilMember1 and councilMember2 are among genesis members
      expect(await contracts.nftReward.hasActiveGuardian(actors.councilMember1.address)).to.be.true;
      expect(await contracts.nftReward.hasActiveGuardian(actors.councilMember2.address)).to.be.true;
    });

    it("should NOT have GUARDIAN_MINTER_ROLE on any address", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const GUARDIAN_MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GUARDIAN_MINTER_ROLE"));
      expect(
        await (contracts.nftReward as any).hasRole(GUARDIAN_MINTER_ROLE, actors.admin.address)
      ).to.be.false;
    });
  });

  describe("Member NFT", () => {
    it("should be minted on stake", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1);
      expect(await contracts.nftReward.hasActiveMember(actors.author1.address)).to.be.true;
      const nfts = await contracts.nftReward.getNFTsByType(actors.author1.address, 0); // Member=0
      expect(nfts.length).to.equal(1);
    });

    it("should be soulbound (non-transferable)", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1);
      const nfts = await contracts.nftReward.getNFTsByType(actors.author1.address, 0);
      await expect(
        contracts.nftReward.connect(actors.author1).transferFrom(
          actors.author1.address, actors.author2.address, nfts[0]
        )
      ).to.be.revertedWithCustomError(contracts.nftReward, "NFT__Soulbound");
    });

    it("should deactivate Member NFT on unstake", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1, 3);

      const { time } = await import("@nomicfoundation/hardhat-toolbox/network-helpers");
      await time.increase(3 * 30 * 24 * 3600 + 1);

      await contracts.stakingManager.connect(actors.author1).unstake();
      expect(await contracts.nftReward.hasActiveMember(actors.author1.address)).to.be.false;
    });
  });

  describe("Creator NFT", () => {
    it("should be minted by CREATOR_MINTER_ROLE only", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      // Direct mint from non-CREATOR_MINTER should fail
      await expect(
        contracts.nftReward.connect(actors.author1).mintCreatorNFT(
          actors.author1.address, 1, 1
        )
      ).to.be.reverted;
    });
  });
});
