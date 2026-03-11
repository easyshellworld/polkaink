import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { decodeEventLog } from 'viem';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useProposal, useHasVoted } from '../../hooks/useProposals';
import { useDocument } from '../../hooks/useDocuments';
import { useProposalMarkdown } from '../../hooks/useMarkdownContent';
import { useNotificationStore } from '../../store/notificationStore';
import { useVote } from '../../hooks/useVote';
import { useWalletStore } from '../../store/walletStore';
import { useIsCouncilMember } from '../../hooks/useCouncil';
import { writeContract, waitForTx, getAbi } from '../../lib/contracts';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/governance/StatusBadge';
import { VotingPowerDisplay } from '../../components/governance/VotingPowerDisplay';
import { Skeleton } from '../../components/ui/Skeleton';
import { shortenAddress, timeRemaining, getProposalSummary } from '../../lib/utils';
import { ShareButton } from '../../components/ui/ShareButton';

function fmtScore(score: bigint): string {
  const n = Number(score) / 1e18;
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function formatEta(targetSec: number): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const remain = targetSec - nowSec;
  if (remain <= 0) return 'Ready';
  const h = Math.floor(remain / 3600);
  const m = Math.floor((remain % 3600) / 60);
  const s = remain % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export default function ProposalDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const proposalId = id ? Number(id) : undefined;
  const address = useWalletStore((s) => s.address);
  const walletClient = useWalletStore((s) => s.walletClient);
  const queryClient = useQueryClient();

  const { addNotification, updateNotification } = useNotificationStore();
  const { data: proposal, isLoading, refetch } = useProposal(proposalId);
  const docIdNum = proposal ? Number(proposal.docId) : undefined;
  const { data: doc } = useDocument(docIdNum);
  const { data: voted } = useHasVoted(proposalId, address);
  const { voting, castVote } = useVote(proposalId ?? 0);
  const { data: markdown, isLoading: mdLoading } = useProposalMarkdown(proposal?.targetVersionId);
  const { data: isCouncilMember } = useIsCouncilMember(address);

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [vetoReason, setVetoReason] = useState(0);
  const [vetoDescription, setVetoDescription] = useState('');
  const [castingVeto, setCastingVeto] = useState(false);
  const vetoDescriptionBytes = useMemo(
    () => new TextEncoder().encode(vetoDescription).length,
    [vetoDescription],
  );
  const typeLabels = useMemo<Record<number, string>>(() => ({
    0: t('governance.type_version', 'Version Update'),
    1: t('governance.type_upgrade', 'Upgrade Contract'),
    2: t('governance.type_parameter', 'Parameter Change'),
    3: t('governance.type_emergency', 'Emergency Confirm'),
  }), [t]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
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
      const receipt = await waitForTx(hash);
      const govAbi = getAbi('GovernanceCore');
      const rewardSkipped = receipt.logs.some((log) => {
        try {
          const decoded = decodeEventLog({
            abi: govAbi,
            data: log.data,
            topics: log.topics,
          });
          return decoded.eventName === 'RewardSkipped';
        } catch {
          return false;
        }
      });
      updateNotification(nid, {
        type: 'success',
        message: rewardSkipped
          ? t('governance.executed_reward_skipped', 'Proposal executed (reward skipped due to low pool).')
          : t('governance.executed_reward_paid', 'Proposal executed and proposer reward distributed.'),
      });
      await queryClient.invalidateQueries({ queryKey: ['document', docIdNum] });
      refetch();
    } catch (err) {
      updateNotification(nid, { type: 'error', message: (err as Error).message });
    }
  };

  const handleFinalize = async () => {
    if (!walletClient || !proposalId) return;
    const nid = `finalize-${Date.now()}`;
    try {
      addNotification({ id: nid, type: 'pending', message: t('governance.finalizing', 'Finalizing proposal...') });
      const hash = await writeContract(walletClient, 'GovernanceCore', 'finalizeProposal', [
        BigInt(proposalId),
      ]);
      updateNotification(nid, { message: t('governance.waiting_confirm') });
      await waitForTx(hash);
      updateNotification(nid, { type: 'success', message: t('governance.finalized', 'Proposal finalized.') });
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

  const handleCastVeto = async () => {
    if (!walletClient || !proposalId) return;
    if (vetoDescriptionBytes < 50) {
      addNotification({
        id: `veto-${Date.now()}`,
        type: 'error',
        message: t('council.veto_description_short', 'Description must be at least 50 bytes.'),
      });
      return;
    }

    const nid = `veto-${Date.now()}`;
    try {
      setCastingVeto(true);
      addNotification({ id: nid, type: 'pending', message: t('council.veto_casting', 'Casting veto...') });
      const hash = await writeContract(walletClient, 'ArchiveCouncil', 'castVeto', [
        BigInt(proposalId),
        vetoReason,
        vetoDescription,
      ]);
      updateNotification(nid, { message: t('governance.waiting_confirm') });
      await waitForTx(hash);
      updateNotification(nid, { type: 'success', message: t('council.veto_success', 'Veto submitted.') });
      setVetoDescription('');
      refetch();
    } catch (error) {
      updateNotification(nid, { type: 'error', message: (error as Error).message });
    } finally {
      setCastingVeto(false);
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
  const summary = getProposalSummary(p.description);
  const scoreNum = Number(p.score) / 1e18;
  const isActive = p.status === 0;
  const isApproved = p.status === 1;
  const isEnded = Number(p.endTime) <= now;
  const isProposer = address?.toLowerCase() === p.proposer.toLowerCase();
  const councilWindowReady = Number(p.councilWindowEnd) > 0 ? now > Number(p.councilWindowEnd) : true;
  const canExecute = isApproved && councilWindowReady;
  const canFinalize = isActive && isEnded;
  const canVote = isActive && !isEnded && !voted;
  const canCancel = isActive && isProposer;
  const canCouncilVeto = Boolean(isCouncilMember && isApproved && Number(p.councilWindowEnd) > now);

  const shareUrl = `${window.location.href}${address ? `${window.location.search ? '&' : '?'}ref=${address}` : ''}`;

  return (
    <PageWrapper>
      <Link
        to="/governance"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors group"
      >
        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        {t('governance.back')}
      </Link>

      <Card padding="lg" className="mb-5 !border-[var(--color-primary)]/10">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={p.status} />
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                #{Number(p.id)}
              </span>
            </div>
            <h1 className="text-xl font-bold">
              {doc?.title
                ? (summary ? `${summary} - ${doc.title}` : doc.title)
                : (summary || t('governance.version_update'))}
            </h1>
          </div>
          <ShareButton
            url={shareUrl}
            title={`PolkaInk Proposal #${Number(p.id)}`}
            text="Check out this governance proposal on PolkaInk"
          />
        </div>

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

        {isApproved && !councilWindowReady && (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-700 font-medium">
            {t('governance.timelock_ends_in', 'Executable in')} {formatEta(Number(p.councilWindowEnd))}
          </div>
        )}
        </Card>

        {canCouncilVeto && (
          <Card padding="lg" className="mb-5 border-pink-200/40 bg-pink-50/40">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <span className="h-4 w-1 rounded-full bg-[var(--color-primary)]" />
                {t('governance.council_veto', 'Council Veto')}
              </h2>
              <span className="text-xs text-[var(--color-text-secondary)]">{formatEta(Number(p.councilWindowEnd))}</span>
            </div>
            <div className="space-y-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-[var(--color-text-secondary)]">{t('council.veto_reason', 'Reason')}</span>
                <select
                  className="rounded-lg border px-3 py-2 text-sm"
                  value={vetoReason}
                  onChange={(event) => setVetoReason(Number(event.target.value))}
                >
                  <option value={0}>{t('council.veto_reason_false_history', 'False History')}</option>
                  <option value={1}>{t('council.veto_reason_malicious', 'Malicious Upgrade')}</option>
                  <option value={2}>{t('council.veto_reason_legal', 'Legal Risk')}</option>
                  <option value={3}>{t('council.veto_reason_hate', 'Hate Speech')}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[var(--color-text-secondary)]">
                  {t('council.veto_description', 'Description (≥50 bytes)')}
                </span>
                <textarea
                  className="w-full min-h-[96px] rounded-lg border px-3 py-2 text-sm resize-y"
                  value={vetoDescription}
                  onChange={(event) => setVetoDescription(event.target.value)}
                  placeholder={t('council.veto_description_placeholder', 'Explain why the proposal must be vetoed.')}
                />
              </label>
              <div className="text-xs text-[var(--color-text-secondary)]">
                {vetoDescriptionBytes} {t('council.veto_description_bytes', 'bytes')}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="danger"
                onClick={handleCastVeto}
                disabled={castingVeto || vetoDescriptionBytes < 50}
                loading={castingVeto}
              >
                {castingVeto ? t('council.vetoing', 'Vetoing...') : t('council.veto_button', 'Veto Proposal')}
              </Button>
            </div>
          </Card>
        )}

        <div className="grid gap-5 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
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
                <div className="text-2xl font-bold">{Number(p.voterCount)}</div>
                <div className="text-xs text-[var(--color-text-secondary)] mt-1">{t('governance.voters', 'Voters')}</div>
              </div>
              <div className="rounded-xl bg-[var(--color-surface-alt)] p-4">
                <div className="text-sm font-bold">{t('governance.threshold')}</div>
                <div className="text-xs text-[var(--color-text-secondary)] mt-1">&gt; 2.0</div>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <h2 className="text-sm font-semibold mb-3">{t('governance.proposal_content', 'Proposal Content')}</h2>
            {mdLoading ? (
              <Skeleton className="h-28" />
            ) : markdown ? (
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)]">{t('governance.no_content', 'No proposal content available.')}</p>
            )}
          </Card>

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

          {(canFinalize || canExecute || canCancel) && (
            <div className="flex flex-wrap gap-3">
              {canFinalize && (
                <Button variant="outline" onClick={handleFinalize} className="flex-1 !rounded-xl">
                  {t('governance.finalize', 'Finalize Proposal')}
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

        <div className="space-y-4">
          <VotingPowerDisplay />

          <Card>
            <h3 className="text-xs font-semibold mb-3 flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-[var(--color-primary)]" />
              {t('governance.proposal_info')}
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[var(--color-text-secondary)]">{t('governance.type')}</span>
                <span className="font-medium rounded-full bg-[var(--color-primary-10)] px-2.5 py-0.5 text-[var(--color-primary)]">
                  {typeLabels[p.proposalType] ?? t('common.unknown', 'Unknown')}
                </span>
              </div>
              {Number(p.targetVersionId) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-[var(--color-text-secondary)]">{t('governance.target_version')}</span>
                  <span className="font-medium">v{Number(p.targetVersionId)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[var(--color-text-secondary)]">{t('governance.stake', 'Stake')}</span>
                <span className="font-medium">{Number(p.proposalStake) / 1e18} PAS</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
