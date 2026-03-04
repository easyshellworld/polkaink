import { useTranslation } from 'react-i18next';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card } from '../../components/ui/Card';
import { VetoHistory } from './VetoHistory';
import { useIsOGGold } from '../../hooks/useCouncil';
import { useWalletStore } from '../../store/walletStore';
import { Badge } from '../../components/ui/Badge';

export default function CouncilPage() {
  const { t } = useTranslation();
  const address = useWalletStore((s) => s.address);
  const { data: isOGGold } = useIsOGGold(address);

  return (
    <PageWrapper>
      <h1 className="text-2xl font-bold mb-2">{t('council.title')}</h1>
      <p className="text-[var(--color-text-secondary)] mb-6">
        {t('council.desc_v2', 'OG Gold holders have special governance powers including instant veto.')}
      </p>

      <Card padding="lg" className="mb-6">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-amber-400" />
          {t('council.og_gold_status', 'OG Gold Status')}
        </h2>
        {address ? (
          <div className="flex items-center gap-3">
            <Badge variant={isOGGold ? 'success' : 'neutral'} pill>
              {isOGGold ? t('council.og_gold_holder', 'OG Gold Holder') : t('council.not_og_gold', 'Not an OG Gold Holder')}
            </Badge>
            {isOGGold && (
              <span className="text-xs text-[var(--color-text-secondary)]">
                {t('council.veto_power_desc', 'Your NO vote on proposals triggers an instant veto.')}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-secondary)]">
            {t('common.connect_wallet', 'Connect wallet to check status')}
          </p>
        )}
      </Card>

      <Card padding="lg" className="mb-6">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-[var(--color-primary)]" />
          {t('council.governance_model', 'Governance Model')}
        </h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">2.0</div>
            <div className="text-xs text-[var(--color-text-secondary)]">{t('governance.threshold')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold">88</div>
            <div className="text-xs text-[var(--color-text-secondary)]">DOT {t('staking.stake_button', 'Stake')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold">72h</div>
            <div className="text-xs text-[var(--color-text-secondary)]">{t('council.freeze_period', 'Freeze Period')}</div>
          </div>
        </div>
      </Card>

      <VetoHistory />
    </PageWrapper>
  );
}
