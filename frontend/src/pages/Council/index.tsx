import { useTranslation } from 'react-i18next';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { MemberList } from './MemberList';
import { VetoHistory } from './VetoHistory';
import { PendingReview } from './PendingReview';
import { ElectionPanel } from './ElectionPanel';
import { useVetoThreshold, useCouncilConstants, useIsCouncilMember, useResign } from '../../hooks/useCouncil';
import { useWalletStore } from '../../store/walletStore';

export default function CouncilPage() {
  const { t } = useTranslation();
  const address = useWalletStore((s) => s.address);
  const { data: threshold } = useVetoThreshold();
  const { data: constants } = useCouncilConstants();
  const { data: isMember } = useIsCouncilMember(address);
  const { submitting: resignSubmitting, resign } = useResign();

  const termDays = constants ? Math.round(constants.termLength / 86400) : 180;

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">{t('council.title')}</h1>
        {isMember && (
          <Button
            variant="outline"
            size="sm"
            onClick={resign}
            disabled={resignSubmitting}
            loading={resignSubmitting}
          >
            {t('council.resign')}
          </Button>
        )}
      </div>
      <p className="text-[var(--color-text-secondary)] mb-6">
        {t('council.desc')}
      </p>

      <Card padding="lg" className="mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{constants?.councilSize ?? 7}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">{t('council.members')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{threshold ?? 4}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">{t('council.veto_threshold')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{termDays}d</div>
            <div className="text-xs text-[var(--color-text-secondary)]">{t('council.term_length')}</div>
          </div>
        </div>
      </Card>

      <MemberList />
      <PendingReview />
      <ElectionPanel />
      <VetoHistory />
    </PageWrapper>
  );
}
