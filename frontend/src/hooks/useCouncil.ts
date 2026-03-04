import { useQuery } from '@tanstack/react-query';
import { readContract } from '../lib/contracts';

export function useOGGoldHolders() {
  return useQuery({
    queryKey: ['ogGoldHolders'],
    queryFn: async () => {
      // In v2, OG Gold holders are tracked via NFTReward
      // This is a placeholder - in production, you'd index events
      return [] as string[];
    },
    staleTime: 300_000,
  });
}

export function useIsOGGold(address: string | null) {
  return useQuery({
    queryKey: ['isOGGold', address],
    queryFn: async () => {
      if (!address) return false;
      return await readContract('NFTReward', 'hasActiveOGGold', [address as `0x${string}`]) as boolean;
    },
    enabled: !!address,
    staleTime: 60_000,
  });
}
