import { ethers } from 'ethers';
import RegistryABI from './abis/PolkaInkRegistry.json';
import GovernanceABI from './abis/GovernanceCore.json';
import CouncilABI from './abis/ArchiveCouncil.json';
import NftABI from './abis/NFTReward.json';
import TreasuryABI from './abis/Treasury.json';
import VersionStoreABI from './abis/VersionStore.json';
import { PAS_NETWORK, getContractAddress } from './addresses';

export { PAS_NETWORK, getContractAddress };

const ABIS: Record<string, ethers.InterfaceAbi> = {
  PolkaInkRegistry: RegistryABI,
  GovernanceCore: GovernanceABI,
  ArchiveCouncil: CouncilABI,
  NFTReward: NftABI,
  Treasury: TreasuryABI,
  VersionStore: VersionStoreABI,
};

export function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(PAS_NETWORK.rpcUrl, {
    chainId: PAS_NETWORK.chainId,
    name: PAS_NETWORK.name,
  });
}

export function getReadContract(name = 'PolkaInkRegistry'): ethers.Contract {
  const abi = ABIS[name];
  if (!abi) throw new Error(`Unknown contract: ${name}`);
  return new ethers.Contract(getContractAddress(name), abi, getProvider());
}

export function getWriteContract(signer: ethers.Signer, name = 'PolkaInkRegistry'): ethers.Contract {
  const abi = ABIS[name];
  if (!abi) throw new Error(`Unknown contract: ${name}`);
  return new ethers.Contract(getContractAddress(name), abi, signer);
}

export const TX_OVERRIDES = {
  gasLimit: 500_000n,
};

export async function switchToPAS(): Promise<void> {
  if (!window.ethereum) throw new Error('MetaMask not found');

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: PAS_NETWORK.chainIdHex }],
    });
  } catch (switchErr: unknown) {
    const code = (switchErr as { code: number }).code;

    if (code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: PAS_NETWORK.chainIdHex,
              chainName: PAS_NETWORK.name,
              nativeCurrency: {
                name: 'PAS',
                symbol: 'PAS',
                decimals: 18,
              },
              rpcUrls: [PAS_NETWORK.rpcUrl],
              blockExplorerUrls: [PAS_NETWORK.explorer],
            },
          ],
        });
      } catch {
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

  const currentChainId = (await window.ethereum.request({
    method: 'eth_chainId',
  })) as string;

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
