import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { readContract, writeContract, waitForTx, TX_GAS } from '../lib/contracts';
import { useWalletStore } from '../store/walletStore';
import { useNotificationStore } from '../store/notificationStore';

export function useReportStatus(docId: number | undefined) {
  return useQuery({
    queryKey: ['reportStatus', docId],
    queryFn: async () => {
      const status = await readContract('ReportManager', 'getReportStatus', [BigInt(docId!)]);
      return status as {
        docId: bigint;
        reportCount: bigint;
        threshold: bigint;
        frozen: boolean;
        freezeEnd: bigint;
        revoteEnd: bigint;
        yesVotes: bigint;
        noVotes: bigint;
        voterCount: bigint;
        reportRound: number;
        finalized: boolean;
        revoked: boolean;
      };
    },
    enabled: docId !== undefined,
    staleTime: 30_000,
  });
}

export function useReport() {
  const [submitting, setSubmitting] = useState(false);
  const walletClient = useWalletStore((s) => s.walletClient);
  const queryClient = useQueryClient();
  const { addNotification, updateNotification } = useNotificationStore();

  const report = useCallback(async (docId: number) => {
    if (!walletClient) return;
    setSubmitting(true);
    const nid = `report-${Date.now()}`;
    try {
      addNotification({ id: nid, type: 'pending', message: 'Reporting document...' });
      const hash = await writeContract(walletClient, 'ReportManager', 'report', [BigInt(docId)], { gas: TX_GAS });
      updateNotification(nid, { message: 'Waiting for confirmation...' });
      await waitForTx(hash);
      updateNotification(nid, { type: 'success', message: 'Report submitted!' });
      queryClient.invalidateQueries({ queryKey: ['reportStatus', docId] });
    } catch (err) {
      updateNotification(nid, { type: 'error', message: 'Report failed: ' + (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  }, [walletClient, queryClient, addNotification, updateNotification]);

  const revote = useCallback(async (docId: number, support: boolean) => {
    if (!walletClient) return;
    setSubmitting(true);
    const nid = `revote-${Date.now()}`;
    try {
      addNotification({ id: nid, type: 'pending', message: 'Casting re-vote...' });
      const hash = await writeContract(walletClient, 'ReportManager', 'revote', [BigInt(docId), support], { gas: TX_GAS });
      updateNotification(nid, { message: 'Waiting for confirmation...' });
      await waitForTx(hash);
      updateNotification(nid, { type: 'success', message: 'Re-vote cast!' });
      queryClient.invalidateQueries({ queryKey: ['reportStatus', docId] });
    } catch (err) {
      updateNotification(nid, { type: 'error', message: 'Re-vote failed: ' + (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  }, [walletClient, queryClient, addNotification, updateNotification]);

  const finalize = useCallback(async (docId: number) => {
    if (!walletClient) return;
    setSubmitting(true);
    const nid = `finalize-${Date.now()}`;
    try {
      addNotification({ id: nid, type: 'pending', message: 'Finalizing report...' });
      const hash = await writeContract(walletClient, 'ReportManager', 'finalize', [BigInt(docId)], { gas: TX_GAS });
      updateNotification(nid, { message: 'Waiting for confirmation...' });
      await waitForTx(hash);
      updateNotification(nid, { type: 'success', message: 'Report finalized!' });
      queryClient.invalidateQueries({ queryKey: ['reportStatus', docId] });
      queryClient.invalidateQueries({ queryKey: ['document', docId] });
    } catch (err) {
      updateNotification(nid, { type: 'error', message: 'Finalize failed: ' + (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  }, [walletClient, queryClient, addNotification, updateNotification]);

  return { submitting, report, revote, finalize };
}
