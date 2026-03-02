import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { formatEther } from 'viem';
import { useProposals } from '../../hooks/useProposals';
import { useIsCouncilMember, useCastVeto, useCouncilApprove } from '../../hooks/useCouncil';
import { useWalletStore } from '../../store/walletStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/governance/StatusBadge';
import { shortenAddress } from '../../lib/utils';

export function PendingReview() {
  const { t } = useTranslation();
  const address = useWalletStore((s) => s.address);
  const { data: isMember } = useIsCouncilMember(address);
  const { data } = useProposals(0, 50);
  const { submitting: vetoSubmitting, castVeto } = useCastVeto();
  const { submitting: approveSubmitting, approve } = useCouncilApprove();
  const [vetoReason, setVetoReason] = useState('');
  const [activeVetoId, setActiveVetoId] = useState<number | null>(null);

  const proposals = data?.proposals ?? [];
  const pendingReview = proposals.filter((p) => p.status === 2 || p.status === 3);

  if (pendingReview.length === 0) {
    return (
      <Card className="mb-6">
        <h2 className="text-sm font-semibold mb-3">{t('council.pending_review')}</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">{t('council.no_pending')}</p>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <h2 className="text-sm font-semibold mb-4">{t('council.pending_review')}</h2>
      <div className="space-y-3">
        {pendingReview.map((p) => (
          <div
            key={Number(p.id)}
            className="rounded-lg border border-[var(--color-border)] p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={p.status} />
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    #{Number(p.id)}
                  </span>
                </div>
                <Link
                  to={`/governance/${Number(p.id)}`}
                  className="text-sm font-medium hover:text-[var(--color-primary)]"
                >
                  {p.description || 'Version Update Proposal'}
                </Link>
              </div>
              <div className="text-xs text-[var(--color-text-secondary)]">
                {shortenAddress(p.proposer)} · {formatEther(p.stakeAmount)} PAS
              </div>
            </div>

            {isMember && (
              <div className="mt-3 space-y-2">
                {activeVetoId === Number(p.id) ? (
                  <div className="space-y-2">
                    <textarea
                      value={vetoReason}
                      onChange={(e) => setVetoReason(e.target.value)}
                      placeholder={t('council.veto_reason_placeholder')}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          castVeto(Number(p.id), vetoReason);
                          setActiveVetoId(null);
                          setVetoReason('');
                        }}
                        disabled={vetoSubmitting || vetoReason.length < 50}
                        loading={vetoSubmitting}
                      >
                        {t('council.veto_action')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveVetoId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setActiveVetoId(Number(p.id))}
                    >
                      {t('council.veto_action')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => approve(Number(p.id))}
                      disabled={approveSubmitting}
                      loading={approveSubmitting}
                    >
                      {t('council.approve_action')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
