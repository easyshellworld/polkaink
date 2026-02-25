import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("═══════════════════════════════════════════════════════");
  console.log("  ◎ PolkaInk — Deploying to Polkadot Hub TestNet");
  console.log("═══════════════════════════════════════════════════════");
  console.log("Deployer address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "PAS");

  if (balance === 0n) {
    console.error("\n❌ No PAS balance! Get testnet tokens from:");
    console.error("   https://faucet.polkadot.io/");
    process.exit(1);
  }

  // Deploy PolkaInk contract
  console.log("\n📦 Deploying PolkaInk contract...");
  const PolkaInk = await ethers.getContractFactory("PolkaInk");
  const polkaInk = await PolkaInk.deploy();
  await polkaInk.waitForDeployment();

  const contractAddress = await polkaInk.getAddress();
  console.log("✅ PolkaInk deployed to:", contractAddress);

  // Verify deployment by reading state
  const totalDocs = await polkaInk.totalDocuments();
  const totalVersions = await polkaInk.totalVersions();
  const totalProposals = await polkaInk.totalProposals();
  const params = await polkaInk.params();
  const contractOwner = await polkaInk.owner();

  console.log("\n📊 Contract State:");
  console.log("   Owner:", contractOwner);
  console.log("   Total Documents:", totalDocs.toString());
  console.log("   Total Versions:", totalVersions.toString());
  console.log("   Total Proposals:", totalProposals.toString());
  console.log("   Min Stake:", ethers.formatEther(params.minStake), "PAS");
  console.log("   Voting Period:", (Number(params.votingPeriod) / 86400).toFixed(1), "days");
  console.log("   Passing Threshold:", params.passingThreshold.toString() + "%");

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  🎉 Deployment complete!");
  console.log("  Contract:", contractAddress);
  console.log("  Explorer: https://polkadot.testnet.routescan.io/address/" + contractAddress);
  console.log("═══════════════════════════════════════════════════════");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

