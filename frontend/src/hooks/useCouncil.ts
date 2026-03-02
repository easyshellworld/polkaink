import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { readContract, writeContract, waitForTx, TX_GAS } from '../lib/contracts';
import { useWalletStore } from '../store/walletStore';
import { useNotificationStore } from '../store/notificationStore';

export interface CouncilMember {
  memberAddress: string;
  guardianNFTId: bigint;
  termStart: bigint;
  termEnd: bigint;
  vetoCount: bigint;
  status: number;
}

export function useCouncilMembers() {
  return useQuery({
    queryKey: ['councilMembers'],
    queryFn: async () => {
      const members = await readContract('ArchiveCouncil', 'getCouncilMembers');
      return members as CouncilMember[];
    },
    staleTime: 60_000,
  });
}

export function useIsCouncilMember(address: string | null) {
  return useQuery({
    queryKey: ['isCouncilMember', address],
    queryFn: async () => {
      if (!address) return false;
      const result = await readContract('ArchiveCouncil', 'isActiveMember', [address]);
      return result as boolean;
    },
    enabled: !!address,
    staleTime: 60_000,
  });
}

export function useVetoStatus(proposalId: number | undefined) {
  return useQuery({
    queryKey: ['vetoStatus', proposalId],
    queryFn: async () => {
      const result = await readContract('ArchiveCouncil', 'getVetoStatus', [BigInt(proposalId!)]);
      const [vetoCount, vetoed] = result as [bigint, boolean];
      return { vetoCount: Number(vetoCount), vetoed };
    },
    enabled: proposalId !== undefined,
    staleTime: 30_000,
  });
}

export function useVetoThreshold() {
  return useQuery({
    queryKey: ['vetoThreshold'],
    queryFn: async () => {
      const result = await readContract('ArchiveCouncil', 'vetoThreshold');
      return Number(result as bigint);
    },
    staleTime: 300_000,
  });
}

export function useCastVeto() {
  const [submitting, setSubmitting] = useState(false);
  const walletClient = useWalletStore((s) => s.walletClient);
  const queryClient = useQueryClient();
  const { addNotification, updateNotification } = useNotificationStore();

  const castVeto = useCallback(
    async (proposalId: number, reason: string) => {
      if (!walletClient) return;
      setSubmitting(true);
      const nid = `veto-${Date.now()}`;
      try {
        addNotification({ id: nid, type: 'pending', message: 'Submitting veto...' });
        const hash = await writeContract(walletClient, 'ArchiveCouncil', 'veto', [
          BigInt(proposalId), reason,
        ], { gas: TX_GAS });
        updateNotification(nid, { message: 'Waiting for confirmation...' });
        await waitForTx(hash);
        updateNotification(nid, { type: 'success', message: 'Veto cast successfully!' });
        queryClient.invalidateQueries({ queryKey: ['vetoStatus', proposalId] });
        queryClient.invalidateQueries({ queryKey: ['proposal', proposalId] });
      } catch (err) {
        updateNotification(nid, { type: 'error', message: 'Veto failed: ' + (err as Error).message });
      } finally {
        setSubmitting(false);
      }
    },
    [walletClient, queryClient, addNotification, updateNotification]
  );

  return { submitting, castVeto };
}

export function useCouncilApprove() {
  const [submitting, setSubmitting] = useState(false);
  const walletClient = useWalletStore((s) => s.walletClient);
  const queryClient = useQueryClient();
  const { addNotification, updateNotification } = useNotificationStore();

  const approve = useCallback(
    async (proposalId: number) => {
      if (!walletClient) return;
      setSubmitting(true);
      const nid = `approve-${Date.now()}`;
      try {
        addNotification({ id: nid, type: 'pending', message: 'Approving proposal...' });
        const hash = await writeContract(walletClient, 'ArchiveCouncil', 'approve', [
          BigInt(proposalId),
        ], { gas: TX_GAS });
        updateNotification(nid, { message: 'Waiting for confirmation...' });
        await waitForTx(hash);
        updateNotification(nid, { type: 'success', message: 'Proposal approved!' });
        queryClient.invalidateQueries({ queryKey: ['proposal', proposalId] });
      } catch (err) {
        updateNotification(nid, { type: 'error', message: 'Approve failed: ' + (err as Error).message });
      } finally {
        setSubmitting(false);
      }
    },
    [walletClient, queryClient, addNotification, updateNotification]
  );

  return { submitting, approve };
}

export function useVoteInElection() {
  const [submitting, setSubmitting] = useState(false);
  const walletClient = useWalletStore((s) => s.walletClient);
  const queryClient = useQueryClient();
  const { addNotification, updateNotification } = useNotificationStore();

  const vote = useCallback(
    async (electionId: number, candidate: string) => {
      if (!walletClient) return;
      setSubmitting(true);
      const nid = `election-vote-${Date.now()}`;
      try {
        addNotification({ id: nid, type: 'pending', message: 'Voting in election...' });
        const hash = await writeContract(walletClient, 'ArchiveCouncil', 'voteInElection', [
          BigInt(electionId), candidate as `0x${string}`,
        ], { gas: TX_GAS });
        updateNotification(nid, { message: 'Waiting for confirmation...' });
        await waitForTx(hash);
        updateNotification(nid, { type: 'success', message: 'Election vote cast!' });
        queryClient.invalidateQueries({ queryKey: ['election'] });
        queryClient.invalidateQueries({ queryKey: ['electionVotes'] });
      } catch (err) {
        updateNotification(nid, { type: 'error', message: 'Vote failed: ' + (err as Error).message });
      } finally {
        setSubmitting(false);
      }
    },
    [walletClient, queryClient, addNotification, updateNotification]
  );

  return { submitting, vote };
}

export interface ElectionData {
  electionId: bigint;
  candidates: string[];
  startTime: bigint;
  endTime: bigint;
  executed: boolean;
}

export function useElection(electionId: number | undefined) {
  return useQuery({
    queryKey: ['election', electionId],
    queryFn: async () => {
      const result = await readContract('ArchiveCouncil', 'getElection', [BigInt(electionId!)]);
      return result as ElectionData;
    },
    enabled: electionId !== undefined,
    staleTime: 30_000,
  });
}

export function useElectionVotes(electionId: number | undefined, candidates: string[]) {
  return useQuery({
    queryKey: ['electionVotes', electionId, candidates],
    queryFn: async () => {
      const promises = candidates.map(async (c) => {
        const votes = await readContract('ArchiveCouncil', 'getElectionVotes', [
          BigInt(electionId!), c as `0x${string}`,
        ]);
        return { candidate: c, votes: Number(votes as bigint) };
      });
      return Promise.all(promises);
    },
    enabled: electionId !== undefined && candidates.length > 0,
    staleTime: 30_000,
  });
}

export function useExecuteElection() {
  const [submitting, setSubmitting] = useState(false);
  const walletClient = useWalletStore((s) => s.walletClient);
  const queryClient = useQueryClient();
  const { addNotification, updateNotification } = useNotificationStore();

  const execute = useCallback(
    async (electionId: number) => {
      if (!walletClient) return;
      setSubmitting(true);
      const nid = `exec-election-${Date.now()}`;
      try {
        addNotification({ id: nid, type: 'pending', message: 'Executing election...' });
        const hash = await writeContract(walletClient, 'ArchiveCouncil', 'executeElection', [
          BigInt(electionId),
        ], { gas: TX_GAS });
        updateNotification(nid, { message: 'Waiting for confirmation...' });
        await waitForTx(hash);
        updateNotification(nid, { type: 'success', message: 'Election executed!' });
        queryClient.invalidateQueries({ queryKey: ['election'] });
        queryClient.invalidateQueries({ queryKey: ['councilMembers'] });
      } catch (err) {
        updateNotification(nid, { type: 'error', message: 'Execute failed: ' + (err as Error).message });
      } finally {
        setSubmitting(false);
      }
    },
    [walletClient, queryClient, addNotification, updateNotification]
  );

  return { submitting, execute };
}

export function useCouncilConstants() {
  return useQuery({
    queryKey: ['councilConstants'],
    queryFn: async () => {
      const [councilSize, termLength, electionDuration] = await Promise.all([
        readContract('ArchiveCouncil', 'COUNCIL_SIZE'),
        readContract('ArchiveCouncil', 'TERM_LENGTH'),
        readContract('ArchiveCouncil', 'ELECTION_DURATION'),
      ]);
      return {
        councilSize: Number(councilSize as bigint),
        termLength: Number(termLength as bigint),
        electionDuration: Number(electionDuration as bigint),
      };
    },
    staleTime: 600_000,
  });
}

export function useResign() {
  const [submitting, setSubmitting] = useState(false);
  const walletClient = useWalletStore((s) => s.walletClient);
  const queryClient = useQueryClient();
  const { addNotification, updateNotification } = useNotificationStore();

  const resign = useCallback(
    async () => {
      if (!walletClient) return;
      setSubmitting(true);
      const nid = `resign-${Date.now()}`;
      try {
        addNotification({ id: nid, type: 'pending', message: 'Submitting resignation...' });
        const hash = await writeContract(walletClient, 'ArchiveCouncil', 'resign', [], { gas: TX_GAS });
        updateNotification(nid, { message: 'Waiting for confirmation...' });
        await waitForTx(hash);
        updateNotification(nid, { type: 'success', message: 'Resigned successfully!' });
        queryClient.invalidateQueries({ queryKey: ['councilMembers'] });
        queryClient.invalidateQueries({ queryKey: ['isCouncilMember'] });
      } catch (err) {
        updateNotification(nid, { type: 'error', message: 'Resign failed: ' + (err as Error).message });
      } finally {
        setSubmitting(false);
      }
    },
    [walletClient, queryClient, addNotification, updateNotification]
  );

  return { submitting, resign };
}
