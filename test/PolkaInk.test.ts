import { expect } from "chai";
import { ethers } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { PolkaInk } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("PolkaInk", function () {
  let polkaInk: PolkaInk;
  let owner: SignerWithAddress;
  let author: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;
  let voter3: SignerWithAddress;

  // Test content hash (simulating sha256 of Markdown)
  const contentHash = ethers.keccak256(ethers.toUtf8Bytes("# Hello PolkaInk"));

  beforeEach(async function () {
    [owner, author, voter1, voter2, voter3] = await ethers.getSigners();

    const PolkaInkFactory = await ethers.getContractFactory("PolkaInk");
    polkaInk = await PolkaInkFactory.deploy();
    await polkaInk.waitForDeployment();
  });

  // ─────────────────────────────────────────────────────────────────
  //  Document Creation
  // ─────────────────────────────────────────────────────────────────

  describe("Document Creation", function () {
    it("should create a document with initial version", async function () {
      const tx = await polkaInk.connect(author).createDocument(
        "Polkadot Genesis Story",
        ["history", "polkadot"],
        contentHash,
        0, // CompressionType.None
        1024
      );

      await expect(tx)
        .to.emit(polkaInk, "DocumentCreated")
        .withArgs(1, author.address, "Polkadot Genesis Story", ["history", "polkadot"], anyValue);

      await expect(tx)
        .to.emit(polkaInk, "VersionStored");

      // Verify document state
      const doc = await polkaInk.getDocument(1);
      expect(doc.id).to.equal(1);
      expect(doc.title).to.equal("Polkadot Genesis Story");
      expect(doc.author).to.equal(author.address);
      expect(doc.currentVersionId).to.equal(1);
      expect(doc.status).to.equal(0); // Active
      expect(doc.tags).to.deep.equal(["history", "polkadot"]);

      // Verify version
      const ver = await polkaInk.getVersion(1);
      expect(ver.docId).to.equal(1);
      expect(ver.parentVersionId).to.equal(0); // Initial version
      expect(ver.author).to.equal(author.address);
      expect(ver.contentHash).to.equal(contentHash);
      expect(ver.contentLength).to.equal(1024);

      // Verify counters
      expect(await polkaInk.totalDocuments()).to.equal(1);
      expect(await polkaInk.totalVersions()).to.equal(1);
    });

    it("should reject empty title", async function () {
      await expect(
        polkaInk.createDocument("", ["tag"], contentHash, 0, 100)
      ).to.be.revertedWithCustomError(polkaInk, "InvalidTitle");
    });

    it("should reject too many tags", async function () {
      const manyTags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
      await expect(
        polkaInk.createDocument("Title", manyTags, contentHash, 0, 100)
      ).to.be.revertedWithCustomError(polkaInk, "TooManyTags");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  Proposal & Voting
  // ─────────────────────────────────────────────────────────────────

  describe("Proposal System", function () {
    const newContentHash = ethers.keccak256(ethers.toUtf8Bytes("# Updated content"));

    beforeEach(async function () {
      // Create a document first
      await polkaInk.connect(author).createDocument(
        "Test Document",
        ["test"],
        contentHash,
        0,
        512
      );
    });

    it("should create a version proposal with stake", async function () {
      const stakeAmount = ethers.parseEther("0.001"); // minStake

      const tx = await polkaInk.connect(author).proposeVersion(
        1,                // docId
        1,                // parentVersionId (based on v1)
        newContentHash,
        0,                // CompressionType.None
        2048,
        "Updated the governance section",
        { value: stakeAmount }
      );

      await expect(tx).to.emit(polkaInk, "ProposalCreated");
      await expect(tx).to.emit(polkaInk, "VersionStored");

      const prop = await polkaInk.getProposal(1);
      expect(prop.proposer).to.equal(author.address);
      expect(prop.docId).to.equal(1);
      expect(prop.stakeAmount).to.equal(stakeAmount);
      expect(prop.status).to.equal(1); // Active
      expect(prop.yesVotes).to.equal(0);
      expect(prop.noVotes).to.equal(0);
    });

    it("should reject proposal with insufficient stake", async function () {
      const lowStake = ethers.parseEther("0.0001"); // Below minStake

      await expect(
        polkaInk.connect(author).proposeVersion(
          1, 1, newContentHash, 0, 2048, "desc",
          { value: lowStake }
        )
      ).to.be.revertedWithCustomError(polkaInk, "InsufficientStake");
    });

    it("should allow voting on proposals", async function () {
      const stakeAmount = ethers.parseEther("0.001");
      await polkaInk.connect(author).proposeVersion(
        1, 1, newContentHash, 0, 2048, "desc",
        { value: stakeAmount }
      );

      // Vote yes
      await expect(polkaInk.connect(voter1).vote(1, true))
        .to.emit(polkaInk, "VoteCast")
        .withArgs(1, voter1.address, true, anyValue);

      // Vote no
      await polkaInk.connect(voter2).vote(1, false);

      const prop = await polkaInk.getProposal(1);
      expect(prop.yesVotes).to.equal(1);
      expect(prop.noVotes).to.equal(1);
    });

    it("should prevent double voting", async function () {
      const stakeAmount = ethers.parseEther("0.001");
      await polkaInk.connect(author).proposeVersion(
        1, 1, newContentHash, 0, 2048, "desc",
        { value: stakeAmount }
      );

      await polkaInk.connect(voter1).vote(1, true);

      await expect(
        polkaInk.connect(voter1).vote(1, true)
      ).to.be.revertedWithCustomError(polkaInk, "AlreadyVoted");
    });

    it("should execute passed proposal and update document version", async function () {
      const stakeAmount = ethers.parseEther("0.002");
      await polkaInk.connect(author).proposeVersion(
        1, 1, newContentHash, 0, 2048, "Updated governance",
        { value: stakeAmount }
      );

      // Vote yes (60%+ needed)
      await polkaInk.connect(voter1).vote(1, true);
      await polkaInk.connect(voter2).vote(1, true);
      await polkaInk.connect(voter3).vote(1, false);
      // 2 yes / 1 no = 66.7% > 60% threshold

      // Fast forward past voting period
      await ethers.provider.send("evm_increaseTime", [3 * 86400 + 1]); // 3 days + 1 sec
      await ethers.provider.send("evm_mine", []);

      // Record balances before execution
      const balBefore = await ethers.provider.getBalance(author.address);

      // Execute
      const tx = await polkaInk.connect(voter1).executeProposal(1);
      await expect(tx).to.emit(polkaInk, "ProposalExecuted");

      // Verify document was updated
      const doc = await polkaInk.getDocument(1);
      expect(doc.currentVersionId).to.equal(2); // Updated to version 2

      // Verify proposal status
      const prop = await polkaInk.getProposal(1);
      expect(prop.status).to.equal(3); // Executed

      // Verify stake was returned
      const balAfter = await ethers.provider.getBalance(author.address);
      expect(balAfter).to.be.gt(balBefore);
    });

    it("should reject and slash stake on failed proposal", async function () {
      const stakeAmount = ethers.parseEther("0.01");
      await polkaInk.connect(author).proposeVersion(
        1, 1, newContentHash, 0, 2048, "Bad proposal",
        { value: stakeAmount }
      );

      // Vote no (majority)
      await polkaInk.connect(voter1).vote(1, false);
      await polkaInk.connect(voter2).vote(1, false);
      await polkaInk.connect(voter3).vote(1, true);
      // 1 yes / 2 no = 33.3% < 60% threshold

      // Fast forward
      await ethers.provider.send("evm_increaseTime", [3 * 86400 + 1]);
      await ethers.provider.send("evm_mine", []);

      const tx = await polkaInk.connect(voter1).executeProposal(1);
      await expect(tx).to.emit(polkaInk, "ProposalRejected");
      await expect(tx).to.emit(polkaInk, "StakeSlashed");

      const prop = await polkaInk.getProposal(1);
      expect(prop.status).to.equal(4); // Rejected
    });

    it("should allow proposer to cancel before votes", async function () {
      const stakeAmount = ethers.parseEther("0.001");
      await polkaInk.connect(author).proposeVersion(
        1, 1, newContentHash, 0, 2048, "Cancellable",
        { value: stakeAmount }
      );

      const balBefore = await ethers.provider.getBalance(author.address);

      const tx = await polkaInk.connect(author).cancelProposal(1);
      await expect(tx).to.emit(polkaInk, "ProposalCancelled");

      const prop = await polkaInk.getProposal(1);
      expect(prop.status).to.equal(5); // Cancelled

      // Stake should be returned
      const balAfter = await ethers.provider.getBalance(author.address);
      // Balance should be close to before (minus gas costs)
      expect(balAfter).to.be.gt(balBefore - ethers.parseEther("0.001"));
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  Version History
  // ─────────────────────────────────────────────────────────────────

  describe("Version History", function () {
    it("should track version history correctly", async function () {
      // Create document (version 1)
      await polkaInk.connect(author).createDocument(
        "History Doc",
        ["history"],
        contentHash,
        0,
        512
      );

      // Verify version history
      const history = await polkaInk.getVersionHistory(1);
      expect(history.length).to.equal(1);
      expect(history[0]).to.equal(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  Pagination
  // ─────────────────────────────────────────────────────────────────

  describe("Pagination", function () {
    it("should paginate documents correctly", async function () {
      // Create 3 documents
      for (let i = 1; i <= 3; i++) {
        await polkaInk.connect(author).createDocument(
          `Document ${i}`,
          [`tag${i}`],
          contentHash,
          0,
          100 * i
        );
      }

      const [docs, total] = await polkaInk.listDocuments(0, 2);
      expect(total).to.equal(3);
      expect(docs.length).to.equal(2);
      expect(docs[0].title).to.equal("Document 1");
      expect(docs[1].title).to.equal("Document 2");

      const [docs2] = await polkaInk.listDocuments(2, 2);
      expect(docs2.length).to.equal(1);
      expect(docs2[0].title).to.equal("Document 3");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  //  Admin Functions
  // ─────────────────────────────────────────────────────────────────

  describe("Admin Functions", function () {
    it("should allow owner to update governance params", async function () {
      await polkaInk.connect(owner).updateGovernanceParams(
        ethers.parseEther("0.01"),  // minStake
        7 * 86400,                  // votingPeriod: 7 days
        70,                         // passingThreshold: 70%
        40,                         // slashRatioNormal: 40%
        15                          // maxTagsPerDoc
      );

      const params = await polkaInk.params();
      expect(params.minStake).to.equal(ethers.parseEther("0.01"));
      expect(params.votingPeriod).to.equal(7 * 86400);
      expect(params.passingThreshold).to.equal(70);
    });

    it("should reject non-owner admin calls", async function () {
      await expect(
        polkaInk.connect(author).updateGovernanceParams(0, 0, 50, 30, 10)
      ).to.be.revertedWithCustomError(polkaInk, "OnlyOwner");
    });

    it("should allow owner to archive documents", async function () {
      await polkaInk.connect(author).createDocument(
        "To Archive", ["test"], contentHash, 0, 100
      );

      await expect(polkaInk.connect(owner).archiveDocument(1))
        .to.emit(polkaInk, "DocumentArchived")
        .withArgs(1, anyValue);

      const doc = await polkaInk.getDocument(1);
      expect(doc.status).to.equal(1); // Archived
    });
  });
});

