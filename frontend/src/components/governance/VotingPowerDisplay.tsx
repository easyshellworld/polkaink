import { useTranslation } from 'react-i18next';
import { useVotingPower } from '../../hooks/useVotingPower';
import { useWalletStore } from '../../store/walletStore';

export function VotingPowerDisplay({ proposalId }: { proposalId?: number }) {
  const { t } = useTranslation();
  const address = useWalletStore((s) => s.address);
  const { data } = useVotingPower(address, proposalId);

  if (!address || !data) return null;

  const nftLabel = data.nftMultiplier === 2
    ? 'Guardian ×2.0'
    : data.nftMultiplier === 1.5
      ? 'Author ×1.5'
      : t('governance.no_nft_bonus');

  return (
    <div className="rounded-lg bg-[var(--color-surface-alt)] p-3 text-sm">
      <div className="text-xs text-[var(--color-text-secondary)] mb-1">
        {t('governance.your_voting_power')}
      </div>
      <div className="font-semibold text-base">
        {parseFloat(data.balance).toFixed(2)} PAS
      </div>
      <div className="text-xs text-[var(--color-text-secondary)] mt-1">
        {t('governance.nft_bonus')}: {nftLabel}
      </div>
    </div>
  );
}
