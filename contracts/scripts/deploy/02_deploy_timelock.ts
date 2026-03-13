// scripts/deploy/02_deploy_timelock.ts
import { ethers } from "hardhat";
import fs from "fs";

const TIMELOCK_DELAY = 48 * 3600; // 48 hours

function loadAddresses(): Record<string, string> {
  const path = "deployed-addresses.json";
  return fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, "utf8")) : {};
}
function saveAddress(name: string, address: string) {
  const path = "deployed-addresses.json";
  const existing = loadAddresses();
  existing[name] = address;
  fs.writeFileSync(path, JSON.stringify(existing, null, 2));
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying TimelockController with account:", deployer.address);

  const TimelockFactory = await ethers.getContractFactory("TimelockController");
  const timelock = await TimelockFactory.deploy(
    TIMELOCK_DELAY,
    [], // proposers set in 09_setup_roles
    [ethers.ZeroAddress], // anyone can execute
    deployer.address
  );
  await timelock.waitForDeployment();

  const address = await timelock.getAddress();
  console.log("TimelockController deployed at:", address);
  saveAddress("TimelockController", address);
}

main().catch((err) => { console.error(err); process.exit(1); });
