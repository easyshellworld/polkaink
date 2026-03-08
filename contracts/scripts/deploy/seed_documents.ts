/**
 * Seed document creation script (step 12 of deployment).
 * Run after deploy_all.ts if creating seeds separately.
 *
 * Usage:
 *   npx hardhat run scripts/deploy/seed_documents.ts --network pasTestnet
 */
import { ethers } from "hardhat";
import fs from "fs";

const seeds = [
  { title: "Polkadot Ecosystem Milestones", tags: ["#history",    "#timeline"]  },
  { title: "Governance Proposal Records",   tags: ["#governance", "#referenda"] },
  { title: "Runtime Upgrade Log",           tags: ["#technical",  "#runtime"]   },
  { title: "Ecosystem Project Milestones",  tags: ["#ecosystem",  "#projects"]  },
];

async function main() {
  const [admin] = await ethers.getSigners();
  const addresses = JSON.parse(fs.readFileSync("deployed-addresses.json", "utf8"));

  const registry = await ethers.getContractAt("PolkaInkRegistry", addresses.PolkaInkRegistry);

  const SEED_CREATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SEED_CREATOR_ROLE"));

  console.log("Creating seed documents...");
  for (const seed of seeds) {
    const tx = await (registry as any).createSeedDocument(seed.title, seed.tags);
    await tx.wait();
    console.log(`  ✓ "${seed.title}"`);
  }

  // Renounce SEED_CREATOR_ROLE after all seeds created
  const tx = await (registry as any).renounceRole(SEED_CREATOR_ROLE, admin.address);
  await tx.wait();
  console.log("\n  ✓ SEED_CREATOR_ROLE renounced. Admin has zero privileges.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
