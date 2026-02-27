import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getReadContract } from '../../lib/contracts';

export function StatsBar() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const contract = getReadContract();
      const [docs, versions, proposals] = await Promise.all([
        contract.totalDocuments(),
        contract.totalVersions(),
        contract.totalProposals(),
      ]);
      return {
        totalDocs: Number(docs),
        totalVersions: Number(versions),
        totalProposals: Number(proposals),
      };
    },
    staleTime: 30_000,
  });

  const items = [
    { label: t('home.stats_documents'), value: data?.totalDocs ?? 0, icon: '📄' },
    { label: t('home.stats_versions'), value: data?.totalVersions ?? 0, icon: '🔀' },
    { label: t('home.stats_proposals'), value: data?.totalProposals ?? 0, icon: '🗳️' },
  ];

  return (
    <section className="mx-auto grid max-w-4xl grid-cols-3 gap-4 px-4 pb-12">
      {items.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center"
        >
          <div className="text-2xl">{s.icon}</div>
          <div className="mt-1 text-2xl font-bold">{isLoading ? '—' : s.value}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">{s.label}</div>
        </div>
      ))}
    </section>
  );
}
