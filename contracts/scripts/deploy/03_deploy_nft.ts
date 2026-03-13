// scripts/deploy/03_deploy_nft.ts
import { ethers, upgrades } from "hardhat";
import fs from "fs";

function loadAddresses(): Record<string, string> {
  return fs.existsSync("deployed-addresses.json")
    ? JSON.parse(fs.readFileSync("deployed-addresses.json", "utf8"))
    : {};
}
function saveAddress(name: string, address: string) {
  const existing = loadAddresses();
  existing[name] = address;
  fs.writeFileSync("deployed-addresses.json", JSON.stringify(existing, null, 2));
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying NFTReward with account:", deployer.address);

  const NFTFactory = await ethers.getContractFactory("NFTReward");
  const nftReward = await upgrades.deployProxy(NFTFactory, [deployer.address], { kind: "uups" });
  await nftReward.waitForDeployment();

  const address = await nftReward.getAddress();
  console.log("NFTReward (proxy) deployed at:", address);
  saveAddress("NFTReward", address);
}

main().catch((err) => { console.error(err); process.exit(1); });
