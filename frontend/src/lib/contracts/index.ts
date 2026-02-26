import { ethers } from "ethers";
import PolkaInkABI from "./PolkaInkABI.json";

// Deployed contract address on Polkadot Hub TestNet (PAS)
export const POLKAINK_ADDRESS = "0x401e00E5b9bAFc674EE804BaBfC18D6eeEE8e49E";

// PAS Network configuration
export const PAS_NETWORK = {
  chainId: 420420417,
  chainIdHex: "0x190f1b41",
  name: "Polkadot Hub TestNet",
  rpcUrl: "https://services.polkadothub-rpc.com/testnet",
  symbol: "PAS",
  explorer: "https://polkadot.testnet.routescan.io",
};

// Get read-only provider
export function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(PAS_NETWORK.rpcUrl, {
    chainId: PAS_NETWORK.chainId,
    name: PAS_NETWORK.name,
  });
}

// Get contract instance (read-only)
export function getReadContract(): ethers.Contract {
  return new ethers.Contract(POLKAINK_ADDRESS, PolkaInkABI, getProvider());
}

// Default gas overrides for PAS testnet
// PAS has high gas prices (1 TGas) and MetaMask gas estimation can fail,
// so we always provide explicit gasLimit.
export const TX_OVERRIDES = {
  gasLimit: 500_000n,
};

// Get contract instance (write, requires signer)
export function getWriteContract(
  signer: ethers.Signer
): ethers.Contract {
  return new ethers.Contract(POLKAINK_ADDRESS, PolkaInkABI, signer);
}

// Request MetaMask to switch/add PAS network
export async function switchToPAS(): Promise<void> {
  if (!window.ethereum) throw new Error("MetaMask not found");

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: PAS_NETWORK.chainIdHex }],
    });
  } catch (switchErr: unknown) {
    const code = (switchErr as { code: number }).code;

    if (code === 4902) {
      // Network not found — try to add it
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: PAS_NETWORK.chainIdHex,
              chainName: PAS_NETWORK.name,
              nativeCurrency: {
                name: "PAS",
                symbol: "PAS",
                decimals: 18,
              },
              rpcUrls: [PAS_NETWORK.rpcUrl],
              blockExplorerUrls: [PAS_NETWORK.explorer],
            },
          ],
        });
      } catch {
        // If add fails due to RPC conflict, give manual instructions
        throw new Error(
          "Cannot add PAS network — MetaMask may have a stale network using the same RPC.\n\n" +
          "Please manually fix:\n" +
          "1. MetaMask → Settings → Networks\n" +
          "2. Delete 'Polkadot Hub TestNet'\n" +
          "3. Click Connect Wallet again"
        );
      }
    } else {
      throw switchErr;
    }
  }

  // Verify we're on the correct chain after switching
  const currentChainId = await window.ethereum.request({
    method: "eth_chainId",
  }) as string;

  if (currentChainId.toLowerCase() !== PAS_NETWORK.chainIdHex.toLowerCase()) {
    throw new Error(
      `Wrong Chain ID: MetaMask is on ${currentChainId} but PAS requires ${PAS_NETWORK.chainIdHex}.\n\n` +
      "Please manually fix:\n" +
      "1. MetaMask → Settings → Networks\n" +
      "2. Delete 'Polkadot Hub TestNet' (the one with Chain ID 420501617)\n" +
      "3. Click Connect Wallet again to add the correct network"
    );
  }
}

export { PolkaInkABI };

