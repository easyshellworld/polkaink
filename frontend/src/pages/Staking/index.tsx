import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatEther } from 'viem';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import {
  useStakeInfo,
  useIsMember,
  useTotalMembers,
  useStake,
  useUnstake,
} from '../../hooks/useStaking';
import { useWalletStore } from '../../store/walletStore';

const LOCK_PERIODS = [3, 6, 12, 24] as const;

function formatCountdown(lockEndSec: number): string {
  const now = Math.floor(Date.now() / 1000);
  const remaining = lockEndSec - now;
  if (remaining <= 0) return 'Unlocked';
  const d = Math.floor(remaining / 86400);
  const h = Math.floor((remaining % 86400) / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function StakingPage() {
  const { t } = useTranslation();
  const address = useWalletStore((s) => s.address);
  const { data: stakeInfo } = useStakeInfo(address);
  const { data: isMember } = useIsMember(address);
  const { data: totalMembers } = useTotalMembers();
  const { submitting: stakeSubmitting, stake } = useStake();
  const { submitting: unstakeSubmitting, unstake, earlyUnstake } = useUnstake();

  const [lockPeriod, setLockPeriod] = useState<number>(12);
  const [countdown, setCountdown] = useState<string>('');
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (!stakeInfo?.active || !stakeInfo.lockEnd) return;
    const lockEndSec = Number(stakeInfo.lockEnd);
    const update = () => {
      setCountdown(formatCountdown(lockEndSec));
      setNow(Math.floor(Date.now() / 1000));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [stakeInfo?.active, stakeInfo?.lockEnd]);

  const isLockExpired = stakeInfo?.lockEnd
    ? Number(stakeInfo.lockEnd) <= now
    : false;

  return (
    <PageWrapper>
      <h1 className="text-2xl font-bold mb-2">
        {t('staking.title', 'Staking')}
      </h1>
      <p className="text-[var(--color-text-secondary)] mb-6">
        {t('staking.subtitle', 'Stake 88 PAS to become a member and participate in PolkaInk governance.')}
      </p>

      <Card padding="lg" className="mb-6">
        <div className="text-center">
          <div className="text-xs text-[var(--color-text-secondary)] mb-1">
            {t('staking.total_members', 'Total Active Members')}
          </div>
          <div className="text-3xl font-bold text-[var(--color-primary)]">
            {totalMembers ?? '—'}
          </div>
        </div>
      </Card>

      {address ? (
        <>
          {isMember && stakeInfo?.active ? (
            <Card padding="lg" className="mb-6">
              <h2 className="text-lg font-semibold mb-4">
                {t('staking.your_stake', 'Your Stake')}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-[var(--color-text-secondary)]">
                    {t('staking.amount', 'Amount')}
                  </div>
                  <div className="text-lg font-bold">
                    {formatEther(stakeInfo.amount)} PAS
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--color-text-secondary)]">
                    {t('staking.lock_period', 'Lock Period')}
                  </div>
                  <div className="text-lg font-bold">
                    {stakeInfo.lockMonths} {t('staking.months', 'months')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--color-text-secondary)]">
                    {t('staking.lock_end', 'Lock End')}
                  </div>
                  <div className="text-lg font-bold text-[var(--color-primary)]">
                    {countdown || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--color-text-secondary)]">
                    {t('staking.member_nft', 'Member NFT ID')}
                  </div>
                  <div className="text-lg font-bold">
                    #{stakeInfo.memberNFTId.toString()}
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card padding="lg" className="mb-6">
              <h2 className="text-lg font-semibold mb-4">
                {t('staking.stake_now', 'Stake to Become a Member')}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('staking.select_lock', 'Select Lock Period')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {LOCK_PERIODS.map((months) => (
                      <button
                        key={months}
                        type="button"
                        onClick={() => setLockPeriod(months)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                          lockPeriod === months
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
                        }`}
                      >
                        {months} {t('staking.months', 'months')}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  size="lg"
                  onClick={() => stake(lockPeriod)}
                  disabled={stakeSubmitting}
                  loading={stakeSubmitting}
                >
                  {t('staking.stake_btn', 'Stake 88 PAS')}
                </Button>
              </div>
            </Card>
          )}

          {isMember && stakeInfo?.active && (
            <Card padding="lg" className="mb-6">
              <h2 className="text-lg font-semibold mb-4">
                {t('staking.unstake_section', 'Unstake')}
              </h2>
              <div className="space-y-4">
                {isLockExpired ? (
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                      {t('staking.unstake_ready', 'Your lock period has ended. You can unstake without penalty.')}
                    </p>
                    <Button
                      variant="primary"
                      onClick={unstake}
                      disabled={unstakeSubmitting}
                      loading={unstakeSubmitting}
                    >
                      {t('staking.unstake_btn', 'Unstake')}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                        {t('staking.unstake_wait_desc', 'Your lock period has not ended yet. Normal unstake will be available after lock expires.')}
                      </p>
                      <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                        {t('staking.unstake_wait', 'Lock expires in')}: {countdown}
                      </p>
                      <Button
                        variant="outline"
                        onClick={unstake}
                        disabled={true}
                      >
                        {t('staking.unstake_btn', 'Unstake')}
                      </Button>
                      <span className="ml-2 text-xs text-[var(--color-text-secondary)]">
                        ({t('staking.available_after', 'Available after lock')})
                      </span>
                    </div>
                    <div className="pt-4 border-t border-[var(--color-border)]">
                      <p className="text-sm font-medium text-[var(--color-error)] mb-2">
                        {t('staking.early_unstake_warning', 'Early Unstake (8.8 PAS Fixed Penalty)')}
                      </p>
                      <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                        {t('staking.early_unstake_desc', 'You can unstake before lock ends. A fixed 8.8 PAS penalty will be deducted.')}
                      </p>
                      <Button
                        variant="danger"
                        onClick={earlyUnstake}
                        disabled={unstakeSubmitting}
                        loading={unstakeSubmitting}
                      >
                        {t('staking.early_unstake_btn', 'Early Unstake (8.8 PAS Penalty)')}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card padding="lg" className="mb-6">
          <p className="text-[var(--color-text-secondary)] text-center">
            {t('staking.connect_wallet', 'Connect your wallet to stake and view your membership status.')}
          </p>
        </Card>
      )}
    </PageWrapper>
  );
}
