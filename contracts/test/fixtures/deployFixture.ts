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
  ArchiveCouncil,
} from "../../typechain-types";

export interface DeployedContracts {
  registry:       PolkaInkRegistry;
  versionStore:   VersionStore;
  governanceCore: GovernanceCore;
  timelock:       TimelockController;
  nftReward:      NFTReward;
  treasury:       Treasury;
  proxyAdmin:     ProxyAdmin;
  stakingManager: StakingManager;
  archiveCouncil: ArchiveCouncil;
}

export interface Actors {
  admin:         HardhatEthersSigner;
  author1:       HardhatEthersSigner;
  author2:       HardhatEthersSigner;
  voter1:        HardhatEthersSigner;
  voter2:        HardhatEthersSigner;
  voter3:        HardhatEthersSigner;
  councilMember1: HardhatEthersSigner;
  councilMember2: HardhatEthersSigner;
}

const TIMELOCK_DELAY = 60; // 60s for tests
const STAKE_AMOUNT   = ethers.parseEther("88");
const VETO_THRESHOLD = 5;

export { STAKE_AMOUNT };

/** Stake 88 PAS for a user to become an active member */
export async function stakeFor(
  stakingManager: StakingManager,
  user: HardhatEthersSigner,
  lockMonths: number = 3
) {
  await stakingManager.connect(user).stake(lockMonths, { value: STAKE_AMOUNT });
}

export async function deployFixture(
  initialRewardPool: bigint = ethers.parseEther("500")
): Promise<{ contracts: DeployedContracts; actors: Actors }> {
  const signers = await ethers.getSigners();
  const admin          = signers[0];
  const author1        = signers[1];
  const author2        = signers[2];
  const voter1         = signers[3];
  const voter2         = signers[4];
  const voter3         = signers[5];
  const councilMember1 = signers[6];
  const councilMember2 = signers[7];

  // Genesis council uses 7 addresses; fill remaining with placeholder addresses
  const genesisMembers = [
    councilMember1.address,
    councilMember2.address,
    signers[8].address,
    signers[9].address,
    signers[10].address,
    signers[11].address,
    signers[12].address,
  ];

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

  // 3. NFTReward (v3.3) — Guardian NFTs minted in constructor
  const NFTFactory = await ethers.getContractFactory("NFTReward");
  const nftReward = (await upgrades.deployProxy(
    NFTFactory,
    [admin.address, genesisMembers],
    { kind: "uups" }
  )) as unknown as NFTReward;
  await nftReward.waitForDeployment();

  // 4. Treasury (v3.3)
  const TreasuryFactory = await ethers.getContractFactory("Treasury");
  const treasury = (await upgrades.deployProxy(
    TreasuryFactory,
    [admin.address],
    { kind: "uups" }
  )) as unknown as Treasury;
  await treasury.waitForDeployment();

  // 5. VersionStore
  const VersionStoreFactory = await ethers.getContractFactory("VersionStore");
  const versionStore = (await upgrades.deployProxy(
    VersionStoreFactory,
    [admin.address],
    { kind: "uups" }
  )) as unknown as VersionStore;
  await versionStore.waitForDeployment();

  // 6. StakingManager
  const StakingFactory = await ethers.getContractFactory("StakingManager");
  const stakingManager = (await upgrades.deployProxy(
    StakingFactory,
    [admin.address, await nftReward.getAddress(), await treasury.getAddress()],
    { kind: "uups" }
  )) as unknown as StakingManager;
  await stakingManager.waitForDeployment();

  // 7. GovernanceCore (v3.3)
  const GovFactory = await ethers.getContractFactory("GovernanceCore");
  const governanceCore = (await upgrades.deployProxy(
    GovFactory,
    [
      admin.address,
      await timelock.getAddress(),
      await nftReward.getAddress(),
      await stakingManager.getAddress(),
      await treasury.getAddress(),
    ],
    { kind: "uups" }
  )) as unknown as GovernanceCore;
  await governanceCore.waitForDeployment();

  // 8. PolkaInkRegistry (v3.3)
  const RegistryFactory = await ethers.getContractFactory("PolkaInkRegistry");
  const registry = (await upgrades.deployProxy(
    RegistryFactory,
    [
      admin.address,
      await versionStore.getAddress(),
      await governanceCore.getAddress(),
      await stakingManager.getAddress(),
    ],
    { kind: "uups" }
  )) as unknown as PolkaInkRegistry;
  await registry.waitForDeployment();

  // 9. ArchiveCouncil (v3.3)
  const CouncilFactory = await ethers.getContractFactory("ArchiveCouncil");
  const archiveCouncil = (await upgrades.deployProxy(
    CouncilFactory,
    [admin.address, genesisMembers, VETO_THRESHOLD],
    { kind: "uups" }
  )) as unknown as ArchiveCouncil;
  await archiveCouncil.waitForDeployment();

  // ─── Wire cross-references ───────────────────────────────────────────────

  await (governanceCore as any).setRegistry(await registry.getAddress());
  await (governanceCore as any).setArchiveCouncil(await archiveCouncil.getAddress());
  await (archiveCouncil as any).setContracts(
    await governanceCore.getAddress(),
    await registry.getAddress(),
    await treasury.getAddress()
  );

  // ─── Roles ────────────────────────────────────────────────────────────────

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

  await (nftReward as any).grantRole(MEMBER_MINTER_ROLE, await stakingManager.getAddress());
  await (nftReward as any).grantRole(CREATOR_MINTER_ROLE, await governanceCore.getAddress());

  await (governanceCore as any).grantRole(REGISTRY_ROLE, await registry.getAddress());
  await (governanceCore as any).grantRole(COUNCIL_ROLE, await archiveCouncil.getAddress());

  await (registry as any).grantRole(GOVERNANCE_ROLE, await governanceCore.getAddress());
  await (registry as any).grantRole(COUNCIL_ROLE, await archiveCouncil.getAddress());
  await (registry as any).grantRole(SEED_CREATOR_ROLE, admin.address);

  await (versionStore as any).grantRole(WRITER_ROLE, await registry.getAddress());

  await (treasury as any).grantRole(GOVERNANCE_ROLE, await governanceCore.getAddress());
  await (treasury as any).grantRole(COUNCIL_ROLE, await archiveCouncil.getAddress());
  await (treasury as any).grantRole(SPEND_ROLE, await timelock.getAddress());

  await (timelock as any).grantRole(PROPOSER_ROLE, await governanceCore.getAddress());
  await (timelock as any).grantRole(CANCELLER_ROLE, await governanceCore.getAddress());

  const upgradeables = [versionStore, registry, nftReward, treasury, governanceCore, stakingManager, archiveCouncil];
  for (const c of upgradeables) {
    await (c as any).grantRole(UPGRADER_ROLE, await timelock.getAddress());
  }

  await proxyAdmin.transferOwnership(await timelock.getAddress());

  // Fund rewardPool for tests (configurable for low-balance scenarios)
  if (initialRewardPool > 0n) {
    await (treasury as any).depositRewardPool({ value: initialRewardPool });
  }

  return {
    contracts: {
      registry, versionStore, governanceCore, timelock,
      nftReward, treasury, proxyAdmin, stakingManager, archiveCouncil,
    },
    actors: { admin, author1, author2, voter1, voter2, voter3, councilMember1, councilMember2 },
  };
}
