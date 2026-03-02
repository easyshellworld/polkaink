import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { readContract, getPublicClient } from '../lib/contracts';

export function useVotingPower(address: string | null, proposalId?: number) {
  return useQuery({
    queryKey: ['votingPower', address, proposalId],
    queryFn: async () => {
      if (!address) return { balance: '0', weight: 0n, nftMultiplier: 1 };
      const pc = getPublicClient();
      const [balance, weight] = await Promise.all([
        pc.getBalance({ address: address as `0x${string}` }),
        readContract('GovernanceCore', 'getVotingPower', [
          address as `0x${string}`,
          BigInt(proposalId ?? 0),
        ]).catch(() => 0n),
      ]);

      let nftMultiplier = 1;
      try {
        const [authorCount, hasGuardian] = await Promise.all([
          readContract('NFTReward', 'authorNFTCount', [address as `0x${string}`]),
          readContract('NFTReward', 'hasActiveGuardianNFT', [address as `0x${string}`]),
        ]);
        if (hasGuardian) nftMultiplier = 2;
        else if (Number(authorCount as bigint) > 0) nftMultiplier = 1.5;
      } catch {
        /* NFT contract may not be accessible */
      }

      return {
        balance: formatEther(balance),
        weight: weight as bigint,
        nftMultiplier,
      };
    },
    enabled: !!address,
    staleTime: 60_000,
  });
}
