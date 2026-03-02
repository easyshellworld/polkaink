import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatEther } from 'viem';
import { readContract } from '../../lib/contracts';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';

export function RewardPool() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['treasuryTotals'],
    queryFn: async () => {
      const result = await readContract('Treasury', 'getTotals');
      const [totalIncome, totalSpent] = result as [bigint, bigint];
      return {
        totalIncome: formatEther(totalIncome),
        totalSpent: formatEther(totalSpent),
      };
    },
    staleTime: 30_000,
  });

  if (isLoading) return <Skeleton className="h-24 mb-6" />;

  return (
    <Card className="mb-6">
      <h2 className="text-sm font-semibold mb-3">{t('treasury.reward_pool')}</h2>
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <div className="text-lg font-bold text-[var(--color-success)]">
            {data ? parseFloat(data.totalIncome).toFixed(4) : '0'} PAS
          </div>
          <div className="text-xs text-[var(--color-text-secondary)]">{t('treasury.total_income')}</div>
        </div>
        <div>
          <div className="text-lg font-bold text-[var(--color-error)]">
            {data ? parseFloat(data.totalSpent).toFixed(4) : '0'} PAS
          </div>
          <div className="text-xs text-[var(--color-text-secondary)]">{t('treasury.total_spent')}</div>
        </div>
      </div>
    </Card>
  );
}
