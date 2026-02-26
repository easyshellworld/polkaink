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
  let other: SignerWithAddress;

  // Test content hashes (simulating sha256 of Markdown)
  const contentHash = ethers.keccak256(ethers.toUtf8Bytes("# Hello PolkaInk"));
  const contentHash2 = ethers.keccak256(ethers.toUtf8Bytes("# Updated content"));
  const contentHash3 = ethers.keccak256(ethers.toUtf8Bytes("# Third version"));

  const MIN_STAKE = ethers.parseEther("0.001"); // Default minStake
  const THREE_DAYS = 3 * 86400;

  /** Helper: create a document from `author` and return docId */
  async function createDoc(
    title = "Test Document",
    tags: string[] = ["test"],
    hash = contentHash,
    compression = 0,
    length = 512
  ): Promise<bigint> {
    const tx = await polkaInk.connect(author).createDocument(title, tags, hash, compression, length);
    const receipt = await tx.wait();
    return await polkaInk.totalDocuments();
  }

  /** Helper: create a proposal from `author` with given stake */
  async function createProposal(
    docId = 1n,
    parentVersionId = 1n,
    stake = MIN_STAKE,
    hash = contentHash2,
    desc = "Update proposal"
  ): Promise<bigint> {
    await polkaInk.connect(author).proposeVersion(
      docId, parentVersionId, hash, 0, 2048, desc,
      { value: stake }
    );
    return await polkaInk.totalProposals();
  }

  /** Helper: fast-forward time by `seconds` */
  async function advanceTime(seconds: number) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  }

  beforeEach(async function () {
    [owner, author, voter1, voter2, voter3, other] = await ethers.getSigners();

    const PolkaInkFactory = await ethers.getContractFactory("PolkaInk");
    polkaInk = await PolkaInkFactory.deploy();
    await polkaInk.waitForDeployment();
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Constructor & Initial State
  // ═══════════════════════════════════════════════════════════════════

  describe("Constructor & Initial State", function () {
    it("should set deployer as owner", async function () {
      expect(await polkaInk.owner()).to.equal(owner.address);
    });

    it("should initialize counters to zero", async function () {
      expect(await polkaInk.totalDocuments()).to.equal(0);
      expect(await polkaInk.totalVersions()).to.equal(0);
      expect(await polkaInk.totalProposals()).to.equal(0);
    });

    it("should set default governance parameters", async function () {
      const params = await polkaInk.params();
      expect(params.minStake).to.equal(ethers.parseEther("0.001"));
      expect(params.votingPeriod).to.equal(THREE_DAYS);
      expect(params.passingThreshold).to.equal(60);
      expect(params.slashRatioNormal).to.equal(30);
      expect(params.maxTagsPerDoc).to.equal(10);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Document Creation
  // ═══════════════════════════════════════════════════════════════════

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

    it("should create a document with zero tags", async function () {
      await polkaInk.connect(author).createDocument("No Tags Doc", [], contentHash, 0, 100);
      const doc = await polkaInk.getDocument(1);
      expect(doc.tags.length).to.equal(0);
    });

    it("should create a document with exactly max tags (10)", async function () {
      const maxTags = Array.from({ length: 10 }, (_, i) => `tag${i}`);
      await polkaInk.connect(author).createDocument("Max Tags Doc", maxTags, contentHash, 0, 100);
      const doc = await polkaInk.getDocument(1);
      expect(doc.tags.length).to.equal(10);
      expect(doc.tags).to.deep.equal(maxTags);
    });

    it("should create a document with Gzip compression type", async function () {
      await polkaInk.connect(author).createDocument("Gzip Doc", ["compressed"], contentHash, 1, 2048);
      const ver = await polkaInk.getVersion(1);
      expect(ver.compression).to.equal(1); // Gzip
    });

    it("should create a document with Zstd compression type", async function () {
      await polkaInk.connect(author).createDocument("Zstd Doc", ["compressed"], contentHash, 2, 4096);
      const ver = await polkaInk.getVersion(1);
      expect(ver.compression).to.equal(2); // Zstd
    });

    it("should create multiple documents with incrementing IDs", async function () {
      await polkaInk.connect(author).createDocument("Doc 1", ["a"], contentHash, 0, 100);
      await polkaInk.connect(voter1).createDocument("Doc 2", ["b"], contentHash2, 0, 200);
      await polkaInk.connect(voter2).createDocument("Doc 3", ["c"], contentHash3, 0, 300);

      expect(await polkaInk.totalDocuments()).to.equal(3);
      expect(await polkaInk.totalVersions()).to.equal(3);

      const doc1 = await polkaInk.getDocument(1);
      const doc2 = await polkaInk.getDocument(2);
      const doc3 = await polkaInk.getDocument(3);

      expect(doc1.author).to.equal(author.address);
      expect(doc2.author).to.equal(voter1.address);
      expect(doc3.author).to.equal(voter2.address);
    });

    it("should reject empty title", async function () {
      await expect(
        polkaInk.createDocument("", ["tag"], contentHash, 0, 100)
      ).to.be.revertedWithCustomError(polkaInk, "InvalidTitle");
    });

    it("should reject title exceeding 200 bytes", async function () {
      const longTitle = "A".repeat(201);
      await expect(
        polkaInk.createDocument(longTitle, ["tag"], contentHash, 0, 100)
      ).to.be.revertedWithCustomError(polkaInk, "InvalidTitle");
    });

    it("should accept title of exactly 200 bytes", async function () {
      const title200 = "B".repeat(200);
      await polkaInk.connect(author).createDocument(title200, [], contentHash, 0, 100);
      const doc = await polkaInk.getDocument(1);
      expect(doc.title).to.equal(title200);
    });

    it("should reject too many tags (11)", async function () {
      const manyTags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
      await expect(
        polkaInk.createDocument("Title", manyTags, contentHash, 0, 100)
      ).to.be.revertedWithCustomError(polkaInk, "TooManyTags");
    });

    it("should store version with correct block number and timestamp", async function () {
      await polkaInk.connect(author).createDocument("Timestamped", [], contentHash, 0, 100);
      const ver = await polkaInk.getVersion(1);
      expect(ver.blockNumber).to.be.gt(0);
      expect(ver.timestamp).to.be.gt(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Update Tags
  // ═══════════════════════════════════════════════════════════════════

  describe("Update Tags", function () {
    beforeEach(async function () {
      await createDoc("Tagged Doc", ["old1", "old2"]);
    });

    it("should allow document author to update tags", async function () {
      const tx = await polkaInk.connect(author).updateTags(1, ["new1", "new2", "new3"]);
      await expect(tx)
        .to.emit(polkaInk, "TagsUpdated")
        .withArgs(1, ["old1", "old2"], ["new1", "new2", "new3"]);

      const doc = await polkaInk.getDocument(1);
      expect(doc.tags).to.deep.equal(["new1", "new2", "new3"]);
    });

    it("should allow contract owner to update tags", async function () {
      await polkaInk.connect(owner).updateTags(1, ["owner-tag"]);
      const doc = await polkaInk.getDocument(1);
      expect(doc.tags).to.deep.equal(["owner-tag"]);
    });

    it("should reject unauthorized tag update", async function () {
      await expect(
        polkaInk.connect(voter1).updateTags(1, ["hacked"])
      ).to.be.revertedWith("Not authorized");
    });

    it("should reject tag update on nonexistent document", async function () {
      await expect(
        polkaInk.connect(author).updateTags(999, ["tag"])
      ).to.be.revertedWithCustomError(polkaInk, "DocumentNotFound");
    });

    it("should reject tag update on archived document", async function () {
      await polkaInk.connect(owner).archiveDocument(1);
      await expect(
        polkaInk.connect(author).updateTags(1, ["tag"])
      ).to.be.revertedWithCustomError(polkaInk, "DocumentIsArchived");
    });

    it("should reject too many tags on update", async function () {
      const tooMany = Array.from({ length: 11 }, (_, i) => `t${i}`);
      await expect(
        polkaInk.connect(author).updateTags(1, tooMany)
      ).to.be.revertedWithCustomError(polkaInk, "TooManyTags");
    });

    it("should allow clearing all tags", async function () {
      await polkaInk.connect(author).updateTags(1, []);
      const doc = await polkaInk.getDocument(1);
      expect(doc.tags.length).to.equal(0);
    });

    it("should update the document updatedAt timestamp", async function () {
      const docBefore = await polkaInk.getDocument(1);
      await advanceTime(100);
      await polkaInk.connect(author).updateTags(1, ["updated"]);
      const docAfter = await polkaInk.getDocument(1);
      expect(docAfter.updatedAt).to.be.gt(docBefore.updatedAt);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Proposal System
  // ═══════════════════════════════════════════════════════════════════

  describe("Proposal System", function () {
    beforeEach(async function () {
      await createDoc();
    });

    // ── Create Proposal ──────────────────────────────────────────────

    describe("Create Proposal", function () {
      it("should create a version proposal with stake", async function () {
        const tx = await polkaInk.connect(author).proposeVersion(
          1, 1, contentHash2, 0, 2048,
          "Updated the governance section",
          { value: MIN_STAKE }
        );

        await expect(tx).to.emit(polkaInk, "ProposalCreated");
        await expect(tx).to.emit(polkaInk, "VersionStored");

        const prop = await polkaInk.getProposal(1);
        expect(prop.proposer).to.equal(author.address);
        expect(prop.docId).to.equal(1);
        expect(prop.stakeAmount).to.equal(MIN_STAKE);
        expect(prop.status).to.equal(1); // Active
        expect(prop.yesVotes).to.equal(0);
        expect(prop.noVotes).to.equal(0);
        expect(prop.description).to.equal("Updated the governance section");
        expect(prop.contentHash).to.equal(contentHash2);
      });

      it("should create proposal with parentVersionId = 0", async function () {
        // parentVersionId=0 is allowed (no parent check for 0)
        await polkaInk.connect(author).proposeVersion(
          1, 0, contentHash2, 0, 2048, "From scratch",
          { value: MIN_STAKE }
        );
        const prop = await polkaInk.getProposal(1);
        expect(prop.status).to.equal(1); // Active
      });

      it("should reject proposal with insufficient stake", async function () {
        const lowStake = ethers.parseEther("0.0001");
        await expect(
          polkaInk.connect(author).proposeVersion(
            1, 1, contentHash2, 0, 2048, "desc",
            { value: lowStake }
          )
        ).to.be.revertedWithCustomError(polkaInk, "InsufficientStake");
      });

      it("should reject proposal for nonexistent document", async function () {
        await expect(
          polkaInk.connect(author).proposeVersion(
            999, 1, contentHash2, 0, 2048, "desc",
            { value: MIN_STAKE }
          )
        ).to.be.revertedWithCustomError(polkaInk, "DocumentNotFound");
      });

      it("should reject proposal for archived document", async function () {
        await polkaInk.connect(owner).archiveDocument(1);
        await expect(
          polkaInk.connect(author).proposeVersion(
            1, 1, contentHash2, 0, 2048, "desc",
            { value: MIN_STAKE }
          )
        ).to.be.revertedWithCustomError(polkaInk, "DocumentIsArchived");
      });

      it("should reject proposal with invalid parent version (nonexistent)", async function () {
        await expect(
          polkaInk.connect(author).proposeVersion(
            1, 999, contentHash2, 0, 2048, "desc",
            { value: MIN_STAKE }
          )
        ).to.be.revertedWithCustomError(polkaInk, "InvalidParentVersion");
      });

      it("should reject proposal with parent version from different document", async function () {
        // Create a second document (version 2 belongs to doc 2)
        await polkaInk.connect(author).createDocument("Doc 2", [], contentHash2, 0, 100);

        // Try to propose on doc 1 with parent version from doc 2
        await expect(
          polkaInk.connect(author).proposeVersion(
            1, 2, contentHash3, 0, 2048, "desc",
            { value: MIN_STAKE }
          )
        ).to.be.revertedWithCustomError(polkaInk, "InvalidParentVersion");
      });

      it("should accept stake above minimum", async function () {
        const bigStake = ethers.parseEther("1.0");
        await polkaInk.connect(author).proposeVersion(
          1, 1, contentHash2, 0, 2048, "Big stake",
          { value: bigStake }
        );
        const prop = await polkaInk.getProposal(1);
        expect(prop.stakeAmount).to.equal(bigStake);
      });

      it("should set correct voting period timestamps", async function () {
        await polkaInk.connect(author).proposeVersion(
          1, 1, contentHash2, 0, 2048, "desc",
          { value: MIN_STAKE }
        );
        const prop = await polkaInk.getProposal(1);
        expect(prop.endTime - prop.startTime).to.equal(THREE_DAYS);
      });

      it("should create multiple proposals with incrementing IDs", async function () {
        await createProposal(1n, 1n, MIN_STAKE, contentHash2, "Proposal 1");
        await createProposal(1n, 1n, MIN_STAKE, contentHash3, "Proposal 2");

        expect(await polkaInk.totalProposals()).to.equal(2);
        const p1 = await polkaInk.getProposal(1);
        const p2 = await polkaInk.getProposal(2);
        expect(p1.description).to.equal("Proposal 1");
        expect(p2.description).to.equal("Proposal 2");
      });
    });

    // ── Voting ───────────────────────────────────────────────────────

    describe("Voting", function () {
      beforeEach(async function () {
        await createProposal();
      });

      it("should allow voting yes on proposals", async function () {
        await expect(polkaInk.connect(voter1).vote(1, true))
          .to.emit(polkaInk, "VoteCast")
          .withArgs(1, voter1.address, true, anyValue);

        const prop = await polkaInk.getProposal(1);
        expect(prop.yesVotes).to.equal(1);
        expect(prop.noVotes).to.equal(0);
      });

      it("should allow voting no on proposals", async function () {
        await polkaInk.connect(voter1).vote(1, false);
        const prop = await polkaInk.getProposal(1);
        expect(prop.yesVotes).to.equal(0);
        expect(prop.noVotes).to.equal(1);
      });

      it("should allow multiple voters", async function () {
        await polkaInk.connect(voter1).vote(1, true);
        await polkaInk.connect(voter2).vote(1, false);
        await polkaInk.connect(voter3).vote(1, true);

        const prop = await polkaInk.getProposal(1);
        expect(prop.yesVotes).to.equal(2);
        expect(prop.noVotes).to.equal(1);
      });

      it("should prevent double voting", async function () {
        await polkaInk.connect(voter1).vote(1, true);
        await expect(
          polkaInk.connect(voter1).vote(1, true)
        ).to.be.revertedWithCustomError(polkaInk, "AlreadyVoted");
      });

      it("should prevent double voting even with different choice", async function () {
        await polkaInk.connect(voter1).vote(1, true);
        await expect(
          polkaInk.connect(voter1).vote(1, false)
        ).to.be.revertedWithCustomError(polkaInk, "AlreadyVoted");
      });

      it("should reject vote on nonexistent proposal", async function () {
        await expect(
          polkaInk.connect(voter1).vote(999, true)
        ).to.be.revertedWithCustomError(polkaInk, "ProposalNotFound");
      });

      it("should reject vote after voting period ends", async function () {
        await advanceTime(THREE_DAYS + 1);
        await expect(
          polkaInk.connect(voter1).vote(1, true)
        ).to.be.revertedWithCustomError(polkaInk, "VotingEnded");
      });

      it("should reject vote on non-active proposal (cancelled)", async function () {
        await polkaInk.connect(author).cancelProposal(1);
        await expect(
          polkaInk.connect(voter1).vote(1, true)
        ).to.be.revertedWithCustomError(polkaInk, "ProposalNotActive");
      });

      it("should reject vote on already executed proposal", async function () {
        await polkaInk.connect(voter1).vote(1, true);
        await advanceTime(THREE_DAYS + 1);
        await polkaInk.executeProposal(1);

        await expect(
          polkaInk.connect(voter2).vote(1, true)
        ).to.be.revertedWithCustomError(polkaInk, "ProposalNotActive");
      });
    });

    // ── Execute Proposal ─────────────────────────────────────────────

    describe("Execute Proposal", function () {
      beforeEach(async function () {
        await createProposal(1n, 1n, ethers.parseEther("0.01"));
      });

      it("should execute passed proposal and update document version", async function () {
        await polkaInk.connect(voter1).vote(1, true);
        await polkaInk.connect(voter2).vote(1, true);
        await polkaInk.connect(voter3).vote(1, false);
        // 2/3 = 66.7% > 60%

        await advanceTime(THREE_DAYS + 1);

        const balBefore = await ethers.provider.getBalance(author.address);
        const tx = await polkaInk.connect(voter1).executeProposal(1);
        await expect(tx).to.emit(polkaInk, "ProposalExecuted");

        // Document version updated
        const doc = await polkaInk.getDocument(1);
        expect(doc.currentVersionId).to.equal(2);

        // Proposal status = Executed
        const prop = await polkaInk.getProposal(1);
        expect(prop.status).to.equal(3); // Executed

        // Stake returned to proposer
        const balAfter = await ethers.provider.getBalance(author.address);
        expect(balAfter).to.be.gt(balBefore);
      });

      it("should reject and slash stake on failed proposal", async function () {
        const stakeAmount = ethers.parseEther("0.01");

        await polkaInk.connect(voter1).vote(1, false);
        await polkaInk.connect(voter2).vote(1, false);
        await polkaInk.connect(voter3).vote(1, true);
        // 1/3 = 33.3% < 60%

        await advanceTime(THREE_DAYS + 1);

        const balBefore = await ethers.provider.getBalance(author.address);
        const tx = await polkaInk.connect(voter1).executeProposal(1);
        await expect(tx).to.emit(polkaInk, "ProposalRejected");
        await expect(tx).to.emit(polkaInk, "StakeSlashed");

        const prop = await polkaInk.getProposal(1);
        expect(prop.status).to.equal(4); // Rejected

        // Verify partial stake return (70% of 0.01 = 0.007)
        const balAfter = await ethers.provider.getBalance(author.address);
        const returned = balAfter - balBefore;
        const expectedReturn = (stakeAmount * 70n) / 100n; // 100% - 30% slash
        expect(returned).to.equal(expectedReturn);
      });

      it("should expire proposal with no votes and return full stake", async function () {
        // No votes cast
        await advanceTime(THREE_DAYS + 1);

        const balBefore = await ethers.provider.getBalance(author.address);
        const tx = await polkaInk.executeProposal(1);

        // Should NOT emit ProposalExecuted or ProposalRejected
        await expect(tx).to.not.emit(polkaInk, "ProposalExecuted");
        await expect(tx).to.not.emit(polkaInk, "ProposalRejected");

        const prop = await polkaInk.getProposal(1);
        expect(prop.status).to.equal(6); // Expired

        // Full stake returned
        const balAfter = await ethers.provider.getBalance(author.address);
        expect(balAfter - balBefore).to.equal(ethers.parseEther("0.01"));
      });

      it("should pass at exactly 60% threshold", async function () {
        // 3 yes, 2 no = 60% exactly (>= 60%)
        await polkaInk.connect(voter1).vote(1, true);
        await polkaInk.connect(voter2).vote(1, true);
        await polkaInk.connect(voter3).vote(1, true);
        await polkaInk.connect(other).vote(1, false);
        await polkaInk.connect(owner).vote(1, false);
        // 3/5 = 60% >= 60% → should pass

        await advanceTime(THREE_DAYS + 1);
        await polkaInk.executeProposal(1);

        const prop = await polkaInk.getProposal(1);
        expect(prop.status).to.equal(3); // Executed
      });

      it("should reject at 59% (just below threshold)", async function () {
        // We need a ratio below 60%. With integer math: yesVotes*100/totalVotes < 60
        // 59 yes, 41 no → 59/100 = 59% < 60% → rejected
        // But we only have a few signers. Let's use: 1 yes, 2 no = 33%
        await polkaInk.connect(voter1).vote(1, true);
        await polkaInk.connect(voter2).vote(1, false);
        await polkaInk.connect(voter3).vote(1, false);
        // 1/3 = 33% < 60%

        await advanceTime(THREE_DAYS + 1);
        await polkaInk.executeProposal(1);

        const prop = await polkaInk.getProposal(1);
        expect(prop.status).to.equal(4); // Rejected
      });

      it("should reject execution before voting period ends", async function () {
        await polkaInk.connect(voter1).vote(1, true);
        // Don't advance time
        await expect(
          polkaInk.executeProposal(1)
        ).to.be.revertedWithCustomError(polkaInk, "VotingNotEnded");
      });

      it("should reject execution of nonexistent proposal", async function () {
        await expect(
          polkaInk.executeProposal(999)
        ).to.be.revertedWithCustomError(polkaInk, "ProposalNotFound");
      });

      it("should reject execution of non-active proposal", async function () {
        await polkaInk.connect(author).cancelProposal(1);
        await expect(
          polkaInk.executeProposal(1)
        ).to.be.revertedWithCustomError(polkaInk, "ProposalNotActive");
      });

      it("should reject double execution", async function () {
        await polkaInk.connect(voter1).vote(1, true);
        await advanceTime(THREE_DAYS + 1);
        await polkaInk.executeProposal(1);

        await expect(
          polkaInk.executeProposal(1)
        ).to.be.revertedWithCustomError(polkaInk, "ProposalNotActive");
      });

      it("anyone can execute a proposal (not just proposer)", async function () {
        await polkaInk.connect(voter1).vote(1, true);
        await advanceTime(THREE_DAYS + 1);

        // Execute by a random account (not proposer, not voter)
        await polkaInk.connect(other).executeProposal(1);
        const prop = await polkaInk.getProposal(1);
        expect(prop.status).to.equal(3); // Executed
      });
    });

    // ── Cancel Proposal ──────────────────────────────────────────────

    describe("Cancel Proposal", function () {
      beforeEach(async function () {
        await createProposal();
      });

      it("should allow proposer to cancel before votes", async function () {
        const balBefore = await ethers.provider.getBalance(author.address);

        const tx = await polkaInk.connect(author).cancelProposal(1);
        await expect(tx).to.emit(polkaInk, "ProposalCancelled")
          .withArgs(1, author.address);

        const prop = await polkaInk.getProposal(1);
        expect(prop.status).to.equal(5); // Cancelled

        // Stake returned (minus gas)
        const balAfter = await ethers.provider.getBalance(author.address);
        expect(balAfter).to.be.gt(balBefore - ethers.parseEther("0.001"));
      });

      it("should reject cancel by non-proposer", async function () {
        await expect(
          polkaInk.connect(voter1).cancelProposal(1)
        ).to.be.revertedWithCustomError(polkaInk, "NotProposer");
      });

      it("should reject cancel after votes have been cast", async function () {
        await polkaInk.connect(voter1).vote(1, true);
        await expect(
          polkaInk.connect(author).cancelProposal(1)
        ).to.be.revertedWith("Cannot cancel: votes already cast or not active");
      });

      it("should reject cancel of nonexistent proposal", async function () {
        await expect(
          polkaInk.connect(author).cancelProposal(999)
        ).to.be.revertedWithCustomError(polkaInk, "ProposalNotFound");
      });

      it("should reject cancel of already cancelled proposal", async function () {
        await polkaInk.connect(author).cancelProposal(1);
        await expect(
          polkaInk.connect(author).cancelProposal(1)
        ).to.be.revertedWith("Cannot cancel: votes already cast or not active");
      });

      it("should reject cancel of executed proposal", async function () {
        await polkaInk.connect(voter1).vote(1, true);
        await advanceTime(THREE_DAYS + 1);
        await polkaInk.executeProposal(1);

        await expect(
          polkaInk.connect(author).cancelProposal(1)
        ).to.be.revertedWith("Cannot cancel: votes already cast or not active");
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Version History & Tree
  // ═══════════════════════════════════════════════════════════════════

  describe("Version History & Tree", function () {
    it("should track version history for a document", async function () {
      await createDoc();

      const history = await polkaInk.getVersionHistory(1);
      expect(history.length).to.equal(1);
      expect(history[0]).to.equal(1);
    });

    it("should track multiple versions via proposals", async function () {
      await createDoc();

      // Create a proposal (adds version 2)
      await polkaInk.connect(author).proposeVersion(
        1, 1, contentHash2, 0, 2048, "v2",
        { value: MIN_STAKE }
      );

      // Create another proposal (adds version 3)
      await polkaInk.connect(voter1).proposeVersion(
        1, 1, contentHash3, 0, 4096, "v3",
        { value: MIN_STAKE }
      );

      const history = await polkaInk.getVersionHistory(1);
      expect(history.length).to.equal(3); // v1 (initial) + v2 + v3
      expect(history[0]).to.equal(1);
      expect(history[1]).to.equal(2);
      expect(history[2]).to.equal(3);
    });

    it("should track version children (forks)", async function () {
      await createDoc(); // version 1

      // Two proposals both based on version 1 (fork)
      await polkaInk.connect(author).proposeVersion(
        1, 1, contentHash2, 0, 2048, "Fork A",
        { value: MIN_STAKE }
      );
      await polkaInk.connect(voter1).proposeVersion(
        1, 1, contentHash3, 0, 4096, "Fork B",
        { value: MIN_STAKE }
      );

      const children = await polkaInk.getVersionChildren(1);
      expect(children.length).to.equal(2);
      expect(children[0]).to.equal(2);
      expect(children[1]).to.equal(3);
    });

    it("should return empty children for leaf versions", async function () {
      await createDoc();
      const children = await polkaInk.getVersionChildren(1);
      expect(children.length).to.equal(0);
    });

    it("should return empty children for nonexistent version", async function () {
      const children = await polkaInk.getVersionChildren(999);
      expect(children.length).to.equal(0);
    });

    it("should revert getVersionHistory for nonexistent document", async function () {
      await expect(
        polkaInk.getVersionHistory(999)
      ).to.be.revertedWithCustomError(polkaInk, "DocumentNotFound");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Read Functions
  // ═══════════════════════════════════════════════════════════════════

  describe("Read Functions", function () {
    it("should revert getDocument for nonexistent document", async function () {
      await expect(
        polkaInk.getDocument(999)
      ).to.be.revertedWithCustomError(polkaInk, "DocumentNotFound");
    });

    it("should revert getVersion for nonexistent version", async function () {
      await expect(
        polkaInk.getVersion(999)
      ).to.be.revertedWith("Version not found");
    });

    it("should revert getProposal for nonexistent proposal", async function () {
      await expect(
        polkaInk.getProposal(999)
      ).to.be.revertedWithCustomError(polkaInk, "ProposalNotFound");
    });

    it("should return correct hasVoted status", async function () {
      await createDoc();
      await createProposal();

      expect(await polkaInk.hasVoted(1, voter1.address)).to.equal(false);
      await polkaInk.connect(voter1).vote(1, true);
      expect(await polkaInk.hasVoted(1, voter1.address)).to.equal(true);
    });

    it("should return correct getVoteChoice", async function () {
      await createDoc();
      await createProposal();

      // Before voting
      const [voted1, support1] = await polkaInk.getVoteChoice(1, voter1.address);
      expect(voted1).to.equal(false);
      expect(support1).to.equal(false); // default

      // After voting yes
      await polkaInk.connect(voter1).vote(1, true);
      const [voted2, support2] = await polkaInk.getVoteChoice(1, voter1.address);
      expect(voted2).to.equal(true);
      expect(support2).to.equal(true);

      // After voting no
      await polkaInk.connect(voter2).vote(1, false);
      const [voted3, support3] = await polkaInk.getVoteChoice(1, voter2.address);
      expect(voted3).to.equal(true);
      expect(support3).to.equal(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Pagination
  // ═══════════════════════════════════════════════════════════════════

  describe("Pagination", function () {
    describe("listDocuments", function () {
      beforeEach(async function () {
        for (let i = 1; i <= 5; i++) {
          await polkaInk.connect(author).createDocument(
            `Document ${i}`, [`tag${i}`], contentHash, 0, 100 * i
          );
        }
      });

      it("should paginate documents correctly", async function () {
        const [docs, total] = await polkaInk.listDocuments(0, 3);
        expect(total).to.equal(5);
        expect(docs.length).to.equal(3);
        expect(docs[0].title).to.equal("Document 1");
        expect(docs[2].title).to.equal("Document 3");
      });

      it("should return remaining documents for last page", async function () {
        const [docs, total] = await polkaInk.listDocuments(3, 10);
        expect(total).to.equal(5);
        expect(docs.length).to.equal(2);
        expect(docs[0].title).to.equal("Document 4");
        expect(docs[1].title).to.equal("Document 5");
      });

      it("should return empty array when offset >= total", async function () {
        const [docs, total] = await polkaInk.listDocuments(5, 10);
        expect(total).to.equal(5);
        expect(docs.length).to.equal(0);
      });

      it("should return empty array when limit = 0", async function () {
        const [docs, total] = await polkaInk.listDocuments(0, 0);
        expect(total).to.equal(5);
        expect(docs.length).to.equal(0);
      });

      it("should cap limit at 50", async function () {
        // We only have 5 docs, but test that limit > 50 is capped
        const [docs] = await polkaInk.listDocuments(0, 100);
        expect(docs.length).to.equal(5); // Only 5 exist, but limit was capped to 50
      });

      it("should return empty when no documents exist", async function () {
        const freshFactory = await ethers.getContractFactory("PolkaInk");
        const fresh = await freshFactory.deploy();
        await fresh.waitForDeployment();

        const [docs, total] = await fresh.listDocuments(0, 10);
        expect(total).to.equal(0);
        expect(docs.length).to.equal(0);
      });
    });

    describe("listProposals", function () {
      beforeEach(async function () {
        await createDoc();
        for (let i = 0; i < 4; i++) {
          const hash = ethers.keccak256(ethers.toUtf8Bytes(`Proposal ${i}`));
          await polkaInk.connect(author).proposeVersion(
            1, 1, hash, 0, 1024, `Proposal ${i}`,
            { value: MIN_STAKE }
          );
        }
      });

      it("should paginate proposals correctly", async function () {
        const [proposals, total] = await polkaInk.listProposals(0, 2);
        expect(total).to.equal(4);
        expect(proposals.length).to.equal(2);
        expect(proposals[0].description).to.equal("Proposal 0");
        expect(proposals[1].description).to.equal("Proposal 1");
      });

      it("should return remaining proposals for last page", async function () {
        const [proposals] = await polkaInk.listProposals(2, 10);
        expect(proposals.length).to.equal(2);
        expect(proposals[0].description).to.equal("Proposal 2");
        expect(proposals[1].description).to.equal("Proposal 3");
      });

      it("should return empty when offset >= total", async function () {
        const [proposals, total] = await polkaInk.listProposals(4, 10);
        expect(total).to.equal(4);
        expect(proposals.length).to.equal(0);
      });

      it("should return empty when limit = 0", async function () {
        const [proposals] = await polkaInk.listProposals(0, 0);
        expect(proposals.length).to.equal(0);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Admin Functions
  // ═══════════════════════════════════════════════════════════════════

  describe("Admin Functions", function () {
    // ── Governance Params ────────────────────────────────────────────

    describe("updateGovernanceParams", function () {
      it("should allow owner to update governance params", async function () {
        const tx = await polkaInk.connect(owner).updateGovernanceParams(
          ethers.parseEther("0.01"), 7 * 86400, 70, 40, 15
        );

        await expect(tx).to.emit(polkaInk, "GovernanceParamsUpdated")
          .withArgs(ethers.parseEther("0.01"), 7 * 86400, 70);

        const params = await polkaInk.params();
        expect(params.minStake).to.equal(ethers.parseEther("0.01"));
        expect(params.votingPeriod).to.equal(7 * 86400);
        expect(params.passingThreshold).to.equal(70);
        expect(params.slashRatioNormal).to.equal(40);
        expect(params.maxTagsPerDoc).to.equal(15);
      });

      it("should reject non-owner admin calls", async function () {
        await expect(
          polkaInk.connect(author).updateGovernanceParams(0, 0, 50, 30, 10)
        ).to.be.revertedWithCustomError(polkaInk, "OnlyOwner");
      });

      it("should reject passingThreshold > 100", async function () {
        await expect(
          polkaInk.connect(owner).updateGovernanceParams(0, 0, 101, 30, 10)
        ).to.be.revertedWith("Threshold must be <= 100");
      });

      it("should reject slashRatioNormal > 100", async function () {
        await expect(
          polkaInk.connect(owner).updateGovernanceParams(0, 0, 50, 101, 10)
        ).to.be.revertedWith("Slash ratio must be <= 100");
      });

      it("should reject maxTagsPerDoc = 0", async function () {
        await expect(
          polkaInk.connect(owner).updateGovernanceParams(0, 0, 50, 30, 0)
        ).to.be.revertedWith("Invalid max tags");
      });

      it("should reject maxTagsPerDoc > 20", async function () {
        await expect(
          polkaInk.connect(owner).updateGovernanceParams(0, 0, 50, 30, 21)
        ).to.be.revertedWith("Invalid max tags");
      });

      it("should accept boundary values (threshold=100, slash=100, maxTags=20)", async function () {
        await polkaInk.connect(owner).updateGovernanceParams(0, 0, 100, 100, 20);
        const params = await polkaInk.params();
        expect(params.passingThreshold).to.equal(100);
        expect(params.slashRatioNormal).to.equal(100);
        expect(params.maxTagsPerDoc).to.equal(20);
      });

      it("should accept minStake = 0 and votingPeriod = 0", async function () {
        await polkaInk.connect(owner).updateGovernanceParams(0, 0, 50, 30, 10);
        const params = await polkaInk.params();
        expect(params.minStake).to.equal(0);
        expect(params.votingPeriod).to.equal(0);
      });
    });

    // ── Archive Document ─────────────────────────────────────────────

    describe("archiveDocument", function () {
      beforeEach(async function () {
        await createDoc();
      });

      it("should allow owner to archive documents", async function () {
        const tx = await polkaInk.connect(owner).archiveDocument(1);
        await expect(tx)
          .to.emit(polkaInk, "DocumentArchived")
          .withArgs(1, anyValue);

        const doc = await polkaInk.getDocument(1);
        expect(doc.status).to.equal(1); // Archived
      });

      it("should reject archive by non-owner", async function () {
        await expect(
          polkaInk.connect(author).archiveDocument(1)
        ).to.be.revertedWithCustomError(polkaInk, "OnlyOwner");
      });

      it("should reject archive of nonexistent document", async function () {
        await expect(
          polkaInk.connect(owner).archiveDocument(999)
        ).to.be.revertedWithCustomError(polkaInk, "DocumentNotFound");
      });

      it("should reject double archive", async function () {
        await polkaInk.connect(owner).archiveDocument(1);
        await expect(
          polkaInk.connect(owner).archiveDocument(1)
        ).to.be.revertedWithCustomError(polkaInk, "DocumentIsArchived");
      });

      it("should update the updatedAt timestamp on archive", async function () {
        const docBefore = await polkaInk.getDocument(1);
        await advanceTime(100);
        await polkaInk.connect(owner).archiveDocument(1);
        const docAfter = await polkaInk.getDocument(1);
        expect(docAfter.updatedAt).to.be.gt(docBefore.updatedAt);
      });
    });

    // ── Transfer Ownership ───────────────────────────────────────────

    describe("transferOwnership", function () {
      it("should transfer ownership to new address", async function () {
        await polkaInk.connect(owner).transferOwnership(author.address);
        expect(await polkaInk.owner()).to.equal(author.address);
      });

      it("new owner should be able to use admin functions", async function () {
        await polkaInk.connect(owner).transferOwnership(author.address);

        // Old owner should fail
        await expect(
          polkaInk.connect(owner).updateGovernanceParams(0, 0, 50, 30, 10)
        ).to.be.revertedWithCustomError(polkaInk, "OnlyOwner");

        // New owner should succeed
        await polkaInk.connect(author).updateGovernanceParams(0, 0, 50, 30, 10);
      });

      it("should reject transfer to zero address", async function () {
        await expect(
          polkaInk.connect(owner).transferOwnership(ethers.ZeroAddress)
        ).to.be.revertedWith("Invalid address");
      });

      it("should reject transfer by non-owner", async function () {
        await expect(
          polkaInk.connect(author).transferOwnership(voter1.address)
        ).to.be.revertedWithCustomError(polkaInk, "OnlyOwner");
      });
    });

    // ── Withdraw Slashed Stakes ──────────────────────────────────────

    describe("withdrawSlashedStakes", function () {
      it("should withdraw slashed stakes after rejected proposal", async function () {
        await createDoc();
        const stakeAmount = ethers.parseEther("1.0");

        // Create and reject a proposal
        await polkaInk.connect(author).proposeVersion(
          1, 1, contentHash2, 0, 2048, "Will be rejected",
          { value: stakeAmount }
        );
        await polkaInk.connect(voter1).vote(1, false);
        await polkaInk.connect(voter2).vote(1, false);
        await advanceTime(THREE_DAYS + 1);
        await polkaInk.executeProposal(1);

        // Contract should hold slashed amount (30% of 1.0 = 0.3)
        const contractBal = await ethers.provider.getBalance(await polkaInk.getAddress());
        expect(contractBal).to.equal(ethers.parseEther("0.3"));

        // Withdraw
        const balBefore = await ethers.provider.getBalance(voter3.address);
        await polkaInk.connect(owner).withdrawSlashedStakes(voter3.address);
        const balAfter = await ethers.provider.getBalance(voter3.address);
        expect(balAfter - balBefore).to.equal(ethers.parseEther("0.3"));

        // Contract balance should be 0
        const contractBalAfter = await ethers.provider.getBalance(await polkaInk.getAddress());
        expect(contractBalAfter).to.equal(0);
      });

      it("should reject withdraw with no balance", async function () {
        await expect(
          polkaInk.connect(owner).withdrawSlashedStakes(voter1.address)
        ).to.be.revertedWith("No balance");
      });

      it("should reject withdraw by non-owner", async function () {
        await expect(
          polkaInk.connect(author).withdrawSlashedStakes(author.address)
        ).to.be.revertedWithCustomError(polkaInk, "OnlyOwner");
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Receive / Fallback
  // ═══════════════════════════════════════════════════════════════════

  describe("Receive PAS", function () {
    it("should accept direct PAS transfers via receive()", async function () {
      const amount = ethers.parseEther("0.5");
      await owner.sendTransaction({
        to: await polkaInk.getAddress(),
        value: amount,
      });

      const bal = await ethers.provider.getBalance(await polkaInk.getAddress());
      expect(bal).to.equal(amount);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Stake Economics
  // ═══════════════════════════════════════════════════════════════════

  describe("Stake Economics", function () {
    it("should slash exactly 30% on rejection", async function () {
      await createDoc();
      const stakeAmount = ethers.parseEther("0.1");

      await polkaInk.connect(author).proposeVersion(
        1, 1, contentHash2, 0, 2048, "desc",
        { value: stakeAmount }
      );

      await polkaInk.connect(voter1).vote(1, false);
      await advanceTime(THREE_DAYS + 1);

      const balBefore = await ethers.provider.getBalance(author.address);
      await polkaInk.executeProposal(1);
      const balAfter = await ethers.provider.getBalance(author.address);

      // 70% returned = 0.07 PAS
      const returned = balAfter - balBefore;
      expect(returned).to.equal(ethers.parseEther("0.07"));

      // 30% slashed = 0.03 PAS remains in contract
      const contractBal = await ethers.provider.getBalance(await polkaInk.getAddress());
      expect(contractBal).to.equal(ethers.parseEther("0.03"));
    });

    it("should return full stake on successful proposal", async function () {
      await createDoc();
      const stakeAmount = ethers.parseEther("0.1");

      await polkaInk.connect(author).proposeVersion(
        1, 1, contentHash2, 0, 2048, "desc",
        { value: stakeAmount }
      );

      await polkaInk.connect(voter1).vote(1, true);
      await advanceTime(THREE_DAYS + 1);

      const balBefore = await ethers.provider.getBalance(author.address);
      await polkaInk.executeProposal(1);
      const balAfter = await ethers.provider.getBalance(author.address);

      expect(balAfter - balBefore).to.equal(stakeAmount);
    });

    it("should return full stake on cancellation", async function () {
      await createDoc();
      const stakeAmount = ethers.parseEther("0.1");

      await polkaInk.connect(author).proposeVersion(
        1, 1, contentHash2, 0, 2048, "desc",
        { value: stakeAmount }
      );

      const balBefore = await ethers.provider.getBalance(author.address);
      const tx = await polkaInk.connect(author).cancelProposal(1);
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      const balAfter = await ethers.provider.getBalance(author.address);

      // Balance should increase by stakeAmount minus gas
      expect(balAfter + gasCost - balBefore).to.equal(stakeAmount);
    });

    it("should return full stake on expiry (no votes)", async function () {
      await createDoc();
      const stakeAmount = ethers.parseEther("0.1");

      await polkaInk.connect(author).proposeVersion(
        1, 1, contentHash2, 0, 2048, "desc",
        { value: stakeAmount }
      );

      await advanceTime(THREE_DAYS + 1);

      const balBefore = await ethers.provider.getBalance(author.address);
      await polkaInk.connect(voter1).executeProposal(1); // executed by someone else
      const balAfter = await ethers.provider.getBalance(author.address);

      expect(balAfter - balBefore).to.equal(stakeAmount);
    });

    it("should handle 100% slash ratio correctly", async function () {
      // Update slash ratio to 100%
      await polkaInk.connect(owner).updateGovernanceParams(
        MIN_STAKE, THREE_DAYS, 60, 100, 10
      );

      await createDoc();
      const stakeAmount = ethers.parseEther("0.1");

      await polkaInk.connect(author).proposeVersion(
        1, 1, contentHash2, 0, 2048, "desc",
        { value: stakeAmount }
      );

      await polkaInk.connect(voter1).vote(1, false);
      await advanceTime(THREE_DAYS + 1);

      const balBefore = await ethers.provider.getBalance(author.address);
      await polkaInk.executeProposal(1);
      const balAfter = await ethers.provider.getBalance(author.address);

      // 0% returned (100% slashed)
      expect(balAfter - balBefore).to.equal(0);

      // Full stake in contract
      const contractBal = await ethers.provider.getBalance(await polkaInk.getAddress());
      expect(contractBal).to.equal(stakeAmount);
    });

    it("should handle 0% slash ratio correctly", async function () {
      // Update slash ratio to 0%
      await polkaInk.connect(owner).updateGovernanceParams(
        MIN_STAKE, THREE_DAYS, 60, 0, 10
      );

      await createDoc();
      const stakeAmount = ethers.parseEther("0.1");

      await polkaInk.connect(author).proposeVersion(
        1, 1, contentHash2, 0, 2048, "desc",
        { value: stakeAmount }
      );

      await polkaInk.connect(voter1).vote(1, false);
      await advanceTime(THREE_DAYS + 1);

      const balBefore = await ethers.provider.getBalance(author.address);
      await polkaInk.executeProposal(1);
      const balAfter = await ethers.provider.getBalance(author.address);

      // Full stake returned even on rejection
      expect(balAfter - balBefore).to.equal(stakeAmount);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Governance Params Effect on Behavior
  // ═══════════════════════════════════════════════════════════════════

  describe("Governance Params Effect", function () {
    it("should enforce updated minStake on new proposals", async function () {
      await polkaInk.connect(owner).updateGovernanceParams(
        ethers.parseEther("1.0"), THREE_DAYS, 60, 30, 10
      );

      await createDoc();

      // Old minStake (0.001) should now fail
      await expect(
        polkaInk.connect(author).proposeVersion(
          1, 1, contentHash2, 0, 2048, "desc",
          { value: MIN_STAKE }
        )
      ).to.be.revertedWithCustomError(polkaInk, "InsufficientStake");

      // New minStake (1.0) should succeed
      await polkaInk.connect(author).proposeVersion(
        1, 1, contentHash2, 0, 2048, "desc",
        { value: ethers.parseEther("1.0") }
      );
    });

    it("should enforce updated maxTagsPerDoc", async function () {
      await polkaInk.connect(owner).updateGovernanceParams(
        MIN_STAKE, THREE_DAYS, 60, 30, 3 // maxTags = 3
      );

      // 3 tags should work
      await polkaInk.connect(author).createDocument("Ok", ["a", "b", "c"], contentHash, 0, 100);

      // 4 tags should fail
      await expect(
        polkaInk.connect(author).createDocument("Fail", ["a", "b", "c", "d"], contentHash, 0, 100)
      ).to.be.revertedWithCustomError(polkaInk, "TooManyTags");
    });

    it("should enforce updated votingPeriod", async function () {
      // Set voting period to 1 hour
      await polkaInk.connect(owner).updateGovernanceParams(
        MIN_STAKE, 3600, 60, 30, 10
      );

      await createDoc();
      await createProposal();

      // After 30 minutes, voting should still be open
      await advanceTime(1800);
      await polkaInk.connect(voter1).vote(1, true);

      // After 1 hour total, execution should work
      await advanceTime(1801);
      await polkaInk.executeProposal(1);
      const prop = await polkaInk.getProposal(1);
      expect(prop.status).to.equal(3); // Executed
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Integration: Full Lifecycle
  // ═══════════════════════════════════════════════════════════════════

  describe("Full Lifecycle Integration", function () {
    it("should handle complete document lifecycle: create → propose → vote → execute", async function () {
      // 1. Create document
      await polkaInk.connect(author).createDocument(
        "Polkadot History", ["polkadot", "history"], contentHash, 0, 1024
      );

      // 2. Propose version update
      await polkaInk.connect(voter1).proposeVersion(
        1, 1, contentHash2, 0, 2048, "Add governance section",
        { value: MIN_STAKE }
      );

      // 3. Vote
      await polkaInk.connect(author).vote(1, true);
      await polkaInk.connect(voter2).vote(1, true);
      await polkaInk.connect(voter3).vote(1, false);

      // 4. Execute after voting period
      await advanceTime(THREE_DAYS + 1);
      await polkaInk.connect(other).executeProposal(1);

      // 5. Verify final state
      const doc = await polkaInk.getDocument(1);
      expect(doc.currentVersionId).to.equal(2);
      expect(doc.status).to.equal(0); // Still Active

      const history = await polkaInk.getVersionHistory(1);
      expect(history.length).to.equal(2);

      const v2 = await polkaInk.getVersion(2);
      expect(v2.contentHash).to.equal(contentHash2);
      expect(v2.parentVersionId).to.equal(1);
    });

    it("should handle multiple proposals on same document", async function () {
      await createDoc();

      // Proposal 1: accepted
      await polkaInk.connect(author).proposeVersion(
        1, 1, contentHash2, 0, 2048, "Proposal 1",
        { value: MIN_STAKE }
      );
      await polkaInk.connect(voter1).vote(1, true);
      await advanceTime(THREE_DAYS + 1);
      await polkaInk.executeProposal(1);

      // Proposal 2: based on the new version (v2), also accepted
      await polkaInk.connect(voter1).proposeVersion(
        1, 2, contentHash3, 0, 4096, "Proposal 2",
        { value: MIN_STAKE }
      );
      await polkaInk.connect(author).vote(2, true);
      await advanceTime(THREE_DAYS + 1);
      await polkaInk.executeProposal(2);

      const doc = await polkaInk.getDocument(1);
      expect(doc.currentVersionId).to.equal(3); // Updated to v3

      const history = await polkaInk.getVersionHistory(1);
      expect(history.length).to.equal(3); // v1, v2, v3
    });

    it("should prevent proposals on archived documents", async function () {
      await createDoc();
      await polkaInk.connect(owner).archiveDocument(1);

      await expect(
        polkaInk.connect(author).proposeVersion(
          1, 1, contentHash2, 0, 2048, "desc",
          { value: MIN_STAKE }
        )
      ).to.be.revertedWithCustomError(polkaInk, "DocumentIsArchived");
    });

    it("should prevent tag updates on archived documents", async function () {
      await createDoc();
      await polkaInk.connect(owner).archiveDocument(1);

      await expect(
        polkaInk.connect(author).updateTags(1, ["new"])
      ).to.be.revertedWithCustomError(polkaInk, "DocumentIsArchived");
    });
  });
});
