import { useTranslation } from 'react-i18next';
import { useCouncilMembers } from '../../hooks/useCouncil';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { shortenAddress, formatDate } from '../../lib/utils';

const MEMBER_STATUS: Record<number, string> = {
  0: 'Active',
  1: 'Suspended',
  2: 'Resigned',
  3: 'Removed',
  4: 'Expired',
};

export function MemberList() {
  const { t } = useTranslation();
  const { data: members, isLoading } = useCouncilMembers();

  if (isLoading) return <Skeleton count={3} className="mb-6" />;

  if (!members || members.length === 0) {
    return (
      <Card className="mb-6">
        <h2 className="text-sm font-semibold mb-3">{t('council.current_members')}</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">{t('council.no_members')}</p>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <h2 className="text-sm font-semibold mb-4">{t('council.current_members')}</h2>
      <div className="space-y-3">
        {members.map((m, i) => (
          <div
            key={m.memberAddress}
            className="flex items-center justify-between rounded-lg bg-[var(--color-surface-alt)] p-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-secondary-10)] text-sm font-bold text-[var(--color-secondary)]">
                #{i + 1}
              </div>
              <div>
                <div className="text-sm font-medium">{shortenAddress(m.memberAddress)}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">
                  {t('council.term_length')}: {formatDate(m.termStart)} — {formatDate(m.termEnd)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-secondary)]">
                Veto: {Number(m.vetoCount)}
              </span>
              <Badge variant={m.status === 0 ? 'success' : 'neutral'} pill>
                {MEMBER_STATUS[m.status] ?? 'Unknown'}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
