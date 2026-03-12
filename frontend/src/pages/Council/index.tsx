import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card } from '../../components/ui/Card';
import { VetoHistory } from './VetoHistory';
import { useCouncilMembers, useIsCouncilMember, useCouncilAllowanceStatus } from '../../hooks/useCouncil';
import { useProposals } from '../../hooks/useProposals';
import { useWalletStore } from '../../store/walletStore';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/governance/StatusBadge';
import { PAS_NETWORK } from '../../lib/contracts/addresses';
import { shortenAddress } from '../../lib/utils';
import { writeContract, waitForTx } from '../../lib/contracts';
import { useNotificationStore } from '../../store/notificationStore';
import i18n from '../../lib/i18n';
import { ContributionStats } from '../Profile/ContributionStats';
import { NFTGallery } from '../Profile/NFTGallery';
import { ProposalHistory } from '../Profile/ProposalHistory';

export default function CouncilPage() {
  const { t } = useTranslation();
  const address = useWalletStore((s) => s.address);
  const walletClient = useWalletStore((s) => s.walletClient);
  const { addNotification, updateNotification } = useNotificationStore();

  const { data: isCouncilMember, refetch: refetchCouncilMember } = useIsCouncilMember(address);
  const { data: members, refetch: refetchMembers } = useCouncilMembers();
  const { data: allowanceStatus, refetch: refetchAllowance } = useCouncilAllowanceStatus(address);
  const claimableEpochId = allowanceStatus?.claimableEpochId ?? null;

  const { data: proposalsData } = useProposals(0, 50);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const memberList = useMemo(() => members ?? [], [members]);

  const pendingReviewProposals = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return (proposalsData?.proposals ?? []).filter(
      (p) => p.status === 1 && Number(p.councilWindowEnd) > now
    );
  }, [proposalsData]);

  const handleClaimAllowance = async () => {
    if (!walletClient || !address || !isCouncilMember || claiming) return;

    if (!claimableEpochId) return;
    const nid = `claim-allowance-${Date.now()}`;
    try {
      setClaiming(true);
      addNotification({ id: nid, type: 'pending', message: i18n.t('notify.claiming_allowance', 'Claiming council allowance...') });
      const hash = await writeContract(walletClient, 'ArchiveCouncil', 'claimCouncilAllowance', [
        claimableEpochId,
      ]);
      updateNotification(nid, { message: i18n.t('notify.waiting_confirm', 'Waiting for confirmation...') });
      await waitForTx(hash);
      updateNotification(nid, { type: 'success', message: i18n.t('notify.allowance_claimed', 'Council allowance claimed.') });
      await Promise.all([refetchAllowance(), refetchCouncilMember(), refetchMembers()]);
    } catch (error) {
      updateNotification(nid, { type: 'error', message: (error as Error).message });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <PageWrapper>
      <h1 className="mb-2 text-2xl font-bold">{t('council.title')}</h1>
      <p className="mb-6 text-[var(--color-text-secondary)]">
        {t('council.desc_v2', 'Archive Council is a 7-member ethics council with veto power to protect the protocol and defend malicious proposals.')}
      </p>

      <Card padding="lg" className="mb-6 border-amber-200/60 bg-gradient-to-r from-amber-50/80 to-[var(--color-primary-10)]">
        <div className="flex items-start gap-4">
          <div className="text-2xl">⬡</div>
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-sm font-semibold">{t('council.genesis_config', 'Genesis Configuration')}</span>
              <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                {t('council.phase_fixed', 'Phase 1 fixed')}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
              {t('council.genesis_config_desc', 'Archive Council has 7 genesis members. Before Phase 1, membership is fixed and cannot be replaced. The veto threshold is 5/7 and guardian NFTs are minted at initialization.')}
            </p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs">
              <span><span className="text-[var(--color-text-secondary)]">{t('council.veto_threshold')}:</span> <span className="font-semibold">5 / 7</span></span>
              <span><span className="text-[var(--color-text-secondary)]">{t('council.council_window', 'Council Window')}:</span> <span className="font-semibold">24h</span></span>
              <span><span className="text-[var(--color-text-secondary)]">{t('council.guardian_nft', 'Guardian NFT')}:</span> <span className="font-semibold">{t('council.genesis_mint', 'Genesis Mint')}</span></span>
            </div>
          </div>
        </div>
      </Card>

      <Card padding="lg" className="mb-6">
        <h2 className="mb-3 text-sm font-semibold">{t('council.member_status', 'Your Council Status')}</h2>
        {address ? (
          <Badge variant={isCouncilMember ? 'success' : 'neutral'} pill>
            {isCouncilMember ? t('council.member_label', 'Council Member') : t('council.not_member', 'Not a Council Member')}
          </Badge>
        ) : (
          <p className="text-sm text-[var(--color-text-secondary)]">
            {t('common.connect_wallet', 'Connect wallet to check status')}
          </p>
        )}
      </Card>

      {address && isCouncilMember && (
        <Card padding="lg" className="mb-6">
          <h2 className="mb-3 text-sm font-semibold">{t('council.allowance_title', 'Council Allowance')}</h2>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-[var(--color-text-secondary)] space-y-1">
              <div>
                {t('council.epoch', 'Epoch')}:&nbsp;
                <span className="font-medium text-[var(--color-text)]">{allowanceStatus?.epochId?.toString() ?? '—'}</span>
              </div>
              <div>
                {claimableEpochId !== null
                  ? `${t('council.claimable_epoch', 'Claimable Epoch')}: ${claimableEpochId.toString()}`
                  : t('council.claimable_epoch_pending', 'Claimable epoch not ready')}
              </div>
              <div>
                {allowanceStatus?.claimed
                  ? t('council.already_claimed', 'Already claimed in this epoch')
                  : t('council.claimable_amount', '5 PAS claimable')}
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleClaimAllowance}
              disabled={claiming || claimableEpochId === null || allowanceStatus?.claimed}
              loading={claiming}
            >
              {allowanceStatus?.claimed
                ? t('council.claimed_button', 'Claimed')
                : t('council.claim_button', 'Claim 5 PAS')}
            </Button>
          </div>
        </Card>
      )}

      {address && isCouncilMember && pendingReviewProposals.length > 0 && (
        <Card padding="lg" className="mb-6 border-pink-200/40 bg-pink-50/30">
          <h2 className="mb-3 text-sm font-semibold flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-[var(--color-primary)]" />
            {t('council.pending_review')}
          </h2>
          <div className="space-y-2">
            {pendingReviewProposals.map((p) => (
              <Link
                key={Number(p.id)}
                to={`/governance/${Number(p.id)}`}
                className="flex items-center justify-between rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] p-3 hover:border-[var(--color-primary)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <StatusBadge status={p.status} />
                  <span className="text-sm font-medium">#{Number(p.id)}</span>
                  <span className="text-xs text-[var(--color-text-secondary)] truncate">
                    {p.description || t('governance.version_update')}
                  </span>
                </div>
                <span className="text-xs text-[var(--color-primary)] font-medium">
                  {t('council.veto_action')} →
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card padding="lg" className="mb-6">
        <h2 className="mb-3 text-sm font-semibold">{t('council.members_title', 'Genesis Members (7)')}</h2>
        {memberList.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">{t('common.loading', 'Loading...')}</p>
        ) : (
          <div className="space-y-2">
            {memberList.map((member, index) => {
              const isSelf = !!address && address.toLowerCase() === member.toLowerCase();
              return (
                <button
                  key={member}
                  type="button"
                  onClick={() => setSelectedMember(member)}
                  className={`group flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200 hover:border-[var(--color-primary)] hover:shadow-md hover:shadow-[var(--color-primary)]/10 ${
                    isSelf
                      ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary-10)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]'
                  }`}
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-amber-500 text-lg font-bold text-white">
                    ⬡
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--color-text-secondary)]">{t('council.member_index', 'Member #{{index}}', { index: index + 1 })}</span>
                      {isSelf && (
                        <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-medium text-white">
                          {t('council.you', 'You')}
                        </span>
                      )}
                    </div>
                    <div className="truncate font-mono text-sm font-medium">{shortenAddress(member)}</div>
                  </div>
                  <span className="text-xs text-[var(--color-primary)]">{t('council.view', 'View')}</span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Card padding="lg" className="mb-6">
        <h2 className="mb-3 text-sm font-semibold">{t('council.governance_model', 'Governance Model')}</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">5 / 7</div>
            <div className="text-xs text-[var(--color-text-secondary)]">{t('council.veto_threshold', 'Veto Threshold')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold">88</div>
            <div className="text-xs text-[var(--color-text-secondary)]">{PAS_NETWORK.symbol} {t('staking.required_stake', 'Required Stake')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold">72h</div>
            <div className="text-xs text-[var(--color-text-secondary)]">{t('council.freeze_period', 'Freeze Confirm Window')}</div>
          </div>
        </div>
      </Card>

      <VetoHistory />

      {selectedMember && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedMember(null)} />
          <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col overflow-hidden bg-[var(--color-background)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 font-bold text-white">⬡</div>
                <div>
                  <div className="text-sm font-semibold">{shortenAddress(selectedMember)}</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">{t('council.guardian_member', 'Guardian Council Member')}</div>
                </div>
              </div>
              <button onClick={() => setSelectedMember(null)} className="rounded-lg p-2 hover:bg-[var(--color-surface-alt)]">✕</button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
              <ContributionStats address={selectedMember} />
              <NFTGallery address={selectedMember} />
              <ProposalHistory address={selectedMember} />

              <a
                href={`${PAS_NETWORK.explorer}/address/${selectedMember}`}
                target="_blank"
                rel="noopener"
                className="block py-2 text-center text-xs text-[var(--color-primary)] hover:underline"
              >
                {t('council.view_explorer', 'View on Explorer')} →
              </a>
            </div>
          </div>
        </>
      )}
    </PageWrapper>
  );
}
