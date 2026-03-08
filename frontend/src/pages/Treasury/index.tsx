import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { readContract } from '../../lib/contracts';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { BalanceCard } from './BalanceCard';
import { SpendHistory } from './SpendHistory';
import { RewardPool } from './RewardPool';
import { DonateCard } from './DonateCard';

export default function TreasuryPage() {
  const { t } = useTranslation();

  const { data: poolBalance } = useQuery({
    queryKey: ['rewardPoolBalance'],
    queryFn: async () => readContract('Treasury', 'rewardPoolBalance') as Promise<bigint>,
    staleTime: 30_000,
  });

  return (
    <PageWrapper>
      <h1 className="text-2xl font-bold mb-6">{t('nav.treasury')}</h1>
      <BalanceCard />
      <DonateCard rewardPoolBalance={poolBalance ?? 0n} />
      <RewardPool />
      <SpendHistory />
    </PageWrapper>
  );
}
