import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "@parity/hardhat-polkadot";
import "dotenv/config";
import path from "path";

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

// ── Polkadot local node configuration ──────────────────────────────
// Activate with: POLKADOT_NODE=true npx hardhat test
// Requires: ./scripts/setup-node.sh (downloads anvil-polkadot binary)
const usePolkadotNode = process.env.POLKADOT_NODE === "true";
const anvilBinaryPath = path.resolve(__dirname, "bin", "anvil-polkadot");

const hardhatNetwork: HardhatUserConfig["networks"] = usePolkadotNode
  ? {
      hardhat: {
        polkadot: {
          target: "evm",
        },
        nodeConfig: {
          useAnvil: true,
          nodeBinaryPath: anvilBinaryPath,
        },
      },
    }
  : {};

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    ...hardhatNetwork,
    // Polkadot Hub TestNet (PAS)
    // Docs: https://docs.polkadot.com/develop/smart-contracts/connect-to-polkadot/
    // Faucet: https://faucet.polkadot.io/
    // Explorer: https://polkadot.testnet.routescan.io/
    // PolkaVM mode (resolc compiler) — use for PolkaVM-targeted deployment
    polkadotTestnet: {
      polkadot: true,
      url: "https://services.polkadothub-rpc.com/testnet",
      chainId: 420420417,
      accounts: getAccounts(),
    },
    // EVM mode (standard solc) — use for REVM deployment on Polkadot Hub
    pasTestnet: {
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
