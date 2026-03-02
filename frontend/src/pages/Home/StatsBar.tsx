import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { readContract } from '../../lib/contracts';

export function StatsBar() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const [docs, versions, proposals] = await Promise.all([
        readContract('PolkaInkRegistry', 'totalDocuments'),
        readContract('VersionStore', 'totalVersions'),
        readContract('GovernanceCore', 'totalProposals'),
      ]);
      return {
        totalDocs: Number(docs as bigint),
        totalVersions: Number(versions as bigint),
        totalProposals: Number(proposals as bigint),
      };
    },
    staleTime: 30_000,
  });

  const items = [
    { label: t('home.stats_documents'), value: data?.totalDocs ?? 0 },
    { label: t('home.stats_versions'), value: data?.totalVersions ?? 0 },
    { label: t('home.stats_proposals'), value: data?.totalProposals ?? 0 },
  ];

  return (
    <section className="mx-auto max-w-4xl px-4 pb-12 animate-slide-up" style={{ animationDelay: '300ms' }}>
      <div className="flex items-center justify-center gap-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] divide-x divide-[var(--color-border)]">
        {items.map((s) => (
          <div key={s.label} className="flex-1 flex items-center justify-center gap-2.5 py-3.5 px-4">
            <span className="text-xl font-bold tabular-nums">
              {isLoading ? (
                <span className="inline-block w-6 h-5 rounded bg-[var(--color-surface-alt)] animate-shimmer" />
              ) : (
                s.value
              )}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
