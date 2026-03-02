import { useQuery } from '@tanstack/react-query';
import { readContract } from '../lib/contracts';

export interface ProposalData {
  id: bigint;
  proposalType: number;
  proposer: string;
  docId: bigint;
  targetVersionId: bigint;
  stakeAmount: bigint;
  yesVotes: bigint;
  noVotes: bigint;
  abstainVotes: bigint;
  totalVotingPower: bigint;
  snapshotBlock: bigint;
  startTime: bigint;
  endTime: bigint;
  status: number;
  callData: string;
  description: string;
  timelockId: string;
}

export function useProposals(page: number, perPage = 10) {
  return useQuery({
    queryKey: ['proposals', page, perPage],
    queryFn: async () => {
      const totalP = await readContract('GovernanceCore', 'totalProposals');
      const total = Number(totalP as bigint);
      if (total === 0) return { proposals: [] as ProposalData[], total: 0 };
      const offset = page * perPage;
      const result = await readContract('GovernanceCore', 'listProposals', [
        0, BigInt(offset), BigInt(perPage),
      ]);
      const [list] = result as [ProposalData[], bigint];
      return {
        proposals: [...list].reverse(),
        total,
      };
    },
    staleTime: 15_000,
  });
}

export function useProposal(id: number | undefined) {
  return useQuery({
    queryKey: ['proposal', id],
    queryFn: async () => {
      const p = await readContract('GovernanceCore', 'getProposal', [BigInt(id!)]);
      return p as ProposalData;
    },
    enabled: id !== undefined,
    staleTime: 15_000,
  });
}

export function useHasVoted(proposalId: number | undefined, address: string | null) {
  return useQuery({
    queryKey: ['hasVoted', proposalId, address],
    queryFn: async () => {
      const record = await readContract('GovernanceCore', 'getVoteRecord', [
        BigInt(proposalId!),
        address as `0x${string}`,
      ]);
      return (record as { hasVoted: boolean }).hasVoted;
    },
    enabled: proposalId !== undefined && !!address,
  });
}

export function useRecentProposals(count = 5) {
  return useQuery({
    queryKey: ['recentProposals', count],
    queryFn: async () => {
      const totalP = await readContract('GovernanceCore', 'totalProposals');
      const total = Number(totalP as bigint);
      if (total === 0) return [];
      const limit = Math.min(total, count);
      const offset = Math.max(0, total - limit);
      const result = await readContract('GovernanceCore', 'listProposals', [
        0, BigInt(offset), BigInt(limit),
      ]);
      const [list] = result as [ProposalData[], bigint];
      return [...list].reverse();
    },
    staleTime: 15_000,
  });
}
