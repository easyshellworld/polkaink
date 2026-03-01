import { ethers, upgrades } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import {
  PolkaInkRegistry,
  VersionStore,
  GovernanceCore,
  ArchiveCouncil,
  TimelockController,
  NFTReward,
  Treasury,
  ProxyAdmin,
} from "../../typechain-types";

export interface DeployedContracts {
  registry: PolkaInkRegistry;
  versionStore: VersionStore;
  governanceCore: GovernanceCore;
  archiveCouncil: ArchiveCouncil;
  timelock: TimelockController;
  nftReward: NFTReward;
  treasury: Treasury;
  proxyAdmin: ProxyAdmin;
}

export interface Actors {
  admin: HardhatEthersSigner;
  author1: HardhatEthersSigner;
  author2: HardhatEthersSigner;
  voter1: HardhatEthersSigner;
  voter2: HardhatEthersSigner;
  voter3: HardhatEthersSigner;
  councilMembers: HardhatEthersSigner[];
}

const TIMELOCK_DELAY = 60; // 60 seconds for tests (not 48h)

export async function deployFixture(): Promise<{ contracts: DeployedContracts; actors: Actors }> {
  const signers = await ethers.getSigners();
  const admin = signers[0];
  const author1 = signers[1];
  const author2 = signers[2];
  const voter1 = signers[3];
  const voter2 = signers[4];
  const voter3 = signers[5];
  const councilMembers = signers.slice(6, 13); // 7 members

  // 1. Deploy ProxyAdmin
  const ProxyAdminFactory = await ethers.getContractFactory("ProxyAdmin");
  const proxyAdmin = (await ProxyAdminFactory.deploy(admin.address)) as ProxyAdmin;
  await proxyAdmin.waitForDeployment();

  // 2. Deploy TimelockController
  const TimelockFactory = await ethers.getContractFactory("TimelockController");
  const timelock = (await TimelockFactory.deploy(
    TIMELOCK_DELAY,
    [], // proposers set later
    [ethers.ZeroAddress], // anyone can execute
    admin.address
  )) as TimelockController;
  await timelock.waitForDeployment();

  // 3. Deploy NFTReward (UUPS)
  const NFTFactory = await ethers.getContractFactory("NFTReward");
  const nftReward = (await upgrades.deployProxy(NFTFactory, [admin.address], {
    kind: "uups",
  })) as unknown as NFTReward;
  await nftReward.waitForDeployment();

  // 4. Deploy Treasury (UUPS)
  const TreasuryFactory = await ethers.getContractFactory("Treasury");
  const treasury = (await upgrades.deployProxy(TreasuryFactory, [admin.address], {
    kind: "uups",
  })) as unknown as Treasury;
  await treasury.waitForDeployment();

  // 5. Deploy VersionStore (UUPS)
  const VersionStoreFactory = await ethers.getContractFactory("VersionStore");
  const versionStore = (await upgrades.deployProxy(VersionStoreFactory, [admin.address], {
    kind: "uups",
  })) as unknown as VersionStore;
  await versionStore.waitForDeployment();

  // 6. Deploy GovernanceCore (UUPS) — needs timelock, nftReward, registry (address TBD)
  const GovFactory = await ethers.getContractFactory("GovernanceCore");
  const governanceCore = (await upgrades.deployProxy(
    GovFactory,
    [admin.address, await timelock.getAddress(), await nftReward.getAddress(), ethers.ZeroAddress],
    { kind: "uups" }
  )) as unknown as GovernanceCore;
  await governanceCore.waitForDeployment();

  // 7. Deploy PolkaInkRegistry (UUPS)
  const RegistryFactory = await ethers.getContractFactory("PolkaInkRegistry");
  const registry = (await upgrades.deployProxy(
    RegistryFactory,
    [
      admin.address,
      await versionStore.getAddress(),
      await governanceCore.getAddress(),
      await nftReward.getAddress(),
      await treasury.getAddress(),
    ],
    { kind: "uups" }
  )) as unknown as PolkaInkRegistry;
  await registry.waitForDeployment();

  // 8. Deploy ArchiveCouncil (UUPS)
  const CouncilFactory = await ethers.getContractFactory("ArchiveCouncil");
  const archiveCouncil = (await upgrades.deployProxy(
    CouncilFactory,
    [
      admin.address,
      await governanceCore.getAddress(),
      await nftReward.getAddress(),
      councilMembers.map((m) => m.address),
    ],
    { kind: "uups" }
  )) as unknown as ArchiveCouncil;
  await archiveCouncil.waitForDeployment();

  // ─── Setup Roles ────────────────────────────────────────────────────────

  const WRITER_ROLE         = ethers.keccak256(ethers.toUtf8Bytes("WRITER_ROLE"));
  const GOVERNANCE_ROLE     = ethers.keccak256(ethers.toUtf8Bytes("GOVERNANCE_ROLE"));
  const AUTHOR_MINTER_ROLE  = ethers.keccak256(ethers.toUtf8Bytes("AUTHOR_MINTER_ROLE"));
  const GUARDIAN_MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GUARDIAN_MINTER_ROLE"));
  const DISTRIBUTOR_ROLE    = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE"));
  const SPEND_ROLE          = ethers.keccak256(ethers.toUtf8Bytes("SPEND_ROLE"));
  const COUNCIL_ROLE        = ethers.keccak256(ethers.toUtf8Bytes("COUNCIL_ROLE"));
  const UPGRADER_ROLE       = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));
  const PROPOSER_ROLE       = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
  const CANCELLER_ROLE      = ethers.keccak256(ethers.toUtf8Bytes("CANCELLER_ROLE"));

  await versionStore.grantRole(WRITER_ROLE, await registry.getAddress());
  await registry.grantRole(GOVERNANCE_ROLE, await governanceCore.getAddress());
  await registry.grantRole(GOVERNANCE_ROLE, await archiveCouncil.getAddress());
  await nftReward.grantRole(AUTHOR_MINTER_ROLE, await registry.getAddress());
  await nftReward.grantRole(GUARDIAN_MINTER_ROLE, await archiveCouncil.getAddress());
  await treasury.grantRole(DISTRIBUTOR_ROLE, await registry.getAddress());
  await treasury.grantRole(SPEND_ROLE, await timelock.getAddress());
  await governanceCore.grantRole(COUNCIL_ROLE, await archiveCouncil.getAddress());
  await governanceCore.grantRole(UPGRADER_ROLE, await timelock.getAddress());
  await versionStore.grantRole(UPGRADER_ROLE, await timelock.getAddress());
  await registry.grantRole(UPGRADER_ROLE, await timelock.getAddress());
  await nftReward.grantRole(UPGRADER_ROLE, await timelock.getAddress());
  await treasury.grantRole(UPGRADER_ROLE, await timelock.getAddress());
  await archiveCouncil.grantRole(UPGRADER_ROLE, await timelock.getAddress());

  // Timelock: set governance as proposer/canceller
  await timelock.grantRole(PROPOSER_ROLE, await governanceCore.getAddress());
  await timelock.grantRole(CANCELLER_ROLE, await governanceCore.getAddress());

  // Mint Guardian NFTs for initial council members (now that GUARDIAN_MINTER_ROLE is granted)
  await archiveCouncil.activateGuardianNFTs();

  // Transfer ProxyAdmin ownership to timelock
  await proxyAdmin.transferOwnership(await timelock.getAddress());

  return {
    contracts: { registry, versionStore, governanceCore, archiveCouncil, timelock, nftReward, treasury, proxyAdmin },
    actors: { admin, author1, author2, voter1, voter2, voter3, councilMembers },
  };
}
