// scripts/deploy/09_setup_roles.ts
// Run this LAST after all contracts are deployed.
// Wires all role permissions as specified in the design document.

import { ethers } from "hardhat";
import fs from "fs";

function loadAddresses(): Record<string, string> {
  return JSON.parse(fs.readFileSync("deployed-addresses.json", "utf8"));
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const addrs = loadAddresses();

  console.log("Setting up roles...");
  console.log("Deployer:", deployer.address);
  console.log("Contracts:", addrs);

  const registry       = await ethers.getContractAt("PolkaInkRegistry",  addrs.PolkaInkRegistry);
  const versionStore   = await ethers.getContractAt("VersionStore",       addrs.VersionStore);
  const governance     = await ethers.getContractAt("GovernanceCore",     addrs.GovernanceCore);
  const council        = await ethers.getContractAt("ArchiveCouncil",     addrs.ArchiveCouncil);
  const nftReward      = await ethers.getContractAt("NFTReward",          addrs.NFTReward);
  const treasury       = await ethers.getContractAt("Treasury",           addrs.Treasury);
  const timelock       = await ethers.getContractAt("TimelockController", addrs.TimelockController);
  const proxyAdmin     = await ethers.getContractAt("ProxyAdmin",         addrs.ProxyAdmin);

  const r = (name: string) => ethers.keccak256(ethers.toUtf8Bytes(name));

  // Registry roles
  await (await registry.grantRole(r("GOVERNANCE_ROLE"), addrs.GovernanceCore)).wait();
  await (await registry.grantRole(r("GOVERNANCE_ROLE"), addrs.ArchiveCouncil)).wait();
  await (await registry.grantRole(r("UPGRADER_ROLE"),   addrs.TimelockController)).wait();
  console.log("✓ Registry roles set");

  // VersionStore roles
  await (await versionStore.grantRole(r("WRITER_ROLE"),   addrs.PolkaInkRegistry)).wait();
  await (await versionStore.grantRole(r("UPGRADER_ROLE"), addrs.TimelockController)).wait();
  console.log("✓ VersionStore roles set");

  // NFTReward roles
  await (await nftReward.grantRole(r("AUTHOR_MINTER_ROLE"),   addrs.PolkaInkRegistry)).wait();
  await (await nftReward.grantRole(r("GUARDIAN_MINTER_ROLE"), addrs.ArchiveCouncil)).wait();
  await (await nftReward.grantRole(r("UPGRADER_ROLE"),        addrs.TimelockController)).wait();
  console.log("✓ NFTReward roles set");

  // Treasury roles
  await (await treasury.grantRole(r("DISTRIBUTOR_ROLE"), addrs.PolkaInkRegistry)).wait();
  await (await treasury.grantRole(r("SPEND_ROLE"),       addrs.TimelockController)).wait();
  await (await treasury.grantRole(r("UPGRADER_ROLE"),    addrs.TimelockController)).wait();
  console.log("✓ Treasury roles set");

  // GovernanceCore roles
  await (await governance.grantRole(r("COUNCIL_ROLE"),  addrs.ArchiveCouncil)).wait();
  await (await governance.grantRole(r("UPGRADER_ROLE"), addrs.TimelockController)).wait();
  console.log("✓ GovernanceCore roles set");

  // ArchiveCouncil roles
  await (await council.grantRole(r("GOVERNANCE_ROLE"), addrs.GovernanceCore)).wait();
  await (await council.grantRole(r("UPGRADER_ROLE"),   addrs.TimelockController)).wait();
  console.log("✓ ArchiveCouncil roles set");

  // TimelockController: set GovernanceCore as proposer/canceller
  await (await timelock.grantRole(r("PROPOSER_ROLE"),  addrs.GovernanceCore)).wait();
  await (await timelock.grantRole(r("CANCELLER_ROLE"), addrs.GovernanceCore)).wait();
  console.log("✓ Timelock proposer/canceller set");

  // Transfer ProxyAdmin ownership to TimelockController
  await (await proxyAdmin.transferOwnership(addrs.TimelockController)).wait();
  console.log("✓ ProxyAdmin ownership transferred to TimelockController");

  // (Optional) Revoke deployer admin roles from sensitive contracts
  // Uncomment for production deployment:
  // await registry.renounceRole(ethers.ZeroHash, deployer.address);
  // await governance.renounceRole(ethers.ZeroHash, deployer.address);

  console.log("\n✅ All roles configured. System is ready.");
}

main().catch((e) => { console.error(e); process.exit(1); });
