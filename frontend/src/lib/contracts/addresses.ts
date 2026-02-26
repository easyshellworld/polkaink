export const PAS_NETWORK = {
  chainId: 420420417,
  chainIdHex: '0x190f1b41',
  name: 'Polkadot Hub TestNet',
  rpcUrl: 'https://services.polkadothub-rpc.com/testnet',
  symbol: 'PAS',
  decimals: 18,
  explorer: 'https://polkadot.testnet.routescan.io',
};

const ADDRESSES: Record<number, Record<string, string>> = {
  [PAS_NETWORK.chainId]: {
    PolkaInk: '0x401e00E5b9bAFc674EE804BaBfC18D6eeEE8e49E',
  },
};

export function getContractAddress(name: string, chainId?: number): string {
  const cid = chainId ?? PAS_NETWORK.chainId;
  const addr = ADDRESSES[cid]?.[name];
  if (!addr) throw new Error(`No address for ${name} on chain ${cid}`);
  return addr;
}
