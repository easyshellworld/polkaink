import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWalletStore } from '../store/walletStore';
import { useNotificationStore } from '../store/notificationStore';
import { writeContract, waitForTx, TX_GAS } from '../lib/contracts';
import i18n from '../lib/i18n';

export function useVote(proposalId: number) {
  const [voting, setVoting] = useState(false);
  const walletClient = useWalletStore((s) => s.walletClient);
  const address = useWalletStore((s) => s.address);
  const queryClient = useQueryClient();
  const { addNotification, updateNotification } = useNotificationStore();

  const castVote = useCallback(
    async (choice: number) => {
      if (!walletClient) {
        addNotification({ id: 'vote-err', type: 'error', message: i18n.t('notify.connect_wallet', 'Connect wallet first!') });
        return;
      }
      setVoting(true);
      const nid = `vote-${Date.now()}`;
      try {
        addNotification({ id: nid, type: 'pending', message: i18n.t('notify.submitting_vote', 'Submitting vote...') });
        const hash = await writeContract(walletClient, 'GovernanceCore', 'vote', [
          BigInt(proposalId), choice,
        ], { gas: TX_GAS });
        updateNotification(nid, { message: i18n.t('notify.waiting_confirm', 'Waiting for confirmation...') });
        await waitForTx(hash);
        updateNotification(nid, { type: 'success', message: i18n.t('notify.vote_success', 'Vote cast successfully!') });
        queryClient.invalidateQueries({ queryKey: ['proposal', proposalId] });
        queryClient.invalidateQueries({ queryKey: ['hasVoted', proposalId, address] });
      } catch (err) {
        updateNotification(nid, { type: 'error', message: i18n.t('notify.vote_failed', 'Vote failed') + ': ' + (err as Error).message });
      } finally {
        setVoting(false);
      }
    },
    [walletClient, proposalId, address, queryClient, addNotification, updateNotification]
  );

  return { voting, castVote };
}
