import { useTranslation } from 'react-i18next';
import { useRecentProposals } from '../../hooks/useProposals';
import { ProposalCard } from '../Governance/ProposalCard';

export function LatestProposals() {
  const { t } = useTranslation();
  const { data: proposals } = useRecentProposals(5);

  if (!proposals || proposals.length === 0) return null;

  return (
    <section className="mx-auto max-w-4xl px-4 pb-16">
      <h2 className="mb-4 text-lg font-semibold">{t('home.latest_proposals')}</h2>
      <div className="space-y-3">
        {proposals.map((p) => (
          <ProposalCard key={Number(p.id)} proposal={p} />
        ))}
      </div>
    </section>
  );
}
