import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture, stakeFor } from "../fixtures/deployFixture";

describe("PolkaInkRegistry v2", () => {
  describe("createDocument", () => {
    it("should create document and mint Author NFT for active members", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1);

      await expect(
        contracts.registry.connect(actors.author1).createDocument("Polkadot History", ["polkadot"])
      ).to.emit(contracts.registry, "DocumentCreated");

      const doc = await contracts.registry.getDocument(1);
      expect(doc.title).to.equal("Polkadot History");
      expect(doc.author).to.equal(actors.author1.address);

      // Author NFT should be minted
      expect(await contracts.nftReward.isAuthorOf(actors.author1.address, 1)).to.be.true;
    });

    it("should revert for non-members", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await expect(
        contracts.registry.connect(actors.author1).createDocument("Doc", [])
      ).to.be.revertedWithCustomError(contracts.registry, "Registry__NotActiveMember");
    });

    it("should revert on empty title", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1);
      await expect(
        contracts.registry.connect(actors.author1).createDocument("", [])
      ).to.be.revertedWithCustomError(contracts.registry, "Registry__InvalidTitle");
    });

    it("should revert on too many tags", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1);
      const tags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
      await expect(
        contracts.registry.connect(actors.author1).createDocument("Doc", tags)
      ).to.be.revertedWithCustomError(contracts.registry, "Registry__TooManyTags");
    });
  });

  describe("proposeVersion", () => {
    it("should propose version (non-payable) for active members", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1);
      await contracts.registry.connect(actors.author1).createDocument("Test Doc", []);

      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("content"));
      await expect(
        contracts.registry.connect(actors.author1).proposeVersion(
          1, 0, contentHash, ethers.toUtf8Bytes("# Content")
        )
      ).to.emit(contracts.registry, "VersionProposed");
    });

    it("should revert for non-members", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1);
      await contracts.registry.connect(actors.author1).createDocument("Doc", []);

      await expect(
        contracts.registry.connect(actors.voter1).proposeVersion(
          1, 0, ethers.ZeroHash, "0x"
        )
      ).to.be.revertedWithCustomError(contracts.registry, "Registry__NotActiveMember");
    });
  });

  describe("listDocuments", () => {
    it("should paginate correctly", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1);
      for (let i = 0; i < 5; i++) {
        await contracts.registry.connect(actors.author1).createDocument(`Doc ${i}`, []);
      }
      const [docs, total] = await contracts.registry.listDocuments(0, 3);
      expect(total).to.equal(5n);
      expect(docs.length).to.equal(3);
    });
  });
});
