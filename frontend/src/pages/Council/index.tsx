import { useTranslation } from 'react-i18next';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card } from '../../components/ui/Card';
import { MemberList } from './MemberList';
import { VetoHistory } from './VetoHistory';
import { PendingReview } from './PendingReview';

export default function CouncilPage() {
  const { t } = useTranslation();

  return (
    <PageWrapper>
      <h1 className="text-2xl font-bold mb-2">{t('nav.council')}</h1>
      <p className="text-[var(--color-text-secondary)] mb-6">
        Archive Council — 7-member ethics guardian committee with veto power only.
      </p>

      <Card padding="lg" className="mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">7</div>
            <div className="text-xs text-[var(--color-text-secondary)]">Members</div>
          </div>
          <div>
            <div className="text-2xl font-bold">4</div>
            <div className="text-xs text-[var(--color-text-secondary)]">Veto Threshold</div>
          </div>
          <div>
            <div className="text-2xl font-bold">180d</div>
            <div className="text-xs text-[var(--color-text-secondary)]">Term Length</div>
          </div>
        </div>
      </Card>

      <MemberList />
      <PendingReview />
      <VetoHistory />
    </PageWrapper>
  );
}
