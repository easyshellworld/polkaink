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
    ProxyAdmin: '0x38De01370A92cB59b7d7EA2455c97b60C2B33511',
    TimelockController: '0x427d81F07e61509276F6D1f0bcEb1E76804E5003',
    NFTReward: '0x77d1c237DECA47875F6f4ffd254Eb59Ae80a050E',
    Treasury: '0xcb9908A9Ea3b261F8f4DeB8f78A85b05109aE747',
    VersionStore: '0xe38C44d4a42B3735B8669a73832C29F86B7295D2',
    StakingManager: '0x8C3d35d1dDA19a232fE926DE5C3C68613E8DA43a',
    GovernanceCore: '0x37C7e24b4B287AAbD79b216D9AFC125Dc56Ae007',
    PolkaInkRegistry: '0x4Fc3c079736FfE94aef94ab6560578Aec850175b',
    ArchiveCouncil: '0x3e60dC2FBfE1EB3A8754CfD2A97C9fF9543F10a8',
  },
};

export function getContractAddress(name: string, chainId?: number): string {
  const cid = chainId ?? PAS_NETWORK.chainId;
  const addr = ADDRESSES[cid]?.[name];
  if (!addr) throw new Error(`No address for ${name} on chain ${cid}`);
  return addr;
}
