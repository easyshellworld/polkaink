import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatEther, parseEther } from 'viem';
import { readContract } from '../../lib/contracts';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';

export function RewardPool() {
  const { t } = useTranslation();

  const { data: poolBalance, isLoading } = useQuery({
    queryKey: ['rewardPoolBalance'],
    queryFn: async () => readContract('Treasury', 'rewardPoolBalance') as Promise<bigint>,
    staleTime: 30_000,
  });

  if (isLoading) return <Skeleton className="h-24 mb-6" />;

  const isPaused = (poolBalance ?? 0n) < parseEther('50');

  return (
    <Card className="mb-6">
      <h2 className="text-sm font-semibold mb-3">{t('treasury.reward_pool')}</h2>
      <div className="text-center">
        <div className={`text-2xl font-bold ${isPaused ? 'text-amber-500' : 'text-[var(--color-success)]'}`}>
          {formatEther(poolBalance ?? 0n)} PAS
        </div>
        <div className="text-xs text-[var(--color-text-secondary)]">{t('treasury.reward_pool_balance', 'Reward Pool Balance')}</div>
        {isPaused && (
          <div className="mt-2 text-xs text-amber-600">{t('treasury.rewards_paused', 'Rewards paused until pool reaches 50 PAS.')}</div>
        )}
      </div>
    </Card>
  );
}
