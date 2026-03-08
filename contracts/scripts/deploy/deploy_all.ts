/**
 * PolkaInk v3.3 — Unified deployment script.
 *
 * Deploy order per §10.1:
 *   1. ProxyAdmin
 *   2. TimelockController
 *   3. NFTReward (v3.3) — genesis council members passed; Guardian NFTs minted in constructor
 *   4. Treasury (v3.3)  — epochStartTime = block.timestamp
 *   5. VersionStore
 *   6. StakingManager
 *   7. GovernanceCore (v3.3)
 *   8. PolkaInkRegistry (v3.3)
 *   9. ArchiveCouncil (v3.3) — genesis members, vetoThreshold=5
 *  10. Setup roles
 *  11. Admin deposits 5,000 PAS to rewardPool
 *  12. Create 4 seed documents
 *  13. Renounce SEED_CREATOR_ROLE
 *
 * Usage:
 *   npx hardhat run scripts/deploy/deploy_all.ts --network pasTestnet
 */
import { ethers, upgrades } from "hardhat";
import fs from "fs";

// ──────────────────────────────────────────────
// Genesis Council Members — replace before deploy
// ──────────────────────────────────────────────
const GENESIS_COUNCIL_MEMBERS: string[] = [
  "0x70c2aDa29240E6dA4cc978E10f8AFB9082Cc95B9",
  "0x5f237563A534EbBfE20eF8Af3D2A27450d5ebBdD",
  "0x3B0eF0655E0CDd990612E94d501144Cb6D92881C",
  "0x911ac35B2633144E2553eFAdC5F8cbe5Fa61BbAE",
  "0x02c42eFd137D52E216684B2573Af14669d5C0CDC",
  "0x8f9E2D821B84c8a6db2773828C40C0a7856Cce13",
  "0xB5192778b4214af925dF2B7E388B32bee08bd92a"
];

const VETO_THRESHOLD   = 5;
const TIMELOCK_DELAY   = 2 * 60; // 2 minutes (MVP; prod: 48 hours)
const INITIAL_POOL_PAS = ethers.parseEther("5000");

function save(data: Record<string, string>) {
  fs.writeFileSync("deployed-addresses.json", JSON.stringify(data, null, 2));
  console.log("\n✅ Addresses saved to deployed-addresses.json");
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "PAS\n"
  );

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

  // 3. NFTReward (v3.3 — Guardian NFTs minted in constructor)
  console.log("3. Deploying NFTReward (v3.3)...");
  const NFTFactory = await ethers.getContractFactory("NFTReward");
  const nftReward = await upgrades.deployProxy(
    NFTFactory,
    [deployer.address, GENESIS_COUNCIL_MEMBERS],
    { kind: "uups" }
  );
  await nftReward.waitForDeployment();
  console.log("   NFTReward:", await nftReward.getAddress());

  // 4. Treasury (v3.3)
  console.log("4. Deploying Treasury (v3.3)...");
  const TreasuryFactory = await ethers.getContractFactory("Treasury");
  const treasury = await upgrades.deployProxy(
    TreasuryFactory,
    [deployer.address],
    { kind: "uups" }
  );
  await treasury.waitForDeployment();
  console.log("   Treasury:", await treasury.getAddress());

  // 5. VersionStore
  console.log("5. Deploying VersionStore...");
  const VersionStoreFactory = await ethers.getContractFactory("VersionStore");
  const versionStore = await upgrades.deployProxy(
    VersionStoreFactory,
    [deployer.address],
    { kind: "uups" }
  );
  await versionStore.waitForDeployment();
  console.log("   VersionStore:", await versionStore.getAddress());

  // 6. StakingManager
  console.log("6. Deploying StakingManager...");
  const StakingFactory = await ethers.getContractFactory("StakingManager");
  const stakingManager = await upgrades.deployProxy(
    StakingFactory,
    [deployer.address, await nftReward.getAddress(), await treasury.getAddress()],
    { kind: "uups" }
  );
  await stakingManager.waitForDeployment();
  console.log("   StakingManager:", await stakingManager.getAddress());

  // 7. GovernanceCore (v3.3)
  console.log("7. Deploying GovernanceCore (v3.3)...");
  const GovFactory = await ethers.getContractFactory("GovernanceCore");
  const governanceCore = await upgrades.deployProxy(
    GovFactory,
    [
      deployer.address,
      await timelock.getAddress(),
      await nftReward.getAddress(),
      await stakingManager.getAddress(),
      await treasury.getAddress(),
    ],
    { kind: "uups" }
  );
  await governanceCore.waitForDeployment();
  console.log("   GovernanceCore:", await governanceCore.getAddress());

  // 8. PolkaInkRegistry (v3.3)
  console.log("8. Deploying PolkaInkRegistry (v3.3)...");
  const RegistryFactory = await ethers.getContractFactory("PolkaInkRegistry");
  const registry = await upgrades.deployProxy(
    RegistryFactory,
    [
      deployer.address,
      await versionStore.getAddress(),
      await governanceCore.getAddress(),
      await stakingManager.getAddress(),
    ],
    { kind: "uups" }
  );
  await registry.waitForDeployment();
  console.log("   PolkaInkRegistry:", await registry.getAddress());

  // 9. ArchiveCouncil (v3.3)
  console.log("9. Deploying ArchiveCouncil (v3.3)...");
  const CouncilFactory = await ethers.getContractFactory("ArchiveCouncil");
  const archiveCouncil = await upgrades.deployProxy(
    CouncilFactory,
    [deployer.address, GENESIS_COUNCIL_MEMBERS, VETO_THRESHOLD],
    { kind: "uups" }
  );
  await archiveCouncil.waitForDeployment();
  console.log("   ArchiveCouncil:", await archiveCouncil.getAddress());

  // ─── 10. Setup Cross-References + Roles ──────────────────────────────────

  console.log("\n10. Setting up cross-references and roles...");

  // GovernanceCore ← registry + archiveCouncil
  await (governanceCore as any).setRegistry(await registry.getAddress());
  await (governanceCore as any).setArchiveCouncil(await archiveCouncil.getAddress());
  console.log("   GovernanceCore: registry + archiveCouncil set ✓");

  // ArchiveCouncil ← contracts
  await (archiveCouncil as any).setContracts(
    await governanceCore.getAddress(),
    await registry.getAddress(),
    await treasury.getAddress()
  );
  console.log("   ArchiveCouncil: contracts set ✓");

  const WRITER_ROLE         = ethers.keccak256(ethers.toUtf8Bytes("WRITER_ROLE"));
  const GOVERNANCE_ROLE     = ethers.keccak256(ethers.toUtf8Bytes("GOVERNANCE_ROLE"));
  const COUNCIL_ROLE        = ethers.keccak256(ethers.toUtf8Bytes("COUNCIL_ROLE"));
  const REGISTRY_ROLE       = ethers.keccak256(ethers.toUtf8Bytes("REGISTRY_ROLE"));
  const SEED_CREATOR_ROLE   = ethers.keccak256(ethers.toUtf8Bytes("SEED_CREATOR_ROLE"));
  const MEMBER_MINTER_ROLE  = ethers.keccak256(ethers.toUtf8Bytes("MEMBER_MINTER_ROLE"));
  const CREATOR_MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CREATOR_MINTER_ROLE"));
  const SPEND_ROLE          = ethers.keccak256(ethers.toUtf8Bytes("SPEND_ROLE"));
  const UPGRADER_ROLE       = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));
  const PROPOSER_ROLE       = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
  const CANCELLER_ROLE      = ethers.keccak256(ethers.toUtf8Bytes("CANCELLER_ROLE"));

  // NFTReward — no GUARDIAN_MINTER_ROLE
  await (nftReward as any).grantRole(MEMBER_MINTER_ROLE, await stakingManager.getAddress());
  await (nftReward as any).grantRole(CREATOR_MINTER_ROLE, await governanceCore.getAddress());
  console.log("   NFTReward: MEMBER_MINTER → StakingManager, CREATOR_MINTER → GovernanceCore ✓");

  // GovernanceCore
  await (governanceCore as any).grantRole(REGISTRY_ROLE, await registry.getAddress());
  await (governanceCore as any).grantRole(COUNCIL_ROLE, await archiveCouncil.getAddress());
  console.log("   GovernanceCore: REGISTRY_ROLE + COUNCIL_ROLE ✓");

  // PolkaInkRegistry
  await (registry as any).grantRole(GOVERNANCE_ROLE, await governanceCore.getAddress());
  await (registry as any).grantRole(COUNCIL_ROLE, await archiveCouncil.getAddress());
  await (registry as any).grantRole(SEED_CREATOR_ROLE, deployer.address);
  console.log("   Registry: GOVERNANCE_ROLE + COUNCIL_ROLE + SEED_CREATOR_ROLE ✓");

  // VersionStore
  await (versionStore as any).grantRole(WRITER_ROLE, await registry.getAddress());
  console.log("   VersionStore: WRITER_ROLE → Registry ✓");

  // Treasury
  await (treasury as any).grantRole(GOVERNANCE_ROLE, await governanceCore.getAddress());
  await (treasury as any).grantRole(COUNCIL_ROLE, await archiveCouncil.getAddress());
  await (treasury as any).grantRole(SPEND_ROLE, await timelock.getAddress());
  console.log("   Treasury: GOVERNANCE_ROLE + COUNCIL_ROLE + SPEND_ROLE ✓");

  // TimelockController
  await (timelock as any).grantRole(PROPOSER_ROLE, await governanceCore.getAddress());
  await (timelock as any).grantRole(CANCELLER_ROLE, await governanceCore.getAddress());
  console.log("   TimelockController: PROPOSER_ROLE + CANCELLER_ROLE → GovernanceCore ✓");

  // UPGRADER_ROLE → Timelock on all upgradeable contracts
  const upgradeables = [versionStore, registry, nftReward, treasury, governanceCore, stakingManager, archiveCouncil];
  for (const c of upgradeables) {
    await (c as any).grantRole(UPGRADER_ROLE, await timelock.getAddress());
  }
  console.log("   UPGRADER_ROLE → Timelock on all upgradeable contracts ✓");

  // Transfer ProxyAdmin ownership to Timelock
  await proxyAdmin.transferOwnership(await timelock.getAddress());
  console.log("   ProxyAdmin ownership → Timelock ✓");

  // ─── 11. Admin deposits 5,000 PAS to rewardPool ───────────────────────────

  console.log("\n11. Depositing 5,000 PAS to rewardPool...");
  await (treasury as any).depositRewardPool({ value: INITIAL_POOL_PAS });
  console.log("   rewardPool funded ✓");

  // ─── 12. Create seed documents ────────────────────────────────────────────

  console.log("\n12. Creating seed documents...");
  const seeds = [
    { title: "Polkadot Ecosystem Milestones", tags: ["#history", "#timeline"] },
    { title: "Governance Proposal Records",   tags: ["#governance", "#referenda"] },
    { title: "Runtime Upgrade Log",           tags: ["#technical", "#runtime"] },
    { title: "Ecosystem Project Milestones",  tags: ["#ecosystem", "#projects"] },
  ];

  for (const seed of seeds) {
    const tx = await (registry as any).createSeedDocument(seed.title, seed.tags);
    await tx.wait();
    console.log(`   Seed created: "${seed.title}" ✓`);
  }

  // ─── 13. Renounce SEED_CREATOR_ROLE ──────────────────────────────────────

  console.log("\n13. Renouncing SEED_CREATOR_ROLE...");
  await (registry as any).renounceRole(SEED_CREATOR_ROLE, deployer.address);
  console.log("   SEED_CREATOR_ROLE renounced. Admin has zero privileges. ✓");

  // ─── Save addresses ────────────────────────────────────────────────────────

  const addresses = {
    ProxyAdmin:        await proxyAdmin.getAddress(),
    TimelockController: await timelock.getAddress(),
    NFTReward:         await nftReward.getAddress(),
    Treasury:          await treasury.getAddress(),
    VersionStore:      await versionStore.getAddress(),
    StakingManager:    await stakingManager.getAddress(),
    GovernanceCore:    await governanceCore.getAddress(),
    PolkaInkRegistry:  await registry.getAddress(),
    ArchiveCouncil:    await archiveCouncil.getAddress(),
  };

  save(addresses);
  console.log("\n🎉 PolkaInk v3.3 deployment complete!\n");
  console.table(addresses);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
