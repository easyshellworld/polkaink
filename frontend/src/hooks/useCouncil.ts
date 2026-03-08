import { useQuery } from '@tanstack/react-query';
import { readContract } from '../lib/contracts';

export function useIsCouncilMember(address: string | null) {
  return useQuery({
    queryKey: ['isCouncilMember', address],
    queryFn: async () => {
      if (!address) return false;
      return await readContract('ArchiveCouncil', 'isMember', [address as `0x${string}`]) as boolean;
    },
    enabled: !!address,
    staleTime: 60_000,
  });
}

export function useCouncilMembers() {
  return useQuery({
    queryKey: ['councilMembers'],
    queryFn: async () => {
      return await readContract('ArchiveCouncil', 'getMembers') as string[];
    },
    staleTime: 300_000,
  });
}

export function useCouncilAllowanceClaimed(address: string | null, epochId: bigint | null) {
  return useQuery({
    queryKey: ['councilAllowanceClaimed', address, epochId?.toString()],
    queryFn: async () => {
      if (!address || epochId == null) return false;
      return await readContract('ArchiveCouncil', 'isAllowanceClaimed', [
        address as `0x${string}`,
        epochId,
      ]) as boolean;
    },
    enabled: !!address && epochId != null,
    staleTime: 30_000,
  });
}

export function useCouncilAllowanceStatus(address: string | null) {
  return useQuery({
    queryKey: ['councilAllowanceStatus', address],
    queryFn: async () => {
      if (!address) {
        return { epochId: null, claimed: false };
      }

      const [epochStartTime, epochDuration] = await Promise.all([
        readContract('Treasury', 'epochStartTime').catch(() => 0n),
        readContract('ArchiveCouncil', 'EPOCH_DURATION').catch(() => 0n),
      ]);

      const start = Number(epochStartTime as bigint);
      const duration = Number(epochDuration as bigint);
      if (duration <= 0) {
        return { epochId: null, claimed: false };
      }

      const now = Math.floor(Date.now() / 1000);
      const epochId = now < start ? 0n : BigInt(Math.floor((now - start) / duration));
      const claimed = await readContract('ArchiveCouncil', 'isAllowanceClaimed', [
        address as `0x${string}`,
        epochId,
      ]).catch(() => false);

      return {
        epochId,
        claimed: Boolean(claimed),
      };
    },
    enabled: !!address,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
