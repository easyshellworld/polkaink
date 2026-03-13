// scripts/deploy/04_deploy_version_store.ts
import { ethers, upgrades } from "hardhat";
import fs from "fs";

function loadAddresses() { return fs.existsSync("deployed-addresses.json") ? JSON.parse(fs.readFileSync("deployed-addresses.json","utf8")) : {}; }
function saveAddress(name: string, addr: string) { const a = loadAddresses(); a[name]=addr; fs.writeFileSync("deployed-addresses.json",JSON.stringify(a,null,2)); }

async function main() {
  const [deployer] = await ethers.getSigners();
  const VSFactory = await ethers.getContractFactory("VersionStore");
  const vs = await upgrades.deployProxy(VSFactory, [deployer.address], { kind: "uups" });
  await vs.waitForDeployment();
  const addr = await vs.getAddress();
  console.log("VersionStore deployed at:", addr);
  saveAddress("VersionStore", addr);
}
main().catch((e) => { console.error(e); process.exit(1); });
