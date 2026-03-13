import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatEther } from 'viem';
import { getContractAddress, getPublicClient, readContract } from '../../lib/contracts';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';

export function BalanceCard() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['treasuryBalance'],
    queryFn: async () => {
      const pc = getPublicClient();
      const [nativeBalance, rewardPool] = await Promise.all([
        pc.getBalance({ address: getContractAddress('Treasury') as `0x${string}` }),
        readContract('Treasury', 'rewardPoolBalance').catch(() => 0n),
      ]);
      return {
        nativeBalance: formatEther(nativeBalance),
        rewardPool: formatEther(rewardPool as bigint),
      };
    },
    staleTime: 30_000,
  });

  if (isLoading) return <Skeleton className="h-32 mb-6" />;

  return (
    <Card padding="lg" className="mb-6 text-center">
      <div className="text-xs text-[var(--color-text-secondary)] mb-1">
        {t('treasury.balance')}
      </div>
      <div className="text-3xl font-bold text-[var(--color-primary)]">
        {data ? parseFloat(data.nativeBalance).toFixed(4) : '0'} PAS
      </div>
      <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
        {t('treasury.reward_pool_label', 'Reward Pool')}: {data ? parseFloat(data.rewardPool).toFixed(4) : '0'} PAS
      </p>
    </Card>
  );
}
