import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture } from "../fixtures/deployFixture";

describe("PolkaInkRegistry", () => {
  // ─── createDocument ───────────────────────────────────────────────────

  describe("createDocument", () => {
    it("should create document with correct fields", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { registry } = contracts;
      const { author1 } = actors;

      await expect(
        registry.connect(author1).createDocument("Polkadot History", ["polkadot", "history"])
      )
        .to.emit(registry, "DocumentCreated")
        .withArgs(1, author1.address, "Polkadot History", ["polkadot", "history"], (v: bigint) => v > 0n);

      const doc = await registry.getDocument(1);
      expect(doc.id).to.equal(1n);
      expect(doc.title).to.equal("Polkadot History");
      expect(doc.author).to.equal(author1.address);
      expect(doc.currentVersionId).to.equal(0n);
      expect(doc.status).to.equal(0); // Active
    });

    it("should increment document counter", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { registry } = contracts;
      const { author1 } = actors;

      await registry.connect(author1).createDocument("Doc 1", []);
      await registry.connect(author1).createDocument("Doc 2", []);
      expect(await registry.totalDocuments()).to.equal(2n);
    });

    it("should revert on empty title", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { registry } = contracts;
      await expect(
        registry.connect(actors.author1).createDocument("", [])
      ).to.be.revertedWithCustomError(registry, "Registry__InvalidTitle");
    });

    it("should revert on too many tags", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { registry } = contracts;
      const tags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
      await expect(
        registry.connect(actors.author1).createDocument("Doc", tags)
      ).to.be.revertedWithCustomError(registry, "Registry__TooManyTags");
    });

    it("should revert on title exceeding 200 bytes", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { registry } = contracts;
      const longTitle = "A".repeat(201);
      await expect(
        registry.connect(actors.author1).createDocument(longTitle, [])
      ).to.be.revertedWithCustomError(registry, "Registry__InvalidTitle");
    });
  });

  // ─── proposeVersion ───────────────────────────────────────────────────

  describe("proposeVersion", () => {
    it("should propose version and emit VersionProposed event", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { registry } = contracts;
      const { author1 } = actors;

      await registry.connect(author1).createDocument("Test Doc", []);
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("Hello Polkadot"));
      const markdownData = ethers.toUtf8Bytes("# Hello Polkadot");
      const minStake = ethers.parseUnits("5", 12);

      await expect(
        registry.connect(author1).proposeVersion(1, 0, contentHash, markdownData, { value: minStake })
      ).to.emit(registry, "VersionProposed");
    });

    it("should revert on non-existent document", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { registry } = contracts;
      await expect(
        registry.connect(actors.author1).proposeVersion(
          999, 0, ethers.ZeroHash, "0x", { value: ethers.parseUnits("5", 12) }
        )
      ).to.be.revertedWithCustomError(registry, "Registry__DocumentNotFound");
    });

    it("should revert on archived document", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { registry } = contracts;
      const { author1 } = actors;

      await registry.connect(author1).createDocument("Archived", []);
      // Admin grants governance role
      await registry.connect(actors.admin).grantRole(
        ethers.keccak256(ethers.toUtf8Bytes("GOVERNANCE_ROLE")),
        actors.admin.address
      );
      await registry.connect(actors.admin).archiveDocument(1);

      await expect(
        registry.connect(author1).proposeVersion(
          1, 0, ethers.ZeroHash, "0x", { value: ethers.parseUnits("5", 12) }
        )
      ).to.be.revertedWithCustomError(registry, "Registry__DocumentArchived");
    });
  });

  // ─── listDocuments / getVersionHistory ───────────────────────────────

  describe("listDocuments", () => {
    it("should paginate documents correctly", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { registry } = contracts;
      const { author1 } = actors;

      for (let i = 0; i < 5; i++) {
        await registry.connect(author1).createDocument(`Doc ${i}`, []);
      }

      const [docs, total] = await registry.listDocuments(0, 3);
      expect(total).to.equal(5n);
      expect(docs.length).to.equal(3);
    });

    it("should return empty array when offset exceeds total", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { registry } = contracts;

      const [docs, total] = await registry.listDocuments(100, 10);
      expect(total).to.equal(0n);
      expect(docs.length).to.equal(0);
    });
  });

  // ─── updateTags ───────────────────────────────────────────────────────

  describe("updateTags", () => {
    it("should allow author to update tags", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { registry } = contracts;
      const { author1 } = actors;

      await registry.connect(author1).createDocument("Doc", ["old"]);
      await expect(
        registry.connect(author1).updateTags(1, ["new", "updated"])
      ).to.emit(registry, "TagsUpdated");

      const doc = await registry.getDocument(1);
      expect(doc.tags).to.deep.equal(["new", "updated"]);
    });

    it("should revert if caller is not author or governance", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { registry } = contracts;
      const { author1, author2 } = actors;

      await registry.connect(author1).createDocument("Doc", []);
      await expect(
        registry.connect(author2).updateTags(1, ["hack"])
      ).to.be.revertedWithCustomError(registry, "Registry__Unauthorized");
    });
  });
});
