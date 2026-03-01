import { ethers, upgrades } from "hardhat";

async function main() {
  const proxyAddress = process.env.PROXY_ADDRESS;
  const contractName = process.env.CONTRACT_NAME;

  if (!proxyAddress || !contractName) {
    throw new Error("Set PROXY_ADDRESS and CONTRACT_NAME env vars");
  }

  console.log(`Proposing upgrade for ${contractName} at ${proxyAddress}...`);

  const ContractFactory = await ethers.getContractFactory(contractName);
  const proposal = await upgrades.prepareUpgrade(proxyAddress, ContractFactory, {
    kind: "uups",
  });

  console.log(`New implementation deployed at: ${proposal}`);
  console.log("Submit this address to GovernanceCore.proposeUpgrade()");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
