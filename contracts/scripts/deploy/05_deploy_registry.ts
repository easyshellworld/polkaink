// scripts/deploy/05_deploy_registry.ts
import { ethers, upgrades } from "hardhat";
import fs from "fs";

function loadAddresses() { return fs.existsSync("deployed-addresses.json") ? JSON.parse(fs.readFileSync("deployed-addresses.json","utf8")) : {}; }
function saveAddress(name: string, addr: string) { const a = loadAddresses(); a[name]=addr; fs.writeFileSync("deployed-addresses.json",JSON.stringify(a,null,2)); }

async function main() {
  const [deployer] = await ethers.getSigners();
  const addrs = loadAddresses();
  const Factory = await ethers.getContractFactory("PolkaInkRegistry");
  const proxy = await upgrades.deployProxy(Factory, [
    deployer.address,
    addrs.VersionStore,
    addrs.GovernanceCore, // may be ZeroAddress at this stage; wired in setup_roles
    addrs.NFTReward,
    addrs.Treasury,
  ], { kind: "uups" });
  await proxy.waitForDeployment();
  const addr = await proxy.getAddress();
  console.log("PolkaInkRegistry deployed at:", addr);
  saveAddress("PolkaInkRegistry", addr);
}
main().catch((e) => { console.error(e); process.exit(1); });
