import {
  createPublicClient,
  createWalletClient,
  http,
  custom,
  formatEther,
  parseEther,
  keccak256,
  toBytes,
  decodeEventLog,
  decodeFunctionData,
  type WalletClient,
  type PublicClient,
  type Abi,
  type Hash,
  type TransactionReceipt,
} from 'viem';
import { defineChain } from 'viem';
import RegistryABI from './abis/PolkaInkRegistry.json';
import GovernanceABI from './abis/GovernanceCore.json';
import CouncilABI from './abis/ArchiveCouncil.json';
import NftABI from './abis/NFTReward.json';
import TreasuryABI from './abis/Treasury.json';
import VersionStoreABI from './abis/VersionStore.json';
import { PAS_NETWORK, getContractAddress } from './addresses';

export { PAS_NETWORK, getContractAddress };
export { formatEther, parseEther, keccak256, toBytes, decodeEventLog, decodeFunctionData };
export type { WalletClient, PublicClient, Hash, TransactionReceipt };

const ABIS: Record<string, Abi> = {
  PolkaInkRegistry: RegistryABI as Abi,
  GovernanceCore: GovernanceABI as Abi,
  ArchiveCouncil: CouncilABI as Abi,
  NFTReward: NftABI as Abi,
  Treasury: TreasuryABI as Abi,
  VersionStore: VersionStoreABI as Abi,
};

export const pasChain = defineChain({
  id: PAS_NETWORK.chainId,
  name: PAS_NETWORK.name,
  nativeCurrency: {
    name: PAS_NETWORK.symbol,
    symbol: PAS_NETWORK.symbol,
    decimals: PAS_NETWORK.decimals,
  },
  rpcUrls: {
    default: { http: [PAS_NETWORK.rpcUrl] },
  },
  blockExplorers: {
    default: { name: 'RouteScan', url: PAS_NETWORK.explorer },
  },
});

let _publicClient: PublicClient | null = null;

export function getPublicClient(): PublicClient {
  if (!_publicClient) {
    _publicClient = createPublicClient({
      chain: pasChain,
      transport: http(PAS_NETWORK.rpcUrl),
    });
  }
  return _publicClient;
}

export function getAbi(name: string): Abi {
  const abi = ABIS[name];
  if (!abi) throw new Error(`Unknown contract: ${name}`);
  return abi;
}

export async function readContract(
  contractName: string,
  functionName: string,
  args: unknown[] = [],
): Promise<unknown> {
  const pc = getPublicClient();
  return pc.readContract({
    address: getContractAddress(contractName) as `0x${string}`,
    abi: ABIS[contractName],
    functionName,
    args,
  });
}

export async function writeContract(
  walletClient: WalletClient,
  contractName: string,
  functionName: string,
  args: unknown[] = [],
  options: { value?: bigint; gas?: bigint } = {},
): Promise<Hash> {
  const hash = await walletClient.writeContract({
    address: getContractAddress(contractName) as `0x${string}`,
    abi: ABIS[contractName],
    functionName,
    args,
    chain: pasChain,
    account: walletClient.account!,
    ...options,
  });
  return hash;
}

export async function waitForTx(hash: Hash): Promise<TransactionReceipt> {
  const pc = getPublicClient();
  return pc.waitForTransactionReceipt({ hash });
}

export function createBrowserWalletClient(): WalletClient {
  if (!window.ethereum) throw new Error('MetaMask not found');
  return createWalletClient({
    chain: pasChain,
    transport: custom(window.ethereum),
  });
}

export const TX_GAS = 500_000n;

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
