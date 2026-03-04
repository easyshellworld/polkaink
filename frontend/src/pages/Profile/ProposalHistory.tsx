import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { readContract } from '../../lib/contracts';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/governance/StatusBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import type { ProposalData } from '../../hooks/useProposals';

export function ProposalHistory({ address }: { address: string }) {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['proposalHistory', address],
    queryFn: async () => {
      const totalP = await readContract('GovernanceCore', 'totalProposals');
      const total = Number(totalP as bigint);
      if (total === 0) return [];

      const result = await readContract('GovernanceCore', 'listProposals', [
        0, 0n, BigInt(Math.min(total, 100)),
      ]);
      const [list] = result as [ProposalData[], bigint];
      return list.filter(
        (p) => p.proposer.toLowerCase() === address.toLowerCase()
      );
    },
    staleTime: 30_000,
  });

  if (isLoading) return <Skeleton count={2} className="mb-6" />;

  return (
    <Card>
      <h2 className="text-sm font-semibold mb-3">{t('profile.proposal_history')}</h2>
      {!data || data.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">
          {t('profile.no_proposals')}
        </p>
      ) : (
        <div className="space-y-2">
          {data.map((p) => (
            <Link
              key={Number(p.id)}
              to={`/governance/${Number(p.id)}`}
              className="flex items-center justify-between rounded-lg bg-[var(--color-surface-alt)] p-3 hover:bg-[var(--color-border)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <StatusBadge status={p.status} />
                <span className="text-sm font-medium">#{Number(p.id)}</span>
                <span className="text-sm text-[var(--color-text-secondary)] truncate max-w-[200px]">
                  {p.description || t('governance.version_update')}
                </span>
              </div>
              <span className={`text-xs font-medium ${Number(p.score) > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-text-secondary)]'}`}>
                {Number(p.score) >= 0 ? '+' : ''}{(Number(p.score) / 1e18).toFixed(2)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
