/**
 * PolkaInk v2 — Unified deployment script.
 *
 * Order: ProxyAdmin → Timelock → NFTReward → Treasury → VersionStore →
 *        StakingManager → GovernanceCore → PolkaInkRegistry → ReportManager →
 *        Setup cross-references + roles
 *
 * Usage:
 *   npx hardhat run scripts/deploy/deploy_all.ts --network pasTestnet
 */
import { ethers, upgrades } from "hardhat";
import fs from "fs";

const TIMELOCK_DELAY = 48 * 3600; // 48 hours

function save(data: Record<string, string>) {
  fs.writeFileSync("deployed-addresses.json", JSON.stringify(data, null, 2));
  console.log("\n✅ Addresses saved to deployed-addresses.json");
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "DOT\n");

  // 1. ProxyAdmin
  console.log("1. Deploying ProxyAdmin...");
  const ProxyAdminFactory = await ethers.getContractFactory("ProxyAdmin");
  const proxyAdmin = await ProxyAdminFactory.deploy(deployer.address);
  await proxyAdmin.waitForDeployment();
  console.log("   ProxyAdmin:", await proxyAdmin.getAddress());

  // 2. TimelockController
  console.log("2. Deploying TimelockController...");
  const TimelockFactory = await ethers.getContractFactory("TimelockController");
  const timelock = await TimelockFactory.deploy(
    TIMELOCK_DELAY, [], [ethers.ZeroAddress], deployer.address
  );
  await timelock.waitForDeployment();
  console.log("   TimelockController:", await timelock.getAddress());

  // 3. NFTReward (UUPS)
  console.log("3. Deploying NFTReward...");
  const NFTFactory = await ethers.getContractFactory("NFTReward");
  const nftReward = await upgrades.deployProxy(NFTFactory, [deployer.address], { kind: "uups" });
  await nftReward.waitForDeployment();
  console.log("   NFTReward:", await nftReward.getAddress());

  // 4. Treasury (UUPS)
  console.log("4. Deploying Treasury...");
  const TreasuryFactory = await ethers.getContractFactory("Treasury");
  const treasury = await upgrades.deployProxy(TreasuryFactory, [deployer.address], { kind: "uups" });
  await treasury.waitForDeployment();
  console.log("   Treasury:", await treasury.getAddress());

  // 5. VersionStore (UUPS)
  console.log("5. Deploying VersionStore...");
  const VersionStoreFactory = await ethers.getContractFactory("VersionStore");
  const versionStore = await upgrades.deployProxy(VersionStoreFactory, [deployer.address], { kind: "uups" });
  await versionStore.waitForDeployment();
  console.log("   VersionStore:", await versionStore.getAddress());

  // 6. StakingManager (UUPS)
  console.log("6. Deploying StakingManager...");
  const StakingFactory = await ethers.getContractFactory("StakingManager");
  const stakingManager = await upgrades.deployProxy(
    StakingFactory,
    [deployer.address, await nftReward.getAddress(), await treasury.getAddress()],
    { kind: "uups" }
  );
  await stakingManager.waitForDeployment();
  console.log("   StakingManager:", await stakingManager.getAddress());

  // 7. GovernanceCore (UUPS) — registry set later
  console.log("7. Deploying GovernanceCore...");
  const GovFactory = await ethers.getContractFactory("GovernanceCore");
  const governanceCore = await upgrades.deployProxy(
    GovFactory,
    [deployer.address, await timelock.getAddress(), await nftReward.getAddress(), await stakingManager.getAddress()],
    { kind: "uups" }
  );
  await governanceCore.waitForDeployment();
  console.log("   GovernanceCore:", await governanceCore.getAddress());

  // 8. PolkaInkRegistry (UUPS)
  console.log("8. Deploying PolkaInkRegistry...");
  const RegistryFactory = await ethers.getContractFactory("PolkaInkRegistry");
  const registry = await upgrades.deployProxy(
    RegistryFactory,
    [
      deployer.address,
      await versionStore.getAddress(),
      await governanceCore.getAddress(),
      await nftReward.getAddress(),
      await stakingManager.getAddress(),
    ],
    { kind: "uups" }
  );
  await registry.waitForDeployment();
  console.log("   PolkaInkRegistry:", await registry.getAddress());

  // 9. ReportManager (UUPS)
  console.log("9. Deploying ReportManager...");
  const ReportFactory = await ethers.getContractFactory("ReportManager");
  const reportManager = await upgrades.deployProxy(
    ReportFactory,
    [
      deployer.address,
      await stakingManager.getAddress(),
      await governanceCore.getAddress(),
      await registry.getAddress(),
    ],
    { kind: "uups" }
  );
  await reportManager.waitForDeployment();
  console.log("   ReportManager:", await reportManager.getAddress());

  // ─── 10. Setup Cross-References + Roles ──────────────────────────────

  console.log("\n10. Setting up cross-references and roles...");

  // Set registry in GovernanceCore
  await (governanceCore as any).setRegistry(await registry.getAddress());
  console.log("   GovernanceCore.setRegistry ✓");

  const WRITER_ROLE         = ethers.keccak256(ethers.toUtf8Bytes("WRITER_ROLE"));
  const GOVERNANCE_ROLE     = ethers.keccak256(ethers.toUtf8Bytes("GOVERNANCE_ROLE"));
  const REGISTRY_ROLE       = ethers.keccak256(ethers.toUtf8Bytes("REGISTRY_ROLE"));
  const REPORT_ROLE         = ethers.keccak256(ethers.toUtf8Bytes("REPORT_ROLE"));
  const MEMBER_MINTER_ROLE  = ethers.keccak256(ethers.toUtf8Bytes("MEMBER_MINTER_ROLE"));
  const CREATOR_MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CREATOR_MINTER_ROLE"));
  const AUTHOR_MINTER_ROLE  = ethers.keccak256(ethers.toUtf8Bytes("AUTHOR_MINTER_ROLE"));
  const SPEND_ROLE          = ethers.keccak256(ethers.toUtf8Bytes("SPEND_ROLE"));
  const UPGRADER_ROLE       = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));
  const PROPOSER_ROLE       = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
  const CANCELLER_ROLE      = ethers.keccak256(ethers.toUtf8Bytes("CANCELLER_ROLE"));

  // VersionStore
  await (versionStore as any).grantRole(WRITER_ROLE, await registry.getAddress());
  console.log("   VersionStore.WRITER → Registry ✓");

  // NFTReward
  await (nftReward as any).grantRole(MEMBER_MINTER_ROLE, await stakingManager.getAddress());
  await (nftReward as any).grantRole(CREATOR_MINTER_ROLE, await registry.getAddress());
  await (nftReward as any).grantRole(AUTHOR_MINTER_ROLE, await registry.getAddress());
  console.log("   NFTReward minting roles ✓");

  // GovernanceCore
  await (governanceCore as any).grantRole(REGISTRY_ROLE, await registry.getAddress());
  console.log("   GovernanceCore.REGISTRY → Registry ✓");

  // Registry
  await (registry as any).grantRole(GOVERNANCE_ROLE, await governanceCore.getAddress());
  await (registry as any).grantRole(REPORT_ROLE, await reportManager.getAddress());
  console.log("   Registry roles ✓");

  // Treasury
  await (treasury as any).grantRole(SPEND_ROLE, await timelock.getAddress());
  console.log("   Treasury.SPEND → Timelock ✓");

  // Timelock
  await (timelock as any).grantRole(PROPOSER_ROLE, await governanceCore.getAddress());
  await (timelock as any).grantRole(CANCELLER_ROLE, await governanceCore.getAddress());
  console.log("   Timelock roles ✓");

  // UPGRADER_ROLE for timelock on all upgradeable contracts
  const upgradeableContracts = [
    versionStore, registry, nftReward, treasury,
    governanceCore, stakingManager, reportManager,
  ];
  for (const c of upgradeableContracts) {
    await (c as any).grantRole(UPGRADER_ROLE, await timelock.getAddress());
  }
  console.log("   UPGRADER_ROLE → Timelock on all contracts ✓");

  // Transfer ProxyAdmin ownership to timelock
  await proxyAdmin.transferOwnership(await timelock.getAddress());
  console.log("   ProxyAdmin ownership → Timelock ✓");

  // ─── Save addresses ──────────────────────────────────────────────────

  const addresses = {
    ProxyAdmin: await proxyAdmin.getAddress(),
    TimelockController: await timelock.getAddress(),
    NFTReward: await nftReward.getAddress(),
    Treasury: await treasury.getAddress(),
    VersionStore: await versionStore.getAddress(),
    StakingManager: await stakingManager.getAddress(),
    GovernanceCore: await governanceCore.getAddress(),
    PolkaInkRegistry: await registry.getAddress(),
    ReportManager: await reportManager.getAddress(),
  };

  save(addresses);
  console.log("\n🎉 Deployment complete!\n");
  console.table(addresses);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
