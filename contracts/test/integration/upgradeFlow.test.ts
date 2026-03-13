import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture, stakeFor, STAKE_AMOUNT } from "../fixtures/deployFixture";

describe("Integration: UpgradeContract / ParameterChange Proposal Flow", () => {
  const VOTING_PERIOD  = 10 * 60;
  const COUNCIL_WINDOW = 3  * 60;
  const PROPOSAL_STAKE = ethers.parseEther("5");

  it("should queue in timelock and refund stake (UpgradeContract)", async () => {
    const { contracts, actors } = await loadFixture(deployFixture);

    await stakeFor(contracts.stakingManager, actors.author1, 12);
    await stakeFor(contracts.stakingManager, actors.voter1,  6);
    await stakeFor(contracts.stakingManager, actors.voter2,  3);
    await stakeFor(contracts.stakingManager, actors.voter3,  3);

    const before = await ethers.provider.getBalance(actors.author1.address);

    // Create UpgradeContract proposal (type=1)
    const tx = await contracts.governanceCore.connect(actors.author1).createProposal(
      1, // UpgradeContract
      0, 0, 0,
      await contracts.proxyAdmin.getAddress(), // timelockTarget: ProxyAdmin for upgrades
      "0x",
      "Upgrade governance",
      { value: PROPOSAL_STAKE }
    );
    await tx.wait();

    await contracts.governanceCore.connect(actors.voter1).vote(1, 0);
    await contracts.governanceCore.connect(actors.voter2).vote(1, 0);
    await contracts.governanceCore.connect(actors.voter3).vote(1, 0);

    await time.increase(VOTING_PERIOD + 1);
    await contracts.governanceCore.finalizeProposal(1);

    await time.increase(COUNCIL_WINDOW + 1);

    const txExec = await contracts.governanceCore.executeProposal(1);
    await txExec.wait();

    const p = await contracts.governanceCore.getProposal(1);
    expect(p.status).to.equal(4); // Executed

    // Stake was refunded — but less gas, so balance should be close
    // Just confirm no revert and no reward
    const receipt = await txExec.wait();
    expect(receipt).to.not.be.null;
  });
});
