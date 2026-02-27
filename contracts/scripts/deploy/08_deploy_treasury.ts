// scripts/deploy/08_deploy_treasury.ts
import { ethers, upgrades } from "hardhat";
import fs from "fs";

function loadAddresses() { return fs.existsSync("deployed-addresses.json") ? JSON.parse(fs.readFileSync("deployed-addresses.json","utf8")) : {}; }
function saveAddress(name: string, addr: string) { const a = loadAddresses(); a[name]=addr; fs.writeFileSync("deployed-addresses.json",JSON.stringify(a,null,2)); }

async function main() {
  const [deployer] = await ethers.getSigners();
  const Factory = await ethers.getContractFactory("Treasury");
  const proxy = await upgrades.deployProxy(Factory, [deployer.address], { kind: "uups" });
  await proxy.waitForDeployment();
  const addr = await proxy.getAddress();
  console.log("Treasury deployed at:", addr);
  saveAddress("Treasury", addr);
}
main().catch((e) => { console.error(e); process.exit(1); });
