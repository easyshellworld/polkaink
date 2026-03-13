import { useQuery } from '@tanstack/react-query';
import { readContract } from '../lib/contracts';
import { parseEther } from 'viem';

export function useDynamicReward() {
  return useQuery({
    queryKey: ['dynamicRewardStatus'],
    queryFn: async () => {
      try {
        const rewardPoolBalance = await readContract('Treasury', 'rewardPoolBalance') as bigint;
        const isPaused = rewardPoolBalance < parseEther('50');
        const availableRewardPool = await readContract('Treasury', 'availableRewardPool').catch(() => 0n) as bigint;
        
        return {
          isPaused,
          rewardPoolBalance,
          availableRewardPool,
          threshold: parseEther('50'),
          isBelowThreshold: rewardPoolBalance < parseEther('50'),
        };
      } catch (error) {
        console.error('Failed to fetch dynamic reward status:', error);
        return {
          isPaused: false,
          rewardPoolBalance: 0n,
          availableRewardPool: 0n,
          threshold: parseEther('50'),
          isBelowThreshold: false,
        };
      }
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}