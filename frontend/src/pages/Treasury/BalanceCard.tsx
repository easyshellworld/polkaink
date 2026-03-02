import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatEther } from 'viem';
import { readContract } from '../../lib/contracts';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';

export function BalanceCard() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['treasuryBalance'],
    queryFn: async () => {
      const balance = await readContract('Treasury', 'balance');
      return formatEther(balance as bigint);
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
        {data ? parseFloat(data).toFixed(4) : '0'} PAS
      </div>
      <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
        {t('treasury.balance_desc')}
      </p>
    </Card>
  );
}
