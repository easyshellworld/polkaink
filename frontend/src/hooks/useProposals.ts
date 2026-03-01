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
      const gov = getReadContract('GovernanceCore');
      const totalP = await gov.totalProposals();
      const total = Number(totalP);
      if (total === 0) return { proposals: [] as ProposalData[], total: 0 };
      const offset = page * perPage;
      // statusFilter 0 = all (Pending enum value, but we list all)
      const [list] = await gov.listProposals(0, offset, perPage);
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
      const gov = getReadContract('GovernanceCore');
      const p = await gov.getProposal(id);
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
      const gov = getReadContract('GovernanceCore');
      const record = await gov.getVoteRecord(proposalId, address);
      return record.hasVoted as boolean;
    },
    enabled: proposalId !== undefined && !!address,
  });
}

export function useRecentProposals(count = 5) {
  return useQuery({
    queryKey: ['recentProposals', count],
    queryFn: async () => {
      const gov = getReadContract('GovernanceCore');
      const totalP = await gov.totalProposals();
      const total = Number(totalP);
      if (total === 0) return [];
      const limit = Math.min(total, count);
      const offset = Math.max(0, total - limit);
      const [list] = await gov.listProposals(0, offset, limit);
      return [...list].reverse() as ProposalData[];
    },
    staleTime: 15_000,
  });
}
