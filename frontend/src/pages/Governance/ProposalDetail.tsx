import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatEther } from 'viem';
import { useProposal, useHasVoted } from '../../hooks/useProposals';
import { useDocument } from '../../hooks/useDocuments';
import { useRealProposer } from '../../hooks/useRealProposer';
import { useVetoStatus, useIsCouncilMember, useCastVeto, useCouncilApprove } from '../../hooks/useCouncil';
import { useNotificationStore } from '../../store/notificationStore';
import { useVote } from '../../hooks/useVote';
import { useWalletStore } from '../../store/walletStore';
import { writeContract, waitForTx } from '../../lib/contracts';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/governance/StatusBadge';
import { VotingPowerDisplay } from '../../components/governance/VotingPowerDisplay';
import { Progress } from '../../components/ui/Progress';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { shortenAddress, timeRemaining } from '../../lib/utils';

const LOCK_OPTIONS = [
  { days: 0, label: 'No Lock', multiplier: '×1.0' },
  { days: 30, label: '30 Days', multiplier: '×1.2' },
  { days: 90, label: '90 Days', multiplier: '×1.5' },
  { days: 180, label: '180 Days', multiplier: '×2.0' },
];

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
  const { data: realInfo } = useRealProposer(proposalId);
  const { data: voted } = useHasVoted(proposalId, address);
  const { voting, castVote } = useVote(proposalId ?? 0);
  const { data: vetoStatus } = useVetoStatus(proposalId);
  const { data: isMember } = useIsCouncilMember(address);
  const { submitting: vetoSubmitting, castVeto } = useCastVeto();
  const { submitting: approveSubmitting, approve } = useCouncilApprove();

  const [lockDays, setLockDays] = useState(0);
  const [vetoReason, setVetoReason] = useState('');
  const [showVetoInput, setShowVetoInput] = useState(false);
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

  const handleQueue = async () => {
    if (!walletClient || !proposalId) return;
    const nid = `queue-${Date.now()}`;
    try {
      addNotification({ id: nid, type: 'pending', message: t('governance.queuing') });
      const hash = await writeContract(walletClient, 'GovernanceCore', 'queueProposal', [
        BigInt(proposalId),
      ]);
      updateNotification(nid, { message: t('governance.waiting_confirm') });
      await waitForTx(hash);
      updateNotification(nid, { type: 'success', message: t('governance.queued') });
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

  const handleVeto = async () => {
    if (!proposalId) return;
    await castVeto(proposalId, vetoReason);
    setShowVetoInput(false);
    setVetoReason('');
    refetch();
  };

  const handleApprove = async () => {
    if (!proposalId) return;
    await approve(proposalId);
    refetch();
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
  const proposerAddr = realInfo?.proposer ?? p.proposer;
  const fmtVotes = (v: bigint) => {
    const s = formatEther(v);
    const n = parseFloat(s);
    return n === 0 ? '0' : n < 0.01 ? n.toFixed(4) : n % 1 === 0 ? n.toFixed(0) : n.toFixed(2);
  };
  const yesNum = parseFloat(formatEther(p.yesVotes));
  const noNum = parseFloat(formatEther(p.noVotes));
  const abstainNum = parseFloat(formatEther(p.abstainVotes));
  const total = yesNum + noNum;
  const totalWithAbstain = total + abstainNum;
  const yesPercent = total > 0 ? (yesNum / total) * 100 : 0;
  const isActive = p.status === 1;
  const isPassed = p.status === 2;
  const isTimelockQueued = p.status === 3;
  const isPending = p.status === 0;
  const isEnded = Number(p.endTime) <= now;
  const isProposer = address?.toLowerCase() === proposerAddr.toLowerCase();
  const canExecute = isTimelockQueued;
  const canQueue = isPassed;
  const canVote = isActive && !isEnded && !voted;
  const canCancel = isPending && isProposer;
  const canCouncilReview = isMember && (isPassed || isTimelockQueued);

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
              {p.proposalType === 1 && (
                <Badge variant="warning" pill>{t('governance.type_upgrade')}</Badge>
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
        <div className="grid grid-cols-2 gap-4 rounded-xl bg-[var(--color-primary-10)]/40 p-4 text-sm md:grid-cols-4">
          <div>
            <div className="text-[var(--color-text-secondary)]">{t('governance.proposer')}</div>
            <Link
              to={`/profile/${proposerAddr}`}
              className="font-medium text-[var(--color-primary)] hover:underline"
            >
              {shortenAddress(proposerAddr)}
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
            <div className="text-[var(--color-text-secondary)]">{t('governance.stake')}</div>
            <div className="font-medium">{formatEther(p.stakeAmount)} PAS</div>
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
          {/* Vote Results */}
          <Card padding="lg">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-[var(--color-primary)]" />
              {t('governance.voting_results')}
            </h2>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[var(--color-success)] font-medium">
                {t('governance.vote_yes')}: {fmtVotes(p.yesVotes)} ({yesPercent.toFixed(1)}%)
              </span>
              <span className="text-[var(--color-error)] font-medium">
                {t('governance.vote_no')}: {fmtVotes(p.noVotes)} ({total > 0 ? (100 - yesPercent).toFixed(1) : '0.0'}%)
              </span>
            </div>
            <Progress yesPercent={total > 0 ? yesPercent : 0} showLabels={false} height="md" />

            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
              <div className="rounded-xl bg-[var(--color-primary-10)] p-3">
                <div className="text-lg font-bold text-[var(--color-primary)]">{totalWithAbstain % 1 === 0 ? totalWithAbstain.toFixed(0) : totalWithAbstain.toFixed(2)}</div>
                <div className="text-[var(--color-text-secondary)] mt-0.5">{t('governance.total_votes_label')}</div>
              </div>
              <div className="rounded-xl bg-[var(--color-surface-alt)] p-3">
                <div className="text-lg font-bold">{fmtVotes(p.abstainVotes)}</div>
                <div className="text-[var(--color-text-secondary)] mt-0.5">{t('governance.abstain')}</div>
              </div>
              <div className="rounded-xl bg-[var(--color-surface-alt)] p-3">
                <div className="text-sm font-bold">{t('governance.threshold')}</div>
                <div className="text-[var(--color-text-secondary)] mt-0.5">&gt;60% + 5%</div>
              </div>
            </div>
          </Card>

          {/* Voting Panel */}
          {canVote && (
            <Card padding="lg" className="!border-[var(--color-primary)]/20">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <span className="h-4 w-1 rounded-full bg-[var(--color-primary)]" />
                {t('governance.cast_vote')}
              </h2>

              <div className="mb-5">
                <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-2 block">
                  {t('governance.lock_period')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {LOCK_OPTIONS.map((opt) => (
                    <button
                      key={opt.days}
                      onClick={() => setLockDays(opt.days)}
                      className={`rounded-xl border px-4 py-2 text-xs font-medium transition-all duration-200 ${
                        lockDays === opt.days
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20'
                          : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-10)]'
                      }`}
                    >
                      {opt.label} <span className={lockDays === opt.days ? 'opacity-80' : 'opacity-50'}>{opt.multiplier}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => castVote(true, false, lockDays)}
                  disabled={voting}
                  loading={voting}
                  className="flex-1 !rounded-xl !bg-[var(--color-success)] hover:!opacity-90 !shadow-md !shadow-green-200/30"
                >
                  {t('governance.vote_yes')}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => castVote(false, false, lockDays)}
                  disabled={voting}
                  loading={voting}
                  className="flex-1 !rounded-xl !shadow-md !shadow-red-200/30"
                >
                  {t('governance.vote_no')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => castVote(false, true, lockDays)}
                  disabled={voting}
                  loading={voting}
                  className="!rounded-xl hover:!border-[var(--color-primary)] hover:!text-[var(--color-primary)]"
                >
                  {t('governance.abstain')}
                </Button>
              </div>
            </Card>
          )}

          {voted && (
            <Card className="text-center text-sm !bg-[var(--color-primary-10)] !border-[var(--color-primary)]/15">
              <span className="text-[var(--color-primary)] font-medium">✓ {t('governance.already_voted')}</span>
            </Card>
          )}

          {/* Council Review Section */}
          {canCouncilReview && (
            <Card padding="lg" className="!border-amber-200">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className="h-4 w-1 rounded-full bg-amber-400" />
                {t('council.review_title')}
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mb-3">
                {t('council.review_desc')}
              </p>

              {showVetoInput ? (
                <div className="space-y-2">
                  <textarea
                    value={vetoReason}
                    onChange={(e) => setVetoReason(e.target.value)}
                    placeholder={t('council.veto_reason_placeholder')}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none resize-none"
                    rows={3}
                  />
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                    <span>{vetoReason.length}/50 {t('council.min_chars')}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleVeto}
                      disabled={vetoSubmitting || vetoReason.length < 50}
                      loading={vetoSubmitting}
                    >
                      {t('council.confirm_veto')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setShowVetoInput(false); setVetoReason(''); }}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowVetoInput(true)}
                  >
                    {t('council.veto_action')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApprove}
                    disabled={approveSubmitting}
                    loading={approveSubmitting}
                  >
                    {t('council.approve_action')}
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Action Buttons */}
          {(canQueue || canExecute || canCancel) && (
            <div className="flex flex-wrap gap-3">
              {canQueue && (
                <Button variant="secondary" onClick={handleQueue} className="flex-1 !rounded-xl">
                  {t('governance.queue_proposal')}
                </Button>
              )}
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
          <VotingPowerDisplay proposalId={proposalId} />

          {/* Veto Status */}
          {vetoStatus && (
            <Card>
              <h3 className="text-xs font-semibold mb-3 flex items-center gap-2">
                <span className="h-4 w-1 rounded-full bg-amber-400" />
                {t('council.veto_status')}
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  {vetoStatus.vetoCount} / 4 {t('council.vetos_cast')}
                </span>
                {vetoStatus.vetoed ? (
                  <Badge variant="error" pill>{t('governance.status_vetoed')}</Badge>
                ) : vetoStatus.vetoCount > 0 ? (
                  <Badge variant="warning" pill>{t('council.veto_in_progress')}</Badge>
                ) : (
                  <Badge variant="success" pill>{t('council.veto_clear')}</Badge>
                )}
              </div>
              <div className="mt-2">
                <Progress
                  yesPercent={(vetoStatus.vetoCount / 4) * 100}
                  showLabels={false}
                  height="sm"
                />
              </div>
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
              <div className="flex justify-between items-center">
                <span className="text-[var(--color-text-secondary)]">{t('governance.snapshot_block')}</span>
                <span className="font-mono font-medium">#{Number(p.snapshotBlock)}</span>
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
