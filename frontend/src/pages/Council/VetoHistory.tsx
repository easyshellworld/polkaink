import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useProposals } from '../../hooks/useProposals';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/governance/StatusBadge';

export function VetoHistory() {
  const { t } = useTranslation();
  const { data } = useProposals(0, 50);

  const proposals = data?.proposals ?? [];
  const vetoedProposals = proposals.filter((p) => p.status === 6);

  return (
    <Card>
      <h2 className="text-sm font-semibold mb-4">{t('council.veto_history')}</h2>
      {vetoedProposals.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">{t('council.no_vetos')}</p>
      ) : (
        <div className="space-y-2">
          {vetoedProposals.map((p) => (
            <Link
              key={Number(p.id)}
              to={`/governance/${Number(p.id)}`}
              className="flex items-center justify-between rounded-lg bg-[var(--color-surface-alt)] p-3 hover:bg-[var(--color-border)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <StatusBadge status={p.status} />
                <span className="text-sm">#{Number(p.id)}</span>
                <span className="text-sm text-[var(--color-text-secondary)] truncate">
                  {p.description || 'Version Update Proposal'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
