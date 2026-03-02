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
  { key: 255, label: 'All' },
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
  const [filter, setFilter] = useState(255);
  const perPage = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['proposals', filter, page, perPage],
    queryFn: async () => {
      const totalP = await readContract('GovernanceCore', 'totalProposals');
      const total = Number(totalP as bigint);
      if (total === 0) return { proposals: [] as ProposalData[], total: 0 };

      const statusParam = filter === 255 ? 0 : filter;
      const offset = page * perPage;
      const result = await readContract('GovernanceCore', 'listProposals', [
        statusParam, BigInt(offset), BigInt(perPage),
      ]);
      const [list, returnedTotal] = result as [ProposalData[], bigint];
      return {
        proposals: [...list].reverse(),
        total: filter === 255 ? total : Number(returnedTotal),
      };
    },
    staleTime: 15_000,
  });

  const proposals = data?.proposals ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / perPage);

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{t('governance.title')}</h1>
        <span className="text-sm text-[var(--color-text-secondary)]">
          {t('governance.total_proposals', { count: total })}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="md:col-span-3">
          <div className="flex flex-wrap gap-1.5 mb-4">
            {STATUS_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setFilter(key); setPage(0); }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === key
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
                }`}
              >
                {key === 255 ? 'All' : t(label)}
              </button>
            ))}
          </div>

          {isLoading ? (
            <Skeleton count={3} />
          ) : proposals.length === 0 ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
              <h2 className="text-lg font-semibold mb-2">{t('governance.empty_title')}</h2>
              <p className="text-[var(--color-text-secondary)]">{t('governance.empty_desc')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {proposals.map((p) => (
                <ProposalCard key={Number(p.id)} proposal={p} />
              ))}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>

        <div className="hidden md:block">
          <VotingPowerDisplay />
        </div>
      </div>
    </PageWrapper>
  );
}
