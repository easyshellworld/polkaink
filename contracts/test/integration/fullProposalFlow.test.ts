import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture, stakeFor } from "../fixtures/deployFixture";

describe("Full Proposal Flow (v2)", () => {
  const VOTING_PERIOD = 7 * 24 * 3600;

  it("should execute: stake → create doc → propose → vote → finalize → execute → mint Creator NFT", async () => {
    const { contracts, actors } = await loadFixture(deployFixture);
    const { registry, governanceCore, nftReward, stakingManager } = contracts;
    const { author1, voter1, voter2, voter3 } = actors;

    // Step 1: Stake
    await stakeFor(stakingManager, author1, 12);
    await stakeFor(stakingManager, voter1, 6);
    await stakeFor(stakingManager, voter2, 3);
    await stakeFor(stakingManager, voter3, 3);

    // Step 2: Create document
    await registry.connect(author1).createDocument("Polkadot History", ["polkadot"]);
    const doc = await registry.getDocument(1);
    expect(doc.title).to.equal("Polkadot History");

    // Step 3: Propose version (non-payable)
    const contentHash = ethers.keccak256(ethers.toUtf8Bytes("# Polkadot History\nContent..."));
    await registry.connect(author1).proposeVersion(
      1, 0, contentHash, ethers.toUtf8Bytes("# Polkadot History\nContent...")
    );

    // Step 4: Vote YES
    await governanceCore.connect(voter1).vote(1, 0); // Yes
    await governanceCore.connect(voter2).vote(1, 0);
    await governanceCore.connect(voter3).vote(1, 0);

    const p = await governanceCore.getProposal(1);
    expect(p.score).to.be.gt(0n);

    // Step 5: Advance past voting period and finalize
    await time.increase(VOTING_PERIOD + 1);
    await governanceCore.finalizeProposal(1);

    const finalized = await governanceCore.getProposal(1);
    expect(finalized.status).to.equal(1); // Approved

    // Step 6: Execute → merges version + mints Creator NFT
    await governanceCore.executeProposal(1);

    const executed = await governanceCore.getProposal(1);
    expect(executed.status).to.equal(4); // Executed

    // Verify: version merged
    const updatedDoc = await registry.getDocument(1);
    expect(updatedDoc.currentVersionId).to.be.gt(0n);

    // Verify: Creator NFT minted for proposer
    const creatorCount = await nftReward.activeCreatorCount(author1.address);
    expect(creatorCount).to.equal(1n);
  });

  it("should handle OG Gold veto in full flow", async () => {
    const { contracts, actors } = await loadFixture(deployFixture);
    const { governanceCore, stakingManager } = contracts;
    const { author1, voter1, voter2, ogGoldHolder } = actors;

    await stakeFor(stakingManager, author1, 3);
    await stakeFor(stakingManager, voter1, 3);
    await stakeFor(stakingManager, voter2, 3);
    await stakeFor(stakingManager, ogGoldHolder, 3);

    await governanceCore.connect(author1).createProposal(0, 1, 0, "0x", "veto test");

    // Community votes YES
    await governanceCore.connect(voter1).vote(1, 0);
    await governanceCore.connect(voter2).vote(1, 0);

    // OG Gold votes NO → instant veto
    await governanceCore.connect(ogGoldHolder).vote(1, 1);

    const p = await governanceCore.getProposal(1);
    expect(p.status).to.equal(3); // Vetoed
    expect(p.goldVetoed).to.be.true;
  });

  it("should handle rejection when score is below threshold", async () => {
    const { contracts, actors } = await loadFixture(deployFixture);
    const { governanceCore, stakingManager } = contracts;

    await stakeFor(stakingManager, actors.author1, 3);
    await stakeFor(stakingManager, actors.voter1, 3);

    await governanceCore.connect(actors.author1).createProposal(0, 1, 0, "0x", "reject test");

    // Only 1 YES vote: score ≈ 1.13 (< 2.0 threshold)
    await governanceCore.connect(actors.voter1).vote(1, 0);

    await time.increase(VOTING_PERIOD + 1);
    await governanceCore.finalizeProposal(1);

    const p = await governanceCore.getProposal(1);
    expect(p.status).to.equal(2); // Rejected
  });
});
