// scripts/deploy/06_deploy_council.ts
import { ethers, upgrades } from "hardhat";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

function loadAddresses() { return fs.existsSync("deployed-addresses.json") ? JSON.parse(fs.readFileSync("deployed-addresses.json","utf8")) : {}; }
function saveAddress(name: string, addr: string) { const a = loadAddresses(); a[name]=addr; fs.writeFileSync("deployed-addresses.json",JSON.stringify(a,null,2)); }

async function main() {
  const [deployer] = await ethers.getSigners();
  const addrs = loadAddresses();

  // COUNCIL_MEMBERS env var: comma-separated list of 7 addresses
  const rawMembers = process.env.INITIAL_COUNCIL_MEMBERS || "";
  const initialMembers = rawMembers.split(",").map(s => s.trim()).filter(Boolean);
  if (initialMembers.length !== 7) throw new Error("INITIAL_COUNCIL_MEMBERS must have exactly 7 addresses");

  const Factory = await ethers.getContractFactory("ArchiveCouncil");
  const proxy = await upgrades.deployProxy(Factory, [
    deployer.address,
    addrs.GovernanceCore,
    addrs.NFTReward,
    initialMembers,
  ], { kind: "uups" });
  await proxy.waitForDeployment();
  const addr = await proxy.getAddress();
  console.log("ArchiveCouncil deployed at:", addr);
  saveAddress("ArchiveCouncil", addr);
}
main().catch((e) => { console.error(e); process.exit(1); });
