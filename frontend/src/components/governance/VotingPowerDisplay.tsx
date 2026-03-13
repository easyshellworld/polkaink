import { useTranslation } from 'react-i18next';
import { useVotingPower } from '../../hooks/useVotingPower';
import { useWalletStore } from '../../store/walletStore';

export function VotingPowerDisplay() {
  const { t } = useTranslation();
  const address = useWalletStore((s) => s.address);
  const { data } = useVotingPower(address);

  if (!address || !data) return null;

  const weightNum = Number(data.weight) / 1e18;

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface-alt)] px-3 py-1.5 text-xs">
      <span className="text-[var(--color-text-secondary)]">{t('governance.your_voting_power')}:</span>
      <span className="font-semibold">{weightNum.toFixed(2)}</span>
    </div>
  );
}
