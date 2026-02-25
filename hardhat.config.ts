import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

// Detect if PRIVATE_KEY is a mnemonic (contains spaces) or a hex private key
function getAccounts(): { mnemonic: string } | string[] {
  if (!PRIVATE_KEY) return [];
  if (PRIVATE_KEY.includes(" ")) {
    // Mnemonic phrase (12 or 24 words)
    return { mnemonic: PRIVATE_KEY };
  }
  // Hex private key (with or without 0x prefix)
  return [PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`];
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    // Polkadot Hub TestNet (PAS)
    // Docs: https://docs.polkadot.com/develop/smart-contracts/connect-to-polkadot/
    // Faucet: https://faucet.polkadot.io/
    // Explorer: https://polkadot.testnet.routescan.io/
    polkadotTestnet: {
      url: "https://services.polkadothub-rpc.com/testnet",
      chainId: 420420417,
      accounts: getAccounts(),
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },
};

export default config;

