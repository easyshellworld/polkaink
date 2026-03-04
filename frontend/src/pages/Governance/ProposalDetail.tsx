import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProposal, useHasVoted } from '../../hooks/useProposals';
import { useDocument } from '../../hooks/useDocuments';
import { useIsOGGold } from '../../hooks/useCouncil';
import { useNotificationStore } from '../../store/notificationStore';
import { useVote } from '../../hooks/useVote';
import { useWalletStore } from '../../store/walletStore';
import { writeContract, waitForTx } from '../../lib/contracts';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/governance/StatusBadge';
import { VotingPowerDisplay } from '../../components/governance/VotingPowerDisplay';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { shortenAddress, timeRemaining } from '../../lib/utils';

function fmtScore(score: bigint): string {
  const n = Number(score) / 1e18;
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

export default function ProposalDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const proposalId = id ? Number(id) : undefined;
  const address = useWalletStore((s) => s.address);
  const walletClient = useWalletStore((s) => s.walletClient);

  const { addNotification, updateNotification } = useNotificationStore();
  const { data: proposal, isLoading, refetch } = useProposal(proposalId);
  const docIdNum = proposal ? Number(proposal.docId) : undefined;
  const { data: doc } = useDocument(docIdNum);
  const { data: voted } = useHasVoted(proposalId, address);
  const { voting, castVote } = useVote(proposalId ?? 0);
  const { data: isOGGold } = useIsOGGold(address);

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleExecute = async () => {
    if (!walletClient || !proposalId) return;
    const nid = `exec-${Date.now()}`;
    try {
      addNotification({ id: nid, type: 'pending', message: t('governance.executing') });
      const hash = await writeContract(walletClient, 'GovernanceCore', 'executeProposal', [
        BigInt(proposalId),
      ]);
      updateNotification(nid, { message: t('governance.waiting_confirm') });
      await waitForTx(hash);
      updateNotification(nid, { type: 'success', message: t('governance.executed') });
      refetch();
    } catch (err) {
      updateNotification(nid, { type: 'error', message: (err as Error).message });
    }
  };

  const handleCancel = async () => {
    if (!walletClient || !proposalId) return;
    const nid = `cancel-${Date.now()}`;
    try {
      addNotification({ id: nid, type: 'pending', message: t('governance.cancelling') });
      const hash = await writeContract(walletClient, 'GovernanceCore', 'cancelProposal', [
        BigInt(proposalId),
      ]);
      updateNotification(nid, { message: t('governance.waiting_confirm') });
      await waitForTx(hash);
      updateNotification(nid, { type: 'success', message: t('governance.cancelled') });
      refetch();
    } catch (err) {
      updateNotification(nid, { type: 'error', message: (err as Error).message });
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
        <h2 className="text-lg font-semibold">{t('governance.not_found')}</h2>
      </PageWrapper>
    );
  }

  const p = proposal;
  const scoreNum = Number(p.score) / 1e18;
  const isActive = p.status === 0;
  const isApproved = p.status === 1;
  const isEnded = Number(p.endTime) <= now;
  const isProposer = address?.toLowerCase() === p.proposer.toLowerCase();
  const canExecute = isApproved;
  const canVote = isActive && !isEnded && !voted;
  const canCancel = isActive && isProposer;

  return (
    <PageWrapper>
      <Link
        to="/governance"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors group"
      >
        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        {t('governance.back')}
      </Link>

      {/* Header */}
      <Card padding="lg" className="mb-5 !border-[var(--color-primary)]/10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={p.status} />
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                #{Number(p.id)}
              </span>
              {p.goldVetoed && (
                <Badge variant="error" pill>{t('governance.vetoed_by_gold', 'Vetoed by OG Gold')}</Badge>
              )}
            </div>
            <h1 className="text-xl font-bold">
              {doc?.title
                ? (p.description ? `${p.description} — ${doc.title}` : doc.title)
                : (p.description || t('governance.version_update'))}
            </h1>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-4 rounded-xl bg-[var(--color-primary-10)]/40 p-4 text-sm md:grid-cols-3">
          <div>
            <div className="text-[var(--color-text-secondary)]">{t('governance.proposer')}</div>
            <Link
              to={`/profile/${p.proposer}`}
              className="font-medium text-[var(--color-primary)] hover:underline"
            >
              {shortenAddress(p.proposer)}
            </Link>
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
            <div className="text-[var(--color-text-secondary)]">
              {isEnded ? t('governance.ended') : t('governance.ends')}
            </div>
            <div className="font-medium">{timeRemaining(p.endTime)}</div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-3">
        {/* Left: Voting Results & Actions */}
        <div className="md:col-span-2 space-y-4">
          {/* Score Display */}
          <Card padding="lg">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-[var(--color-primary)]" />
              {t('governance.voting_results')}
            </h2>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-[var(--color-primary-10)] p-4">
                <div className={`text-2xl font-bold ${scoreNum > 0 ? 'text-[var(--color-success)]' : scoreNum < 0 ? 'text-[var(--color-error)]' : ''}`}>
                  {fmtScore(p.score)}
                </div>
                <div className="text-xs text-[var(--color-text-secondary)] mt-1">{t('governance.score', 'Score')}</div>
              </div>
              <div className="rounded-xl bg-[var(--color-surface-alt)] p-4">
                <div className="text-2xl font-bold">{Number(p.noVoterCount)}</div>
                <div className="text-xs text-[var(--color-text-secondary)] mt-1">{t('governance.vote_no')}</div>
              </div>
              <div className="rounded-xl bg-[var(--color-surface-alt)] p-4">
                <div className="text-sm font-bold">{t('governance.threshold')}</div>
                <div className="text-xs text-[var(--color-text-secondary)] mt-1">&gt; 2.0</div>
              </div>
            </div>

            {p.goldVetoed && (
              <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 font-medium">
                {t('governance.vetoed_by_gold', 'Vetoed by OG Gold holder')}
              </div>
            )}
          </Card>

          {/* Voting Panel */}
          {canVote && (
            <Card padding="lg" className="!border-[var(--color-primary)]/20">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <span className="h-4 w-1 rounded-full bg-[var(--color-primary)]" />
                {t('governance.cast_vote')}
              </h2>

              <div className="flex gap-3">
                <Button
                  onClick={() => castVote(0)}
                  disabled={voting}
                  loading={voting}
                  className="flex-1 !rounded-xl !bg-[var(--color-success)] hover:!opacity-90 !shadow-md !shadow-green-200/30"
                >
                  {t('governance.vote_yes')}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => castVote(1)}
                  disabled={voting}
                  loading={voting}
                  className="flex-1 !rounded-xl !shadow-md !shadow-red-200/30"
                >
                  {t('governance.vote_no')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => castVote(2)}
                  disabled={voting}
                  loading={voting}
                  className="!rounded-xl hover:!border-[var(--color-primary)] hover:!text-[var(--color-primary)]"
                >
                  {t('governance.vote_abstain', 'Abstain')}
                </Button>
              </div>
            </Card>
          )}

          {voted && (
            <Card className="text-center text-sm !bg-[var(--color-primary-10)] !border-[var(--color-primary)]/15">
              <span className="text-[var(--color-primary)] font-medium">{t('governance.already_voted')}</span>
            </Card>
          )}

          {/* Action Buttons */}
          {(canExecute || canCancel) && (
            <div className="flex flex-wrap gap-3">
              {canExecute && (
                <Button variant="primary" onClick={handleExecute} className="flex-1 !rounded-xl !shadow-md !shadow-[var(--color-primary)]/20">
                  {t('governance.execute')}
                </Button>
              )}
              {canCancel && (
                <Button variant="danger" onClick={handleCancel} className="flex-1 !rounded-xl">
                  {t('governance.cancel_proposal')}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Voting Power */}
          <VotingPowerDisplay proposalId={proposalId} docId={docIdNum} />

          {/* OG Gold Status */}
          {isOGGold && (
            <Card>
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
                <span className="h-4 w-1 rounded-full bg-amber-400" />
                OG Gold
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {t('governance.og_gold_veto_power', 'You hold OG Gold — your NO vote triggers an instant veto.')}
              </p>
            </Card>
          )}

          {/* Proposal Type Info */}
          <Card>
            <h3 className="text-xs font-semibold mb-3 flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-[var(--color-primary)]" />
              {t('governance.proposal_info')}
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[var(--color-text-secondary)]">{t('governance.type')}</span>
                <span className="font-medium rounded-full bg-[var(--color-primary-10)] px-2.5 py-0.5 text-[var(--color-primary)]">
                  {p.proposalType === 0 ? t('governance.type_version') : t('governance.type_upgrade')}
                </span>
              </div>
              {Number(p.targetVersionId) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-[var(--color-text-secondary)]">{t('governance.target_version')}</span>
                  <span className="font-medium">v{Number(p.targetVersionId)}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
