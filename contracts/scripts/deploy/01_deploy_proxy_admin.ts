// scripts/deploy/01_deploy_proxy_admin.ts
import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying ProxyAdmin with account:", deployer.address);

  const ProxyAdminFactory = await ethers.getContractFactory("ProxyAdmin");
  const proxyAdmin = await ProxyAdminFactory.deploy(deployer.address);
  await proxyAdmin.waitForDeployment();

  const address = await proxyAdmin.getAddress();
  console.log("ProxyAdmin deployed at:", address);
  saveAddress("ProxyAdmin", address);
}

function saveAddress(name: string, address: string) {
  const path = "deployed-addresses.json";
  const existing = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, "utf8")) : {};
  existing[name] = address;
  fs.writeFileSync(path, JSON.stringify(existing, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });
