import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { readContract, getPublicClient } from '../lib/contracts';

export function useVotingPower(address: string | null) {
  return useQuery({
    queryKey: ['votingPower', address],
    queryFn: async () => {
      if (!address) return { balance: '0', weight: 0n, weightFormatted: '0' };
      const pc = getPublicClient();
      const [balance, weight] = await Promise.all([
        pc.getBalance({ address: address as `0x${string}` }),
        readContract('GovernanceCore', 'getVotingWeight', [address as `0x${string}`]).catch(() => 0n),
      ]);

      return {
        balance: formatEther(balance),
        weight: weight as bigint,
        weightFormatted: (Number(weight as bigint) / 1e18).toFixed(2),
      };
    },
    enabled: !!address,
    staleTime: 60_000,
  });
}
