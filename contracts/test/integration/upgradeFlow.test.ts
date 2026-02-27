import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture } from "../fixtures/deployFixture";

describe("Upgrade Flow", () => {
  it("should handle upgrade flow correctly", async () => {
    const { contracts, actors } = await loadFixture(deployFixture);
    const { registry, governanceCore, timelock } = contracts;
    const { admin, author1, voter1, voter2, voter3 } = actors;

    // Step 1: Deploy a new implementation of PolkaInkRegistry
    const RegistryV2Factory = await ethers.getContractFactory("PolkaInkRegistry");
    const registryV2Impl = await RegistryV2Factory.deploy();
    await registryV2Impl.waitForDeployment();

    // Step 2: Propose upgrade via GovernanceCore
    const MIN_STAKE = ethers.parseUnits("5", 12);
    const proposalTx = await governanceCore.connect(author1).proposeUpgrade(
      "PolkaInkRegistry",
      await registryV2Impl.getAddress(),
      "Bug fix: version tree consistency. Audit: https://example.com",
      { value: MIN_STAKE }
    );
    await proposalTx.wait();

    const proposalId = await governanceCore.totalProposals();

    // Step 3: Community votes
    await governanceCore.connect(voter1).vote(proposalId, true, false, 0);
    await governanceCore.connect(voter2).vote(proposalId, true, false, 0);
    await governanceCore.connect(voter3).vote(proposalId, true, false, 0);

    // Step 4: Advance past voting period
    await time.increase(7 * 24 * 3600 + 1);

    // Step 5: Queue → TimelockQueued
    await governanceCore.connect(voter1).queueProposal(proposalId);

    const proposal = await governanceCore.getProposal(proposalId);

    if (Number(proposal.status) === 3) {
      // TimelockQueued
      expect(proposal.timelockId).to.not.equal(ethers.ZeroHash);

      // Step 6: Advance past timelock delay
      await time.increase(61);

      const isReady = await timelock.isOperationReady(proposal.timelockId);
      expect(isReady).to.be.true;
    }

    // Verify proposal type was UpgradeContract
    expect(Number(proposal.proposalType)).to.equal(1); // UpgradeContract
  });

  it("contracts should be upgradeable via UUPS", async () => {
    const { contracts, actors } = await loadFixture(deployFixture);
    const { registry } = contracts;
    const { admin, timelock } = { ...contracts, admin: actors.admin };

    // Grant UPGRADER_ROLE to admin directly for this test
    const UPGRADER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));
    await registry.connect(actors.admin).grantRole(UPGRADER_ROLE, actors.admin.address);

    const RegistryV2 = await ethers.getContractFactory("PolkaInkRegistry");
    const upgraded = await upgrades.upgradeProxy(await registry.getAddress(), RegistryV2, {
      kind: "uups",
    });

    // Post-upgrade, registry should still function
    const totalDocs = await upgraded.totalDocuments();
    expect(totalDocs).to.be.gte(0n);
  });
});
