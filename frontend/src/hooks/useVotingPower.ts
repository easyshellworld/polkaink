import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { PAS_NETWORK } from '../lib/contracts/addresses';

export function useVotingPower(address: string | null) {
  return useQuery({
    queryKey: ['votingPower', address],
    queryFn: async () => {
      if (!address) return { balance: '0', weight: 1 };
      const provider = new ethers.JsonRpcProvider(PAS_NETWORK.rpcUrl, {
        chainId: PAS_NETWORK.chainId,
        name: PAS_NETWORK.name,
      });
      const balance = await provider.getBalance(address);
      return {
        balance: ethers.formatEther(balance),
        weight: 1,
      };
    },
    enabled: !!address,
    staleTime: 60_000,
  });
}
