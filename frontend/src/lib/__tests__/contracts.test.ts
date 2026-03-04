import { getContractAddress, PAS_NETWORK } from '../contracts/addresses';

describe('PAS_NETWORK', () => {
  it('has correct chain ID', () => {
    expect(PAS_NETWORK.chainId).toBe(420420417);
  });

  it('has correct hex chain ID', () => {
    expect(PAS_NETWORK.chainIdHex).toBe('0x190f1b41');
  });

  it('has valid RPC URL', () => {
    expect(PAS_NETWORK.rpcUrl).toMatch(/^https:\/\//);
  });

  it('has 18 decimals', () => {
    expect(PAS_NETWORK.decimals).toBe(18);
  });
});

describe('getContractAddress', () => {
  const contractNames = [
    'PolkaInkRegistry',
    'VersionStore',
    'GovernanceCore',
    'TimelockController',
    'NFTReward',
    'Treasury',
    'ProxyAdmin',
    'StakingManager',
    'ReportManager',
  ];

  contractNames.forEach((name) => {
    it(`returns valid address for ${name}`, () => {
      const addr = getContractAddress(name);
      expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });
  });

  it('throws for unknown contract', () => {
    expect(() => getContractAddress('NonExistent')).toThrow();
  });

  it('throws for unknown chain', () => {
    expect(() => getContractAddress('PolkaInkRegistry', 999)).toThrow();
  });
});
