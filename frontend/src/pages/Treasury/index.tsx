import { useTranslation } from 'react-i18next';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { BalanceCard } from './BalanceCard';
import { SpendHistory } from './SpendHistory';
import { RewardPool } from './RewardPool';

export default function TreasuryPage() {
  const { t } = useTranslation();

  return (
    <PageWrapper>
      <h1 className="text-2xl font-bold mb-6">{t('nav.treasury')}</h1>
      <BalanceCard />
      <RewardPool />
      <SpendHistory />
    </PageWrapper>
  );
}
