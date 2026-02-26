import { useQuery } from '@tanstack/react-query';
import { getReadContract } from '../lib/contracts';

export interface ProposalData {
  id: bigint;
  proposalType: number;
  proposer: string;
  docId: bigint;
  targetVersionId: bigint;
  stakeAmount: bigint;
  yesVotes: bigint;
  noVotes: bigint;
  startTime: bigint;
  endTime: bigint;
  status: number;
  description: string;
  contentHash: string;
}

export function useProposals(page: number, perPage = 10) {
  return useQuery({
    queryKey: ['proposals', page, perPage],
    queryFn: async () => {
      const contract = getReadContract();
      const totalP = await contract.totalProposals();
      const total = Number(totalP);
      if (total === 0) return { proposals: [] as ProposalData[], total: 0 };
      const offset = page * perPage;
      const [list] = await contract.listProposals(offset, perPage);
      return {
        proposals: [...list].reverse() as ProposalData[],
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
      const contract = getReadContract();
      const p = await contract.getProposal(id);
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
      const contract = getReadContract();
      return (await contract.hasVoted(proposalId, address)) as boolean;
    },
    enabled: proposalId !== undefined && !!address,
  });
}

export function useRecentProposals(count = 5) {
  return useQuery({
    queryKey: ['recentProposals', count],
    queryFn: async () => {
      const contract = getReadContract();
      const totalP = await contract.totalProposals();
      const total = Number(totalP);
      if (total === 0) return [];
      const limit = Math.min(total, count);
      const offset = Math.max(0, total - limit);
      const [list] = await contract.listProposals(offset, limit);
      return [...list].reverse() as ProposalData[];
    },
    staleTime: 15_000,
  });
}
