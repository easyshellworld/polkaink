import { ethers, upgrades } from "hardhat";

const GOV_PROXY = "0x68839E647AAe54D788BA9cD1aEC87190C7e3999e";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const UPGRADER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));
  const gov = (await ethers.getContractFactory("GovernanceCore")).attach(GOV_PROXY);
  const hasRole = await gov.hasRole(UPGRADER_ROLE, deployer.address);
  console.log("Has UPGRADER_ROLE:", hasRole);

  if (!hasRole) {
    console.log("Granting UPGRADER_ROLE to deployer...");
    const tx = await gov.grantRole(UPGRADER_ROLE, deployer.address);
    await tx.wait();
    console.log("Granted.");
  }

  console.log("Deploying new GovernanceCore implementation...");
  const GovFactory = await ethers.getContractFactory("GovernanceCore");
  const upgraded = await upgrades.upgradeProxy(GOV_PROXY, GovFactory, {
    unsafeSkipStorageCheck: true,
  });
  await upgraded.waitForDeployment();
  console.log("GovernanceCore upgraded at:", await upgraded.getAddress());

  const vp = await upgraded.getVotingPeriod();
  console.log("Current voting period:", vp.toString(), "seconds (" + (Number(vp) / 86400).toFixed(1) + " days)");

  console.log("\n✅ Upgrade complete!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
