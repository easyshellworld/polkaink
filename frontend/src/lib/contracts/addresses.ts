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
    PolkaInkRegistry: '0x959b25F190189e588DaC814a95fe13a97d5198A1',
    VersionStore: '0xBB4cccdDb9e3ba74Ae28A412d34801353D1e0Ad6',
    GovernanceCore: '0xae456115ce2897338FE22Cd342312D92D47821Fb',
    ArchiveCouncil: '0x12771dcae01DEba4757719f7D2bD06D235a9FaD8',
    TimelockController: '0x684018c8709105437c277Eec60953cF335EaB5D9',
    NFTReward: '0x58DC769015e5a6bAdC5C56519B5f74F851575bAe',
    Treasury: '0x10F968271C18FF349a3a67FEE9141F7F4f42AD14',
    ProxyAdmin: '0x646664752E351ecb1f4c3B627Ba7cd76F7fF294c',
  },
};

export function getContractAddress(name: string, chainId?: number): string {
  const cid = chainId ?? PAS_NETWORK.chainId;
  const addr = ADDRESSES[cid]?.[name];
  if (!addr) throw new Error(`No address for ${name} on chain ${cid}`);
  return addr;
}
