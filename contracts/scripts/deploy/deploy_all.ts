/**
 * Unified deployment script — deploys all contracts in correct order.
 *
 * Order: ProxyAdmin → Timelock → NFT → Treasury → VersionStore →
 *        GovernanceCore(registry=0) → Registry → Council →
 *        wire GovernanceCore.setRegistry → setup roles → activateGuardianNFTs
 *
 * Usage:
 *   npx hardhat run scripts/deploy/deploy_all.ts --network polkadotTestnet
 *   npx hardhat run scripts/deploy/deploy_all.ts --network hardhat
 */
import { ethers, upgrades } from "hardhat";
import fs from "fs";

const TIMELOCK_DELAY = 48 * 3600; // 48 hours

function save(data: Record<string, string>) {
  fs.writeFileSync("deployed-addresses.json", JSON.stringify(data, null, 2));
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  const addrs: Record<string, string> = {};

  // Council members: use env var or default to deployer repeated (testnet only)
  const rawMembers = process.env.INITIAL_COUNCIL_MEMBERS || "";
  let councilMembers = rawMembers.split(",").map((s) => s.trim()).filter(Boolean);
  if (councilMembers.length !== 7) {
    console.log("⚠ No INITIAL_COUNCIL_MEMBERS (need 7). Using deployer + generated wallets for testnet.");
    councilMembers = [];
    for (let i = 0; i < 7; i++) {
      councilMembers.push(ethers.Wallet.createRandom().address);
    }
  }
  console.log("Council members:", councilMembers);

  // ── 1. ProxyAdmin ──────────────────────────────────────────────────
  const ProxyAdminF = await ethers.getContractFactory("ProxyAdmin");
  const proxyAdmin = await ProxyAdminF.deploy(deployer.address);
  await proxyAdmin.waitForDeployment();
  addrs.ProxyAdmin = await proxyAdmin.getAddress();
  console.log("1/9 ProxyAdmin:", addrs.ProxyAdmin);
  save(addrs);

  // ── 2. TimelockController ──────────────────────────────────────────
  const TimelockF = await ethers.getContractFactory("TimelockController");
  const timelock = await TimelockF.deploy(
    TIMELOCK_DELAY,
    [],
    [ethers.ZeroAddress],
    deployer.address
  );
  await timelock.waitForDeployment();
  addrs.TimelockController = await timelock.getAddress();
  console.log("2/9 TimelockController:", addrs.TimelockController);
  save(addrs);

  // ── 3. NFTReward (UUPS) ────────────────────────────────────────────
  const NftF = await ethers.getContractFactory("NFTReward");
  const nftReward = await upgrades.deployProxy(NftF, [deployer.address], { kind: "uups" });
  await nftReward.waitForDeployment();
  addrs.NFTReward = await nftReward.getAddress();
  console.log("3/9 NFTReward:", addrs.NFTReward);
  save(addrs);

  // ── 4. Treasury (UUPS) ─────────────────────────────────────────────
  const TreasuryF = await ethers.getContractFactory("Treasury");
  const treasury = await upgrades.deployProxy(TreasuryF, [deployer.address], { kind: "uups" });
  await treasury.waitForDeployment();
  addrs.Treasury = await treasury.getAddress();
  console.log("4/9 Treasury:", addrs.Treasury);
  save(addrs);

  // ── 5. VersionStore (UUPS) ─────────────────────────────────────────
  const VsF = await ethers.getContractFactory("VersionStore");
  const versionStore = await upgrades.deployProxy(VsF, [deployer.address], { kind: "uups" });
  await versionStore.waitForDeployment();
  addrs.VersionStore = await versionStore.getAddress();
  console.log("5/9 VersionStore:", addrs.VersionStore);
  save(addrs);

  // ── 6. GovernanceCore (UUPS) — registry=ZeroAddress (set later) ────
  const GovF = await ethers.getContractFactory("GovernanceCore");
  const governance = await upgrades.deployProxy(
    GovF,
    [deployer.address, addrs.TimelockController, addrs.NFTReward, ethers.ZeroAddress],
    { kind: "uups" }
  );
  await governance.waitForDeployment();
  addrs.GovernanceCore = await governance.getAddress();
  console.log("6/9 GovernanceCore:", addrs.GovernanceCore);
  save(addrs);

  // ── 7. PolkaInkRegistry (UUPS) ─────────────────────────────────────
  const RegF = await ethers.getContractFactory("PolkaInkRegistry");
  const registry = await upgrades.deployProxy(
    RegF,
    [deployer.address, addrs.VersionStore, addrs.GovernanceCore, addrs.NFTReward, addrs.Treasury],
    { kind: "uups" }
  );
  await registry.waitForDeployment();
  addrs.PolkaInkRegistry = await registry.getAddress();
  console.log("7/9 PolkaInkRegistry:", addrs.PolkaInkRegistry);
  save(addrs);

  // Wire GovernanceCore → Registry
  await (await governance.setRegistry(addrs.PolkaInkRegistry)).wait();
  console.log("   GovernanceCore.setRegistry done");

  // ── 8. ArchiveCouncil (UUPS) ───────────────────────────────────────
  const CouncilF = await ethers.getContractFactory("ArchiveCouncil");
  const council = await upgrades.deployProxy(
    CouncilF,
    [deployer.address, addrs.GovernanceCore, addrs.NFTReward, councilMembers],
    { kind: "uups" }
  );
  await council.waitForDeployment();
  addrs.ArchiveCouncil = await council.getAddress();
  console.log("8/9 ArchiveCouncil:", addrs.ArchiveCouncil);
  save(addrs);

  // ── 9. Setup Roles ─────────────────────────────────────────────────
  console.log("\n─── Setting up roles ───");
  const r = (name: string) => ethers.keccak256(ethers.toUtf8Bytes(name));

  await (await versionStore.grantRole(r("WRITER_ROLE"), addrs.PolkaInkRegistry)).wait();
  await (await registry.grantRole(r("GOVERNANCE_ROLE"), addrs.GovernanceCore)).wait();
  await (await registry.grantRole(r("GOVERNANCE_ROLE"), addrs.ArchiveCouncil)).wait();
  await (await registry.grantRole(r("UPGRADER_ROLE"), addrs.TimelockController)).wait();
  console.log("✓ Registry + VersionStore roles");

  await (await nftReward.grantRole(r("AUTHOR_MINTER_ROLE"), addrs.PolkaInkRegistry)).wait();
  await (await nftReward.grantRole(r("GUARDIAN_MINTER_ROLE"), addrs.ArchiveCouncil)).wait();
  await (await nftReward.grantRole(r("UPGRADER_ROLE"), addrs.TimelockController)).wait();
  console.log("✓ NFTReward roles");

  await (await treasury.grantRole(r("DISTRIBUTOR_ROLE"), addrs.PolkaInkRegistry)).wait();
  await (await treasury.grantRole(r("SPEND_ROLE"), addrs.TimelockController)).wait();
  await (await treasury.grantRole(r("UPGRADER_ROLE"), addrs.TimelockController)).wait();
  console.log("✓ Treasury roles");

  await (await governance.grantRole(r("COUNCIL_ROLE"), addrs.ArchiveCouncil)).wait();
  await (await governance.grantRole(r("UPGRADER_ROLE"), addrs.TimelockController)).wait();
  console.log("✓ GovernanceCore roles");

  await (await council.grantRole(r("GOVERNANCE_ROLE"), addrs.GovernanceCore)).wait();
  await (await council.grantRole(r("UPGRADER_ROLE"), addrs.TimelockController)).wait();
  console.log("✓ ArchiveCouncil roles");

  await (await timelock.grantRole(r("PROPOSER_ROLE"), addrs.GovernanceCore)).wait();
  await (await timelock.grantRole(r("CANCELLER_ROLE"), addrs.GovernanceCore)).wait();
  console.log("✓ Timelock roles");

  // Mint Guardian NFTs
  await (await council.activateGuardianNFTs()).wait();
  console.log("✓ Guardian NFTs activated");

  // Transfer ProxyAdmin ownership to Timelock
  await (await proxyAdmin.transferOwnership(addrs.TimelockController)).wait();
  console.log("✓ ProxyAdmin → TimelockController");

  console.log("\n✅ Deployment complete!");
  console.log(JSON.stringify(addrs, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
