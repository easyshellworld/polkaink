import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatEther } from 'viem';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/governance/StatusBadge';
import { Progress } from '../../components/ui/Progress';
import { shortenAddress, timeRemaining } from '../../lib/utils';
import type { ProposalData } from '../../hooks/useProposals';

export function ProposalCard({ proposal: p }: { proposal: ProposalData }) {
  const { t } = useTranslation();
  const total = Number(p.yesVotes) + Number(p.noVotes);
  const yesPercent = total > 0 ? (Number(p.yesVotes) / total) * 100 : 0;

  return (
    <Link to={`/governance/${Number(p.id)}`}>
      <Card hover className="hover-lift">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={p.status} />
              <span className="text-xs text-[var(--color-text-secondary)]">#{Number(p.id)}</span>
            </div>
            <p className="font-medium truncate">{p.description || 'Version Update Proposal'}</p>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-secondary)]">
              <span>{t('governance.by')} {shortenAddress(p.proposer)}</span>
              <span>{t('governance.stake')}: {formatEther(p.stakeAmount)} PAS</span>
              <span>{t('governance.doc', { id: Number(p.docId) })}</span>
              {p.status === 1 && <span>{timeRemaining(p.endTime)}</span>}
            </div>
          </div>
        </div>
        {total > 0 && (
          <div className="mt-3">
            <Progress
              yesPercent={yesPercent}
              yesLabel={`Yes ${yesPercent.toFixed(1)}%`}
              noLabel={`No ${(100 - yesPercent).toFixed(1)}%`}
            />
          </div>
        )}
      </Card>
    </Link>
  );
}
