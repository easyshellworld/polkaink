import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture, stakeFor } from "../fixtures/deployFixture";

describe("NFTReward v2", () => {
  describe("Member NFT", () => {
    it("should be minted on stake and tracked", async () => {
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
  });

  describe("Author NFT", () => {
    it("should be minted on document creation", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1);

      await contracts.registry.connect(actors.author1).createDocument("Test Doc", ["test"]);
      expect(await contracts.nftReward.isAuthorOf(actors.author1.address, 1)).to.be.true;
    });
  });

  describe("OG NFTs", () => {
    it("should mint OG Gold and have active status", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      // ogGoldHolder already has OG Gold from fixture
      expect(await contracts.nftReward.hasActiveOGGold(actors.ogGoldHolder.address)).to.be.true;
    });

    it("should enforce OG caps", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      // ogGoldHolder already has 1 OG Gold, try to mint another
      await expect(
        contracts.nftReward.connect(actors.admin).mintOGNFT(actors.ogGoldHolder.address, 5)
      ).to.be.revertedWithCustomError(contracts.nftReward, "NFT__OGCapReached");
    });

    it("should allow multiple OG Bronze (up to 3)", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await contracts.nftReward.mintOGNFT(actors.voter1.address, 3); // OGBronze=3
      await contracts.nftReward.mintOGNFT(actors.voter1.address, 3);
      await contracts.nftReward.mintOGNFT(actors.voter1.address, 3);
      await expect(
        contracts.nftReward.mintOGNFT(actors.voter1.address, 3)
      ).to.be.revertedWithCustomError(contracts.nftReward, "NFT__OGCapReached");
    });

    it("should revoke OG Gold", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const nfts = await contracts.nftReward.getNFTsByType(actors.ogGoldHolder.address, 5);
      await contracts.nftReward.connect(actors.admin).revokeOGGold(nfts[0]);
      expect(await contracts.nftReward.hasActiveOGGold(actors.ogGoldHolder.address)).to.be.false;
    });
  });

  describe("tokenURI", () => {
    it("should return on-chain JSON", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1);
      const nfts = await contracts.nftReward.getNFTsByType(actors.author1.address, 0);
      const uri = await contracts.nftReward.tokenURI(nfts[0]);
      expect(uri).to.include("data:application/json");
      expect(uri).to.include("Member");
    });
  });
});
