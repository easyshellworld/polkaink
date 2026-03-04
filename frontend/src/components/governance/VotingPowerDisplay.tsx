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
    <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface-alt)] px-3 py-1.5 text-xs">
      <span className="text-[var(--color-text-secondary)]">{t('governance.your_voting_power')}:</span>
      <span className="font-semibold">{parseFloat(data.balance).toFixed(2)} PAS</span>
      <span className="text-[var(--color-text-secondary)]">({nftLabel})</span>
    </div>
  );
}
