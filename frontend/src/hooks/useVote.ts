import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWalletStore } from '../store/walletStore';
import { useNotificationStore } from '../store/notificationStore';
import { getWriteContract, TX_OVERRIDES } from '../lib/contracts';

export function useVote(proposalId: number) {
  const [voting, setVoting] = useState(false);
  const signer = useWalletStore((s) => s.signer);
  const address = useWalletStore((s) => s.address);
  const queryClient = useQueryClient();
  const { addNotification, updateNotification } = useNotificationStore();

  const castVote = useCallback(
    async (support: boolean) => {
      if (!signer) {
        addNotification({ id: 'vote-err', type: 'error', message: 'Connect wallet first!' });
        return;
      }
      setVoting(true);
      const nid = `vote-${Date.now()}`;
      try {
        const gov = getWriteContract(signer, 'GovernanceCore');
        addNotification({ id: nid, type: 'pending', message: 'Submitting vote...' });
        const tx = await gov.vote(proposalId, support, false, 0, TX_OVERRIDES);
        updateNotification(nid, { message: 'Waiting for confirmation...' });
        await tx.wait();
        updateNotification(nid, { type: 'success', message: 'Vote cast successfully!' });
        queryClient.invalidateQueries({ queryKey: ['proposal', proposalId] });
        queryClient.invalidateQueries({ queryKey: ['hasVoted', proposalId, address] });
      } catch (err) {
        updateNotification(nid, { type: 'error', message: 'Vote failed: ' + (err as Error).message });
      } finally {
        setVoting(false);
      }
    },
    [signer, proposalId, address, queryClient, addNotification, updateNotification]
  );

  return { voting, castVote };
}
