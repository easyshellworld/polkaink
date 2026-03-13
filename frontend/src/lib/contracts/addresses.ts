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
    ProxyAdmin: '0x4EBb5472bd5fFC619cA880447920584977E5fD68',
    TimelockController: '0x33CC1AF7c7E88704c83bdED1270aa892813Fec61',
    NFTReward: '0x145EA0d74D31dDFC7ce1F95903d8eb9B0d8D72B3',
    Treasury: '0x4c0CdB7a94cD0aF91460186F72F86297a3Ac7285',
    VersionStore: '0xb77Eb7703537f8f119C6a9F58Fe2D33BfA383dCd',
    StakingManager: '0x286301d1585B40c5B88Ff0fbD86E7A70cE8a2443',
    GovernanceCore: '0x87Cb963B9A2e35DA5D8342Afa1Cd0D51b1F559aB',
    PolkaInkRegistry: '0xc3C208E3Eba8dC828e3426102AD678D0bFE15eFe',
    ArchiveCouncil: '0xFC107cf84250C022eF13c6F8751AC5321bECD0fc',
  },
};

export function getContractAddress(name: string, chainId?: number): string {
  const cid = chainId ?? PAS_NETWORK.chainId;
  const addr = ADDRESSES[cid]?.[name];
  if (!addr) throw new Error(`No address for ${name} on chain ${cid}`);
  return addr;
}
