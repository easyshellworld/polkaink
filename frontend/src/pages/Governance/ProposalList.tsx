import { useTranslation } from 'react-i18next';
import type { ProposalData } from '../../hooks/useProposals';
import { ProposalCard } from './ProposalCard';

interface ProposalListProps {
  proposals: ProposalData[];
  filter: string;
}

export function ProposalList({ proposals, filter }: ProposalListProps) {
  const { t } = useTranslation();
  const filtered = filter === 'all'
    ? proposals
    : proposals.filter((p) => String(p.status) === filter);

  if (filtered.length === 0) {
    return (
      <p className="text-center text-sm text-[var(--color-text-secondary)] py-8">
        {t('governance.no_proposals_found', 'No proposals found.')}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {filtered.map((p) => (
        <ProposalCard key={Number(p.id)} proposal={p} />
      ))}
    </div>
  );
}
