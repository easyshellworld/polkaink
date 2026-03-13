import { PAS_NETWORK } from './contracts/addresses';

export interface ChainConfig {
  id: number;
  name: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: { default: { http: string[] } };
  blockExplorers: { default: { name: string; url: string } };
}

export const polkadotHubTestnet: ChainConfig = {
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
};
