import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture, stakeFor, STAKE_AMOUNT } from "../fixtures/deployFixture";

describe("GovernanceCore v3.3", () => {
  // MVP values
  const VOTING_PERIOD      = 10 * 60;  // 10 minutes
  const COUNCIL_WINDOW     = 3 * 60;   // 3 minutes
  const REJECTION_COOLDOWN = 5 * 60;   // 5 minutes

  async function setupWithProposal() {
    const data = await deployFixture();
    const { contracts, actors } = data;

    await stakeFor(contracts.stakingManager, actors.author1, 12);
    await stakeFor(contracts.stakingManager, actors.voter1, 6);
    await stakeFor(contracts.stakingManager, actors.voter2, 3);
    await stakeFor(contracts.stakingManager, actors.voter3, 3);

    // Create a document first
    await contracts.registry.connect(actors.author1)
      .createDocument("Test Doc", ["#test"], "Test description");

    // Propose a version
    await contracts.registry.connect(actors.author1)
      .proposeVersion(1, 0, ethers.keccak256(ethers.toUtf8Bytes("v1")), "First version");

    return data;
  }

  describe("createProposalFor (via Registry)", () => {
    it("should create proposal for active members only", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      // Not a member yet — create doc should fail
      await expect(
        contracts.registry.connect(actors.author1)
          .createDocument("Doc", [], "desc")
      ).to.be.revertedWithCustomError(contracts.registry, "Registry__NotActiveMember");

      await stakeFor(contracts.stakingManager, actors.author1);
      await contracts.registry.connect(actors.author1)
        .createDocument("Doc", [], "desc");
      const tx = contracts.registry.connect(actors.author1)
        .proposeVersion(1, 0, ethers.keccak256(ethers.toUtf8Bytes("v1")), "v1");
      await expect(tx).to.emit(contracts.governanceCore, "ProposalCreated");
    });

    it("should revert on rejection cooldown", async () => {
      const data = await loadFixture(setupWithProposal);
      const { contracts, actors } = data;

      // Finalize as Rejected
      await time.increase(VOTING_PERIOD + 1);
      await contracts.governanceCore.finalizeProposal(1);
      const p = await contracts.governanceCore.getProposal(1);
      expect(p.status).to.equal(3); // Rejected

      // Try to propose again immediately — should hit cooldown
      await expect(
        contracts.registry.connect(actors.author1)
          .proposeVersion(1, 0, ethers.keccak256(ethers.toUtf8Bytes("v2")), "v2")
      ).to.be.revertedWithCustomError(contracts.governanceCore, "Gov__RejectionCooldown");
    });

    it("should allow proposal after cooldown expires", async () => {
      const data = await loadFixture(setupWithProposal);
      const { contracts, actors } = data;

      await time.increase(VOTING_PERIOD + 1);
      await contracts.governanceCore.finalizeProposal(1);

      await time.increase(REJECTION_COOLDOWN + 1);

      await expect(
        contracts.registry.connect(actors.author1)
          .proposeVersion(1, 0, ethers.keccak256(ethers.toUtf8Bytes("v2")), "v2")
      ).to.emit(contracts.governanceCore, "ProposalCreated");
    });
  });

  describe("vote", () => {
    it("should record vote with correct weight (B_lock only for new member)", async () => {
      const data = await loadFixture(setupWithProposal);
      const { contracts, actors } = data;

      await contracts.governanceCore.connect(actors.voter1).vote(1, 0); // Yes
      const record = await contracts.governanceCore.getVoteRecord(1, actors.voter1.address);
      expect(record.hasVoted).to.be.true;
      expect(record.weight).to.be.gt(0n);
      // voter1 staked 6 months: weight = 1e18 + 0.2418e18 = ~1.2418e18
      expect(record.weight).to.be.gte(ethers.parseEther("1.2"));
    });

    it("should revert on double vote", async () => {
      const data = await loadFixture(setupWithProposal);
      const { contracts, actors } = data;

      await contracts.governanceCore.connect(actors.voter1).vote(1, 0);
      await expect(
        contracts.governanceCore.connect(actors.voter1).vote(1, 0)
      ).to.be.revertedWithCustomError(contracts.governanceCore, "Gov__AlreadyVoted");
    });

    it("should revert after voting period", async () => {
      const data = await loadFixture(setupWithProposal);
      await time.increase(VOTING_PERIOD + 1);
      await expect(
        data.contracts.governanceCore.connect(data.actors.voter1).vote(1, 0)
      ).to.be.revertedWith("GovernanceCore: voting ended");
    });
  });

  describe("finalizeProposal", () => {
    it("should approve when score > 2.0 and participation >= 5%", async () => {
      const data = await loadFixture(setupWithProposal);
      const { contracts, actors } = data;

      await contracts.governanceCore.connect(actors.voter1).vote(1, 0);
      await contracts.governanceCore.connect(actors.voter2).vote(1, 0);
      await contracts.governanceCore.connect(actors.voter3).vote(1, 0);

      await time.increase(VOTING_PERIOD + 1);
      await contracts.governanceCore.finalizeProposal(1);

      const p = await contracts.governanceCore.getProposal(1);
      expect(p.status).to.equal(1); // Approved
    });

    it("should reject when score <= 2.0", async () => {
      const data = await loadFixture(setupWithProposal);
      const { contracts, actors } = data;

      await contracts.governanceCore.connect(actors.voter1).vote(1, 0); // Yes
      await contracts.governanceCore.connect(actors.voter2).vote(1, 1); // No

      await time.increase(VOTING_PERIOD + 1);
      await contracts.governanceCore.finalizeProposal(1);

      const p = await contracts.governanceCore.getProposal(1);
      expect(p.status).to.equal(3); // Rejected
    });

    it("should open Council window on Approval", async () => {
      const data = await loadFixture(setupWithProposal);
      const { contracts, actors } = data;

      await contracts.governanceCore.connect(actors.voter1).vote(1, 0);
      await contracts.governanceCore.connect(actors.voter2).vote(1, 0);
      await contracts.governanceCore.connect(actors.voter3).vote(1, 0);

      await time.increase(VOTING_PERIOD + 1);
      await expect(
        contracts.governanceCore.finalizeProposal(1)
      ).to.emit(contracts.governanceCore, "CouncilWindowOpened");

      const p = await contracts.governanceCore.getProposal(1);
      expect(p.councilWindowEnd).to.be.gt(0n);
    });
  });

  describe("cancelProposal", () => {
    it("should allow proposer to cancel without cooldown", async () => {
      const data = await loadFixture(setupWithProposal);
      const { contracts, actors } = data;

      await contracts.governanceCore.connect(actors.author1).cancelProposal(1);
      const p = await contracts.governanceCore.getProposal(1);
      expect(p.status).to.equal(5); // Cancelled

      // No cooldown after cancel: can propose again
      await expect(
        contracts.registry.connect(actors.author1)
          .proposeVersion(1, 0, ethers.keccak256(ethers.toUtf8Bytes("v2")), "v2")
      ).to.emit(contracts.governanceCore, "ProposalCreated");
    });

    it("should revert if not proposer", async () => {
      const data = await loadFixture(setupWithProposal);
      await expect(
        data.contracts.governanceCore.connect(data.actors.voter1).cancelProposal(1)
      ).to.be.revertedWithCustomError(data.contracts.governanceCore, "Gov__NotProposer");
    });
  });

  describe("executeProposal (VersionUpdate)", () => {
    it("should execute and merge after council window", async () => {
      const data = await loadFixture(setupWithProposal);
      const { contracts, actors } = data;

      await contracts.governanceCore.connect(actors.voter1).vote(1, 0);
      await contracts.governanceCore.connect(actors.voter2).vote(1, 0);
      await contracts.governanceCore.connect(actors.voter3).vote(1, 0);

      await time.increase(VOTING_PERIOD + 1);
      await contracts.governanceCore.finalizeProposal(1);

      await time.increase(COUNCIL_WINDOW + 1);

      await expect(
        contracts.governanceCore.executeProposal(1)
      ).to.emit(contracts.governanceCore, "ProposalExecuted");

      const p = await contracts.governanceCore.getProposal(1);
      expect(p.status).to.equal(4); // Executed
    });

    it("should revert if council window not closed", async () => {
      const data = await loadFixture(setupWithProposal);
      const { contracts, actors } = data;

      await contracts.governanceCore.connect(actors.voter1).vote(1, 0);
      await contracts.governanceCore.connect(actors.voter2).vote(1, 0);
      await contracts.governanceCore.connect(actors.voter3).vote(1, 0);

      await time.increase(VOTING_PERIOD + 1);
      await contracts.governanceCore.finalizeProposal(1);

      // Do NOT advance past council window
      await expect(
        contracts.governanceCore.executeProposal(1)
      ).to.be.revertedWithCustomError(contracts.governanceCore, "Gov__CouncilWindowNotClosed");
    });
  });

  describe("CouncilVetoed triggers REJECTION_COOLDOWN", () => {
    it("should apply cooldown after CouncilVetoed same as Rejected", async () => {
      const data = await loadFixture(setupWithProposal);
      const { contracts, actors } = data;

      await contracts.governanceCore.connect(actors.voter1).vote(1, 0);
      await contracts.governanceCore.connect(actors.voter2).vote(1, 0);
      await contracts.governanceCore.connect(actors.voter3).vote(1, 0);

      await time.increase(VOTING_PERIOD + 1);
      await contracts.governanceCore.finalizeProposal(1);

      // Simulate CouncilVetoed via COUNCIL_ROLE
      const COUNCIL_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COUNCIL_ROLE"));
      await (contracts.governanceCore as any).grantRole(COUNCIL_ROLE, actors.admin.address);
      await contracts.governanceCore.connect(actors.admin).markCouncilVetoed(1);

      const p = await contracts.governanceCore.getProposal(1);
      expect(p.status).to.equal(2); // CouncilVetoed

      // Proposer should be on cooldown
      await expect(
        contracts.registry.connect(actors.author1)
          .proposeVersion(1, 0, ethers.keccak256(ethers.toUtf8Bytes("v2")), "v2")
      ).to.be.revertedWithCustomError(contracts.governanceCore, "Gov__RejectionCooldown");
    });
  });
  describe("createProposal (UpgradeContract/ParameterChange)", () => {
    it("should require timelockTarget to be non-zero", async () => {
      const data = await loadFixture(deployFixture);
      const { contracts, actors } = data;
      await stakeFor(contracts.stakingManager, actors.author1);

      await expect(
        contracts.governanceCore.connect(actors.author1).createProposal(
          1, // UpgradeContract
          0, 0, 0,
          ethers.ZeroAddress, // invalid target
          "0x",
          "bad proposal",
          { value: ethers.parseEther("5") }
        )
      ).to.be.revertedWith("GovernanceCore: zero timelockTarget");
    });

    it("should store timelockTarget in proposal", async () => {
      const data = await loadFixture(deployFixture);
      const { contracts, actors } = data;
      await stakeFor(contracts.stakingManager, actors.author1, 3);
      await stakeFor(contracts.stakingManager, actors.voter1, 3);
      await stakeFor(contracts.stakingManager, actors.voter2, 3);
      await stakeFor(contracts.stakingManager, actors.voter3, 3);

      const target = await contracts.proxyAdmin.getAddress();
      await contracts.governanceCore.connect(actors.author1).createProposal(
        1, 0, 0, 0,
        target,
        "0x",
        "upgrade proposal",
        { value: ethers.parseEther("5") }
      );

      const p = await contracts.governanceCore.getProposal(1);
      expect(p.timelockTarget).to.equal(target);
    });
  });

  describe("vote() uses nftReward.hasActiveMember (v3.4 fix)", () => {
    it("should use nftReward hasActiveMember for weight calculation", async () => {
      const data = await loadFixture(setupWithProposal);
      const { contracts, actors } = data;

      // voter1 is active member with 6mo lock → should have weight > 1e18
      await contracts.governanceCore.connect(actors.voter1).vote(1, 0);
      const vr = await contracts.governanceCore.getVoteRecord(1, actors.voter1.address);
      // weight = 1e18 + 0.2418e18 = 1.2418e18
      expect(vr.weight).to.be.gte(ethers.parseEther("1.24"));
      expect(vr.weight).to.be.lte(ethers.parseEther("1.25"));
    });
  });
});
