import { useQuery } from '@tanstack/react-query';
import { readContract } from '../lib/contracts';

export interface ProposalData {
  id: bigint;
  proposalType: number;
  proposer: string;
  docId: bigint;
  targetVersionId: bigint;
  parentVersionId: bigint;
  score: bigint;
  totalVoteWeight: bigint;
  voterCount: bigint;
  snapshotTotalWeight: bigint;
  startTime: bigint;
  endTime: bigint;
  councilWindowEnd: bigint;
  status: number;
  callData: string;
  description: string;
  proposalStake: bigint;
  timelockTarget: string;
}

export function useProposals(page: number, perPage = 10) {
  return useQuery({
    queryKey: ['proposals', page, perPage],
    queryFn: async () => {
      const totalP = await readContract('GovernanceCore', 'totalProposals');
      const total = Number(totalP as bigint);
      if (total === 0) return { proposals: [] as ProposalData[], total: 0 };
      const start = Math.max(1, total - page * perPage - perPage + 1);
      const end = Math.max(1, total - page * perPage);
      const ids = [];
      for (let i = end; i >= start; i--) ids.push(i);
      const proposals = await Promise.all(
        ids.map((id) =>
          readContract('GovernanceCore', 'getProposal', [BigInt(id)]) as Promise<ProposalData>
        )
      );
      return { proposals, total };
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
      const start = Math.max(1, total - limit + 1);
      const ids = [];
      for (let i = total; i >= start; i--) ids.push(i);
      const proposals = await Promise.all(
        ids.map((id) =>
          readContract('GovernanceCore', 'getProposal', [BigInt(id)]) as Promise<ProposalData>
        )
      );
      return proposals;
    },
    staleTime: 15_000,
  });
}
