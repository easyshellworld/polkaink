import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatEther } from 'viem';
import { readContract } from '../../lib/contracts';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';

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

  const { data, isLoading } = useQuery({
    queryKey: ['treasuryEpochSummary'],
    queryFn: async () => {
      const epochStart = await readContract('Treasury', 'epochStartTime') as bigint;
      const now = BigInt(Math.floor(Date.now() / 1000));
      const epochId = now > epochStart ? (now - epochStart) / 3600n : 0n;
      const current = await readContract('Treasury', 'getEpochRecord', [epochId]).catch(() => null) as EpochRecord | null;
      const previous = epochId > 0n
        ? await readContract('Treasury', 'getEpochRecord', [epochId - 1n]).catch(() => null) as EpochRecord | null
        : null;
      return { current, previous, epochId };
    },
    staleTime: 30_000,
  });

  if (isLoading) return <Skeleton className="h-24" />;

  return (
    <Card>
      <h2 className="text-sm font-semibold mb-4">{t('treasury.epoch_summary', 'Epoch Reward Summary')}</h2>
      {!data ? (
        <p className="text-sm text-[var(--color-text-secondary)]">No epoch data available.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {[{ label: 'Current', record: data.current, id: data.epochId }, { label: 'Previous', record: data.previous, id: data.epochId - 1n }].map((item) => (
            <div key={item.label} className="rounded-lg bg-[var(--color-surface-alt)] p-3">
              <div className="text-xs text-[var(--color-text-secondary)]">{item.label} Epoch #{item.id >= 0n ? item.id.toString() : '—'}</div>
              {item.record ? (
                <>
                  <div className="mt-1 text-sm">Proposals: {item.record.proposalCount.toString()}</div>
                  <div className="text-sm">Voter rewards: {formatEther(item.record.totalVoterReward)} PAS</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">{item.record.finalized ? 'Finalized' : 'In progress'}</div>
                </>
              ) : (
                <div className="mt-1 text-sm text-[var(--color-text-secondary)]">No data</div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
