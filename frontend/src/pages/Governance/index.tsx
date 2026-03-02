import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { readContract } from '../../lib/contracts';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Skeleton } from '../../components/ui/Skeleton';
import { Pagination } from '../../components/ui/Pagination';
import { VotingPowerDisplay } from '../../components/governance/VotingPowerDisplay';
import { ProposalCard } from './ProposalCard';
import type { ProposalData } from '../../hooks/useProposals';

const STATUS_FILTERS = [
  { key: -1, label: 'All' },
  { key: 1, label: 'governance.status_active' },
  { key: 2, label: 'governance.status_passed' },
  { key: 3, label: 'governance.status_queued' },
  { key: 4, label: 'governance.status_executed' },
  { key: 5, label: 'governance.status_rejected' },
  { key: 6, label: 'governance.status_vetoed' },
];

export default function GovernancePage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState(-1);
  const perPage = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['proposals', filter, page, perPage],
    queryFn: async () => {
      const totalP = await readContract('GovernanceCore', 'totalProposals');
      const total = Number(totalP as bigint);
      if (total === 0) return { proposals: [] as ProposalData[], total: 0 };

      if (filter === -1) {
        const start = Math.max(1, total - page * perPage - perPage + 1);
        const end = Math.max(1, total - page * perPage);
        const ids = [];
        for (let i = end; i >= start; i--) ids.push(i);

        const proposals = await Promise.all(
          ids.map((id) =>
            readContract('GovernanceCore', 'getProposal', [BigInt(id)]) as Promise<ProposalData>
          )
        );
        return { proposals, total };
      }

      const result = await readContract('GovernanceCore', 'listProposals', [
        filter, BigInt(page * perPage), BigInt(perPage),
      ]);
      const [list, returnedTotal] = result as [ProposalData[], bigint];
      return { proposals: [...list].reverse(), total: Number(returnedTotal) };
    },
    staleTime: 15_000,
  });

  const proposals = data?.proposals ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / perPage);

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('governance.title')}</h1>
        <span className="rounded-full bg-[var(--color-primary-10)] px-3 py-1 text-xs font-medium text-[var(--color-primary)]">
          {t('governance.total_proposals', { count: total })}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="md:col-span-3">
          <div className="flex flex-wrap gap-2 mb-5">
            {STATUS_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setFilter(key); setPage(0); }}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-200 ${
                  filter === key
                    ? 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
                }`}
              >
                {key === -1 ? 'All' : t(label)}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : proposals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
              <div className="text-3xl mb-3 opacity-30">◎</div>
              <h2 className="text-lg font-semibold mb-2">{t('governance.empty_title')}</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">{t('governance.empty_desc')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {proposals.map((p) => (
                <ProposalCard key={Number(p.id)} proposal={p} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </div>

        <div className="hidden md:block space-y-4">
          <VotingPowerDisplay />
        </div>
      </div>
    </PageWrapper>
  );
}
