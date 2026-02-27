import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useWalletStore } from '../store/walletStore';
import { getWriteContract, TX_OVERRIDES } from '../lib/contracts';

export function useVote(proposalId: number) {
  const [voting, setVoting] = useState(false);
  const signer = useWalletStore((s) => s.signer);
  const address = useWalletStore((s) => s.address);
  const queryClient = useQueryClient();

  const castVote = useCallback(
    async (support: boolean) => {
      if (!signer) {
        toast.error('Connect wallet first!');
        return;
      }
      setVoting(true);
      try {
        const contract = getWriteContract(signer);
        toast.loading('Submitting vote...', { id: 'vote' });
        const tx = await contract.vote(proposalId, support, TX_OVERRIDES);
        toast.loading('Waiting for confirmation...', { id: 'vote' });
        await tx.wait();
        toast.success('Vote cast successfully!', { id: 'vote' });
        queryClient.invalidateQueries({ queryKey: ['proposal', proposalId] });
        queryClient.invalidateQueries({ queryKey: ['hasVoted', proposalId, address] });
      } catch (err) {
        toast.error('Vote failed: ' + (err as Error).message, { id: 'vote' });
      } finally {
        setVoting(false);
      }
    },
    [signer, proposalId, address, queryClient]
  );

  return { voting, castVote };
}
