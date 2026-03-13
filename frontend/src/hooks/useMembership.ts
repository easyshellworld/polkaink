import { useQuery } from '@tanstack/react-query';
import { readContract } from '../lib/contracts';

export function useMembership(address: string | null) {
  return useQuery({
    queryKey: ['membership', address],
    queryFn: async () => {
      if (!address) return null;
      const addr = address as `0x${string}`;
      const [isMember, creatorCount, isCouncilMember] = await Promise.all([
        readContract('StakingManager', 'isActiveMember', [addr]).catch(() => false),
        readContract('NFTReward', 'activeCreatorCount', [addr]).catch(() => 0n),
        readContract('ArchiveCouncil', 'isMember', [addr]).catch(() => false),
      ]);
      return {
        isMember: isMember as boolean,
        creatorCount: Number(creatorCount as bigint),
        isCouncilMember: isCouncilMember as boolean,
      };
    },
    enabled: !!address,
    staleTime: 30_000,
  });
}
