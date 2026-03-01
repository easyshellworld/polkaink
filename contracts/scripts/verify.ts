import { run } from "hardhat";

interface VerifyArgs {
  address: string;
  constructorArguments?: unknown[];
}

const CONTRACTS_TO_VERIFY: VerifyArgs[] = [
  // Populate with deployed addresses after deployment
  // { address: "0x...", constructorArguments: [] },
];

async function main() {
  for (const contract of CONTRACTS_TO_VERIFY) {
    try {
      console.log(`Verifying ${contract.address}...`);
      await run("verify:verify", {
        address: contract.address,
        constructorArguments: contract.constructorArguments ?? [],
      });
      console.log(`Verified: ${contract.address}`);
    } catch (error) {
      console.error(`Failed to verify ${contract.address}:`, error);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
