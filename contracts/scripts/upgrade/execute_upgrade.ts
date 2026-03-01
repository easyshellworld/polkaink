import { ethers } from "hardhat";

async function main() {
  const timelockAddress = process.env.TIMELOCK_ADDRESS;
  const proposalId = process.env.PROPOSAL_ID;

  if (!timelockAddress || !proposalId) {
    throw new Error("Set TIMELOCK_ADDRESS and PROPOSAL_ID env vars");
  }

  console.log(`Executing upgrade proposal #${proposalId} via Timelock ${timelockAddress}...`);

  const timelock = await ethers.getContractAt("TimelockController", timelockAddress);
  const tx = await timelock.executeUpgrade(BigInt(proposalId));
  const receipt = await tx.wait();

  console.log(`Upgrade executed in tx: ${receipt?.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
