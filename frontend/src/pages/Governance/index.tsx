import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProposals } from '../../hooks/useProposals';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Skeleton } from '../../components/ui/Skeleton';
import { Pagination } from '../../components/ui/Pagination';
import { ProposalCard } from './ProposalCard';

export default function GovernancePage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const perPage = 10;
  const { data, isLoading } = useProposals(page, perPage);

  const proposals = data?.proposals ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / perPage);

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('governance.title')}</h1>
        <span className="text-sm text-[var(--color-text-secondary)]">
          {t('governance.total_proposals', { count: total })}
        </span>
      </div>

      {isLoading ? (
        <Skeleton count={3} />
      ) : proposals.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
          <h2 className="text-lg font-semibold mb-2">{t('governance.empty_title')}</h2>
          <p className="text-[var(--color-text-secondary)]">{t('governance.empty_desc')}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {proposals.map((p) => (
              <ProposalCard key={Number(p.id)} proposal={p} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </PageWrapper>
  );
}
