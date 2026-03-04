import { ethers, upgrades } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import {
  PolkaInkRegistry,
  VersionStore,
  GovernanceCore,
  TimelockController,
  NFTReward,
  Treasury,
  ProxyAdmin,
  StakingManager,
  ReportManager,
} from "../../typechain-types";

export interface DeployedContracts {
  registry: PolkaInkRegistry;
  versionStore: VersionStore;
  governanceCore: GovernanceCore;
  timelock: TimelockController;
  nftReward: NFTReward;
  treasury: Treasury;
  proxyAdmin: ProxyAdmin;
  stakingManager: StakingManager;
  reportManager: ReportManager;
}

export interface Actors {
  admin: HardhatEthersSigner;
  author1: HardhatEthersSigner;
  author2: HardhatEthersSigner;
  voter1: HardhatEthersSigner;
  voter2: HardhatEthersSigner;
  voter3: HardhatEthersSigner;
  ogGoldHolder: HardhatEthersSigner;
}

const TIMELOCK_DELAY = 60; // 60s for tests
const STAKE_AMOUNT = ethers.parseEther("88");

export { STAKE_AMOUNT };

/**
 * Helper: stake 88 DOT for a user to become an active member.
 */
export async function stakeFor(
  stakingManager: StakingManager,
  user: HardhatEthersSigner,
  lockMonths: number = 3
) {
  await stakingManager.connect(user).stake(lockMonths, { value: STAKE_AMOUNT });
}

export async function deployFixture(): Promise<{ contracts: DeployedContracts; actors: Actors }> {
  const signers = await ethers.getSigners();
  const admin = signers[0];
  const author1 = signers[1];
  const author2 = signers[2];
  const voter1 = signers[3];
  const voter2 = signers[4];
  const voter3 = signers[5];
  const ogGoldHolder = signers[6];

  // 1. ProxyAdmin
  const ProxyAdminFactory = await ethers.getContractFactory("ProxyAdmin");
  const proxyAdmin = (await ProxyAdminFactory.deploy(admin.address)) as ProxyAdmin;
  await proxyAdmin.waitForDeployment();

  // 2. TimelockController
  const TimelockFactory = await ethers.getContractFactory("TimelockController");
  const timelock = (await TimelockFactory.deploy(
    TIMELOCK_DELAY, [], [ethers.ZeroAddress], admin.address
  )) as TimelockController;
  await timelock.waitForDeployment();

  // 3. NFTReward (UUPS)
  const NFTFactory = await ethers.getContractFactory("NFTReward");
  const nftReward = (await upgrades.deployProxy(NFTFactory, [admin.address], {
    kind: "uups",
  })) as unknown as NFTReward;
  await nftReward.waitForDeployment();

  // 4. Treasury (UUPS)
  const TreasuryFactory = await ethers.getContractFactory("Treasury");
  const treasury = (await upgrades.deployProxy(TreasuryFactory, [admin.address], {
    kind: "uups",
  })) as unknown as Treasury;
  await treasury.waitForDeployment();

  // 5. VersionStore (UUPS)
  const VersionStoreFactory = await ethers.getContractFactory("VersionStore");
  const versionStore = (await upgrades.deployProxy(VersionStoreFactory, [admin.address], {
    kind: "uups",
  })) as unknown as VersionStore;
  await versionStore.waitForDeployment();

  // 6. StakingManager (UUPS)
  const StakingFactory = await ethers.getContractFactory("StakingManager");
  const stakingManager = (await upgrades.deployProxy(
    StakingFactory,
    [admin.address, await nftReward.getAddress(), await treasury.getAddress()],
    { kind: "uups" }
  )) as unknown as StakingManager;
  await stakingManager.waitForDeployment();

  // 7. GovernanceCore (UUPS) — stakingManager set, registry set later
  const GovFactory = await ethers.getContractFactory("GovernanceCore");
  const governanceCore = (await upgrades.deployProxy(
    GovFactory,
    [admin.address, await timelock.getAddress(), await nftReward.getAddress(), await stakingManager.getAddress()],
    { kind: "uups" }
  )) as unknown as GovernanceCore;
  await governanceCore.waitForDeployment();

  // 8. PolkaInkRegistry (UUPS)
  const RegistryFactory = await ethers.getContractFactory("PolkaInkRegistry");
  const registry = (await upgrades.deployProxy(
    RegistryFactory,
    [
      admin.address,
      await versionStore.getAddress(),
      await governanceCore.getAddress(),
      await nftReward.getAddress(),
      await stakingManager.getAddress(),
    ],
    { kind: "uups" }
  )) as unknown as PolkaInkRegistry;
  await registry.waitForDeployment();

  // 9. ReportManager (UUPS)
  const ReportFactory = await ethers.getContractFactory("ReportManager");
  const reportManager = (await upgrades.deployProxy(
    ReportFactory,
    [
      admin.address,
      await stakingManager.getAddress(),
      await governanceCore.getAddress(),
      await registry.getAddress(),
    ],
    { kind: "uups" }
  )) as unknown as ReportManager;
  await reportManager.waitForDeployment();

  // ─── Setup Cross-References ─────────────────────────────────────────

  await governanceCore.setRegistry(await registry.getAddress());

  // ─── Setup Roles ────────────────────────────────────────────────────

  const WRITER_ROLE        = ethers.keccak256(ethers.toUtf8Bytes("WRITER_ROLE"));
  const GOVERNANCE_ROLE    = ethers.keccak256(ethers.toUtf8Bytes("GOVERNANCE_ROLE"));
  const REGISTRY_ROLE      = ethers.keccak256(ethers.toUtf8Bytes("REGISTRY_ROLE"));
  const REPORT_ROLE        = ethers.keccak256(ethers.toUtf8Bytes("REPORT_ROLE"));
  const MEMBER_MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MEMBER_MINTER_ROLE"));
  const CREATOR_MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CREATOR_MINTER_ROLE"));
  const AUTHOR_MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AUTHOR_MINTER_ROLE"));
  const SPEND_ROLE         = ethers.keccak256(ethers.toUtf8Bytes("SPEND_ROLE"));
  const UPGRADER_ROLE      = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));
  const PROPOSER_ROLE      = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
  const CANCELLER_ROLE     = ethers.keccak256(ethers.toUtf8Bytes("CANCELLER_ROLE"));

  // VersionStore: Registry can write
  await versionStore.grantRole(WRITER_ROLE, await registry.getAddress());

  // NFTReward minting roles
  await nftReward.grantRole(MEMBER_MINTER_ROLE, await stakingManager.getAddress());
  await nftReward.grantRole(CREATOR_MINTER_ROLE, await registry.getAddress()); // Registry calls mintCreatorNFT in mergeProposal
  await nftReward.grantRole(AUTHOR_MINTER_ROLE, await registry.getAddress());

  // GovernanceCore: Registry can createProposalFor
  await governanceCore.grantRole(REGISTRY_ROLE, await registry.getAddress());

  // Registry: GovernanceCore can mergeProposal
  await registry.grantRole(GOVERNANCE_ROLE, await governanceCore.getAddress());

  // Registry: ReportManager can setDocumentStatus
  await registry.grantRole(REPORT_ROLE, await reportManager.getAddress());

  // Treasury: timelock can spend
  await treasury.grantRole(SPEND_ROLE, await timelock.getAddress());

  // Timelock: governance as proposer/canceller
  await timelock.grantRole(PROPOSER_ROLE, await governanceCore.getAddress());
  await timelock.grantRole(CANCELLER_ROLE, await governanceCore.getAddress());

  // UPGRADER_ROLE for timelock on all upgradeable contracts
  const upgradeableContracts = [versionStore, registry, nftReward, treasury, governanceCore, stakingManager, reportManager];
  for (const c of upgradeableContracts) {
    await (c as any).grantRole(UPGRADER_ROLE, await timelock.getAddress());
  }

  // Transfer ProxyAdmin ownership to timelock
  await proxyAdmin.transferOwnership(await timelock.getAddress());

  // Mint OG Gold NFT for ogGoldHolder
  await nftReward.mintOGNFT(ogGoldHolder.address, 5); // OGGold = 5

  return {
    contracts: { registry, versionStore, governanceCore, timelock, nftReward, treasury, proxyAdmin, stakingManager, reportManager },
    actors: { admin, author1, author2, voter1, voter2, voter3, ogGoldHolder },
  };
}
