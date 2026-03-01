import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ethers } from 'ethers';
import { useProposal, useHasVoted } from '../../hooks/useProposals';
import { useNotificationStore } from '../../store/notificationStore';
import { useVote } from '../../hooks/useVote';
import { useWalletStore } from '../../store/walletStore';
import { getWriteContract } from '../../lib/contracts';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/governance/StatusBadge';
import { Progress } from '../../components/ui/Progress';
import { Skeleton } from '../../components/ui/Skeleton';
import { shortenAddress, timeRemaining } from '../../lib/utils';

export default function ProposalDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const proposalId = id ? Number(id) : undefined;
  const address = useWalletStore((s) => s.address);
  const signer = useWalletStore((s) => s.signer);

  const { addNotification, updateNotification } = useNotificationStore();
  const { data: proposal, isLoading, refetch } = useProposal(proposalId);
  const { data: voted } = useHasVoted(proposalId, address);
  const { voting, castVote } = useVote(proposalId ?? 0);

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleExecute = async () => {
    if (!signer || !proposalId) return;
    const nid = `exec-${Date.now()}`;
    try {
      const gov = getWriteContract(signer, 'GovernanceCore');
      addNotification({ id: nid, type: 'pending', message: 'Executing proposal...' });
      const tx = await gov.executeProposal(proposalId);
      updateNotification(nid, { message: 'Waiting for confirmation...' });
      await tx.wait();
      updateNotification(nid, { type: 'success', message: t('governance.executed') });
      refetch();
    } catch (err) {
      updateNotification(nid, { type: 'error', message: 'Execute failed: ' + (err as Error).message });
    }
  };

  if (isLoading) {
    return (
      <PageWrapper>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 mt-4" />
      </PageWrapper>
    );
  }

  if (!proposal) {
    return (
      <PageWrapper className="text-center py-16">
        <h2 className="text-lg font-semibold">Proposal not found</h2>
      </PageWrapper>
    );
  }

  const p = proposal;
  const total = Number(p.yesVotes) + Number(p.noVotes);
  const yesPercent = total > 0 ? (Number(p.yesVotes) / total) * 100 : 0;
  const isActive = p.status === 1;
  const isEnded = Number(p.endTime) <= now;
  const canExecute = isActive && isEnded;
  const canVote = isActive && !isEnded && !voted;

  return (
    <PageWrapper>
      <Link
        to="/governance"
        className="mb-4 inline-block text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
      >
        {t('governance.back')}
      </Link>

      <Card padding="lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={p.status} />
              <span className="text-sm text-[var(--color-text-secondary)]">
                Proposal #{Number(p.id)}
              </span>
            </div>
            <h1 className="text-xl font-bold">{p.description || 'Version Update Proposal'}</h1>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-lg bg-[var(--color-surface-alt)] p-4 text-sm md:grid-cols-4">
          <div>
            <div className="text-[var(--color-text-secondary)]">{t('governance.proposer')}</div>
            <div className="font-medium">{shortenAddress(p.proposer)}</div>
          </div>
          <div>
            <div className="text-[var(--color-text-secondary)]">{t('governance.document')}</div>
            <Link
              to={`/document/${Number(p.docId)}`}
              className="font-medium text-[var(--color-primary)] hover:underline"
            >
              {t('governance.doc', { id: Number(p.docId) })}
            </Link>
          </div>
          <div>
            <div className="text-[var(--color-text-secondary)]">{t('governance.stake')}</div>
            <div className="font-medium">{ethers.formatEther(p.stakeAmount)} PAS</div>
          </div>
          <div>
            <div className="text-[var(--color-text-secondary)]">
              {isEnded ? t('governance.ended') : t('governance.ends')}
            </div>
            <div className="font-medium">{timeRemaining(p.endTime)}</div>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-semibold mb-3">{t('governance.voting_results')}</h2>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[var(--color-success)] font-medium">
              Yes: {Number(p.yesVotes)} ({yesPercent.toFixed(1)}%)
            </span>
            <span className="text-[var(--color-error)] font-medium">
              No: {Number(p.noVotes)} ({total > 0 ? (100 - yesPercent).toFixed(1) : '0.0'}%)
            </span>
          </div>
          <Progress yesPercent={total > 0 ? yesPercent : 0} showLabels={false} height="md" />
          <div className="mt-1 text-center text-xs text-[var(--color-text-secondary)]">
            {t('governance.total_votes', { count: total })} · {t('governance.threshold')}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {canVote && (
            <>
              <Button
                onClick={() => castVote(true)}
                disabled={voting}
                loading={voting}
                className="flex-1 !rounded-lg !bg-[var(--color-success)]"
              >
                {t('governance.vote_yes')}
              </Button>
              <Button
                variant="danger"
                onClick={() => castVote(false)}
                disabled={voting}
                loading={voting}
                className="flex-1 !rounded-lg"
              >
                {t('governance.vote_no')}
              </Button>
            </>
          )}
          {voted && (
            <div className="w-full rounded-lg bg-[var(--color-surface-alt)] p-3 text-center text-sm text-[var(--color-text-secondary)]">
              ✓ {t('governance.already_voted')}
            </div>
          )}
          {canExecute && (
            <Button
              variant="secondary"
              onClick={handleExecute}
              className="w-full !rounded-lg"
            >
              {t('governance.execute')}
            </Button>
          )}
        </div>
      </Card>
    </PageWrapper>
  );
}
