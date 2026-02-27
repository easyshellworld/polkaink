import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture } from "../fixtures/deployFixture";

describe("NFTReward", () => {
  async function mintAuthorNFT(ctx: Awaited<ReturnType<typeof deployFixture>>, recipient: string) {
    const { contracts, actors } = ctx;
    // Grant AUTHOR_MINTER_ROLE to admin for direct minting in tests
    await contracts.nftReward
      .connect(actors.admin)
      .grantRole(ethers.keccak256(ethers.toUtf8Bytes("AUTHOR_MINTER_ROLE")), actors.admin.address);
    await contracts.nftReward.connect(actors.admin).mintAuthorNFT(recipient, 1, 1, 1);
  }

  describe("mintAuthorNFT", () => {
    it("should mint Author NFT and emit event", async () => {
      const ctx = await loadFixture(deployFixture);
      const { contracts, actors } = ctx;

      await contracts.nftReward
        .connect(actors.admin)
        .grantRole(
          ethers.keccak256(ethers.toUtf8Bytes("AUTHOR_MINTER_ROLE")),
          actors.admin.address
        );

      await expect(
        contracts.nftReward.connect(actors.admin).mintAuthorNFT(actors.author1.address, 1, 1, 1)
      )
        .to.emit(contracts.nftReward, "AuthorNFTMinted")
        .withArgs((v: bigint) => v > 0n, actors.author1.address, 1, 1, 1);

      const count = await contracts.nftReward.authorNFTCount(actors.author1.address);
      expect(count).to.equal(1n);
    });

    it("should be transferable (not soulbound by default)", async () => {
      const ctx = await loadFixture(deployFixture);
      const { contracts, actors } = ctx;
      await mintAuthorNFT(ctx, actors.author1.address);

      // Token ID for the first Author NFT (council minted 7 guardian NFTs already, so ID = 8)
      const authorNFTs = await contracts.nftReward.getAuthorNFTs(actors.author1.address);
      const tokenId = authorNFTs[0];

      // Should transfer without revert
      await expect(
        contracts.nftReward
          .connect(actors.author1)
          .transferFrom(actors.author1.address, actors.author2.address, tokenId)
      ).to.not.be.reverted;
    });

    it("should block transfer when locked (soulbound)", async () => {
      const ctx = await loadFixture(deployFixture);
      const { contracts, actors } = ctx;
      await mintAuthorNFT(ctx, actors.author1.address);

      const authorNFTs = await contracts.nftReward.getAuthorNFTs(actors.author1.address);
      const tokenId = authorNFTs[0];

      await contracts.nftReward.connect(actors.author1).setAuthorNFTLock(tokenId, true);

      await expect(
        contracts.nftReward
          .connect(actors.author1)
          .transferFrom(actors.author1.address, actors.author2.address, tokenId)
      ).to.be.revertedWithCustomError(contracts.nftReward, "NFT__Soulbound");
    });
  });

  describe("Guardian NFT", () => {
    it("should already have Guardian NFTs for council members post-deploy", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      for (const member of actors.councilMembers) {
        const nfts = await contracts.nftReward.getGuardianNFTs(member.address);
        expect(nfts.length).to.equal(1);
      }
    });

    it("should be soulbound (non-transferable)", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const member = actors.councilMembers[0];
      const nfts = await contracts.nftReward.getGuardianNFTs(member.address);
      const tokenId = nfts[0];

      await expect(
        contracts.nftReward
          .connect(member)
          .transferFrom(member.address, actors.voter1.address, tokenId)
      ).to.be.revertedWithCustomError(contracts.nftReward, "NFT__Soulbound");
    });

    it("should deactivate Guardian NFT", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const member = actors.councilMembers[0];
      const nfts = await contracts.nftReward.getGuardianNFTs(member.address);
      const tokenId = nfts[0];

      await contracts.nftReward
        .connect(actors.admin)
        .grantRole(
          ethers.keccak256(ethers.toUtf8Bytes("GUARDIAN_MINTER_ROLE")),
          actors.admin.address
        );

      await expect(contracts.nftReward.connect(actors.admin).deactivateGuardianNFT(tokenId))
        .to.emit(contracts.nftReward, "GuardianNFTDeactivated");

      const meta = await contracts.nftReward.getNFTMetadata(tokenId);
      expect(meta.active).to.be.false;
    });
  });

  describe("tokenURI", () => {
    it("should return on-chain JSON tokenURI", async () => {
      const ctx = await loadFixture(deployFixture);
      const { contracts, actors } = ctx;
      await mintAuthorNFT(ctx, actors.author1.address);

      const authorNFTs = await contracts.nftReward.getAuthorNFTs(actors.author1.address);
      const tokenId = authorNFTs[0];
      const uri = await contracts.nftReward.tokenURI(tokenId);
      expect(uri).to.include("data:application/json");
      expect(uri).to.include("PolkaInk Author");
    });
  });

  describe("totalMinted", () => {
    it("should track total Author and Guardian NFT counts", async () => {
      const { contracts } = await loadFixture(deployFixture);
      // 7 Guardian NFTs minted on deploy
      const guardianTotal = await contracts.nftReward.totalMinted(1); // Guardian = 1
      expect(guardianTotal).to.equal(7n);
      const authorTotal = await contracts.nftReward.totalMinted(0); // Author = 0
      expect(authorTotal).to.equal(0n);
    });
  });
});
