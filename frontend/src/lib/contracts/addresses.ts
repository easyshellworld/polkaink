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
    PolkaInkRegistry: '0x8b83a928C0B60CF3d197aff68Da48FC2Db8B2Ad1',
    VersionStore: '0x5ACD32f19D26fcEc72ac96C7515a0075BA0FA8fa',
    GovernanceCore: '0x68839E647AAe54D788BA9cD1aEC87190C7e3999e',
    TimelockController: '0xc946D5e4A4792FFB1cf435714580c935a01f6A11',
    NFTReward: '0xe9920328718373b710845B756b29086591DCBdcb',
    Treasury: '0x145A2B388d66d960F026DCEa09942bC8a9d9B190',
    ProxyAdmin: '0x4662Bb43CE01f4ba9608D2AEd29De5eFDF844cBE',
    StakingManager: '0xd8Ea01112F866D4b17f4E92e02A9edCb939B4B71',
    ReportManager: '0x4972c8104D838A9AEfe2AcBAC6bA114022f16c6B',
  },
};

export function getContractAddress(name: string, chainId?: number): string {
  const cid = chainId ?? PAS_NETWORK.chainId;
  const addr = ADDRESSES[cid]?.[name];
  if (!addr) throw new Error(`No address for ${name} on chain ${cid}`);
  return addr;
}
