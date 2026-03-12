import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatEther } from 'viem';
import { readContract, writeContract, waitForTx } from '../../lib/contracts';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { useWalletStore } from '../../store/walletStore';
import { useNotificationStore } from '../../store/notificationStore';

interface EpochRecord {
  epochId: bigint;
  startTime: bigint;
  endTime: bigint;
  proposalCount: bigint;
  totalVoterReward: bigint;
  finalized: boolean;
}

export function SpendHistory() {
  const { t } = useTranslation();
  const address = useWalletStore((s) => s.address);
  const walletClient = useWalletStore((s) => s.walletClient);
  const { addNotification, updateNotification } = useNotificationStore();

  const { data, isLoading } = useQuery({
    queryKey: ['treasuryEpochSummary'],
    queryFn: async () => {
      const epochStart = await readContract('Treasury', 'epochStartTime') as bigint;
      const epochDuration = await readContract('Treasury', 'EPOCH_DURATION') as bigint;
      const now = BigInt(Math.floor(Date.now() / 1000));
      const epochId = now > epochStart ? (now - epochStart) / epochDuration : 0n;
      const current = await readContract('Treasury', 'getEpochRecord', [epochId]).catch(() => null) as EpochRecord | null;
      const previous = epochId > 0n
        ? await readContract('Treasury', 'getEpochRecord', [epochId - 1n]).catch(() => null) as EpochRecord | null
        : null;
      const previousPending = address && epochId > 0n
        ? await readContract('Treasury', 'pendingReward', [address as `0x${string}`, epochId - 1n]).catch(() => 0n) as bigint
        : 0n;
      return { current, previous, epochId, previousPending };
    },
    staleTime: 15_000,
    refetchInterval: 15_000,
  });

  const handleFinalizeEpoch = async () => {
    if (!walletClient || !data || data.epochId <= 0n) return;
    const targetEpochId = data.epochId - 1n;
    const nid = `epoch-finalize-${Date.now()}`;
    try {
      addNotification({ id: nid, type: 'pending', message: t('treasury.finalizing_epoch', 'Finalizing epoch...') });
      const hash = await writeContract(walletClient, 'Treasury', 'finalizeEpoch', [targetEpochId]);
      updateNotification(nid, { message: t('governance.waiting_confirm') });
      await waitForTx(hash);
      updateNotification(nid, { type: 'success', message: t('treasury.epoch_finalized', 'Epoch finalized.') });
    } catch (err) {
      updateNotification(nid, { type: 'error', message: (err as Error).message });
    }
  };

  const handleClaimEpoch = async () => {
    if (!walletClient || !data || data.epochId <= 0n) return;
    const targetEpochId = data.epochId - 1n;
    const nid = `epoch-claim-${Date.now()}`;
    try {
      addNotification({ id: nid, type: 'pending', message: t('treasury.claiming_epoch', 'Claiming epoch reward...') });
      const hash = await writeContract(walletClient, 'Treasury', 'claimEpochReward', [targetEpochId]);
      updateNotification(nid, { message: t('governance.waiting_confirm') });
      await waitForTx(hash);
      updateNotification(nid, { type: 'success', message: t('treasury.epoch_claimed', 'Epoch reward claimed.') });
    } catch (err) {
      updateNotification(nid, { type: 'error', message: (err as Error).message });
    }
  };

  if (isLoading) return <Skeleton className="h-24" />;

  return (
    <Card>
      <h2 className="text-sm font-semibold mb-4">{t('treasury.epoch_summary', 'Epoch Reward Summary')}</h2>
      {!data ? (
        <p className="text-sm text-[var(--color-text-secondary)]">{t('treasury.no_epoch_data', 'No epoch data available.')}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {[{ label: t('treasury.epoch_current', 'Current'), record: data.current, id: data.epochId }, { label: t('treasury.epoch_previous', 'Previous'), record: data.previous, id: data.epochId - 1n }].map((item) => (
            <div key={item.label} className="rounded-lg bg-[var(--color-surface-alt)] p-3">
              <div className="text-xs text-[var(--color-text-secondary)]">{item.label} Epoch #{item.id >= 0n ? item.id.toString() : '—'}</div>
              {item.record ? (
                <>
                  <div className="mt-1 text-sm">{t('treasury.proposals', 'Proposals')}: {item.record.proposalCount.toString()}</div>
                  <div className="text-sm">{t('treasury.voter_rewards', 'Voter rewards')}: {formatEther(item.record.totalVoterReward)} PAS</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">{item.record.finalized ? t('treasury.finalized', 'Finalized') : t('treasury.in_progress', 'In progress')}</div>
                </>
              ) : (
                <div className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('treasury.no_data', 'No data')}</div>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 rounded-lg bg-[var(--color-surface-alt)] p-3 text-sm">
        <div className="mb-2">
          {t('treasury.pending_previous_epoch', 'Your previous epoch pending reward')}: {formatEther(data?.previousPending ?? 0n)} PAS
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleFinalizeEpoch} disabled={!walletClient || !data || data.epochId <= 0n}>
            {t('treasury.finalize_previous_epoch', 'Finalize Previous Epoch')}
          </Button>
          <Button onClick={handleClaimEpoch} disabled={!walletClient || !data || data.epochId <= 0n}>
            {t('treasury.claim_previous_epoch', 'Claim Previous Epoch')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
