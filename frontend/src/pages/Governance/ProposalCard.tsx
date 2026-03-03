import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatEther } from 'viem';
import { useDocument } from '../../hooks/useDocuments';
import { useRealProposer } from '../../hooks/useRealProposer';
import { StatusBadge } from '../../components/governance/StatusBadge';
import { Progress } from '../../components/ui/Progress';
import { shortenAddress, timeRemaining } from '../../lib/utils';
import type { ProposalData } from '../../hooks/useProposals';

export function ProposalCard({ proposal: p }: { proposal: ProposalData }) {
  const { t } = useTranslation();
  const { data: doc } = useDocument(Number(p.docId));
  const { data: realInfo } = useRealProposer(Number(p.id));

  const total = Number(p.yesVotes) + Number(p.noVotes);
  const yesPercent = total > 0 ? (Number(p.yesVotes) / total) * 100 : 0;
  const title = doc?.title
    ? (p.description ? `${p.description} — ${doc.title}` : doc.title)
    : (p.description || t('governance.version_update'));
  const proposerAddr = realInfo?.proposer ?? p.proposer;

  return (
    <Link to={`/governance/${Number(p.id)}`} className="block group">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all duration-200 group-hover:border-[var(--color-primary)] group-hover:shadow-lg group-hover:shadow-[var(--color-primary)]/8 group-hover:-translate-y-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <StatusBadge status={p.status} />
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">#{Number(p.id)}</span>
            </div>
            <p className="font-semibold truncate group-hover:text-[var(--color-primary)] transition-colors">
              {title}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-text-secondary)]">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                {shortenAddress(proposerAddr)}
              </span>
              <span>{t('governance.stake')}: {formatEther(p.stakeAmount)} PAS</span>
              <Link
                to={`/document/${Number(p.docId)}`}
                className="text-[var(--color-primary)] hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {t('governance.doc', { id: Number(p.docId) })}
              </Link>
              {p.status === 1 && (
                <span className="text-[var(--color-primary)] font-medium">
                  {timeRemaining(p.endTime)}
                </span>
              )}
            </div>
          </div>
          <svg className="w-5 h-5 text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </div>
        {total > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
            <Progress
              yesPercent={yesPercent}
              yesLabel={`${t('governance.vote_yes')} ${yesPercent.toFixed(1)}%`}
              noLabel={`${t('governance.vote_no')} ${(100 - yesPercent).toFixed(1)}%`}
            />
          </div>
        )}
      </div>
    </Link>
  );
}
