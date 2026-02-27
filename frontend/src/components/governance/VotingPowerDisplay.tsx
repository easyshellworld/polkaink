import { useVotingPower } from '../../hooks/useVotingPower';
import { useWalletStore } from '../../store/walletStore';

export function VotingPowerDisplay() {
  const address = useWalletStore((s) => s.address);
  const { data } = useVotingPower(address);

  if (!address || !data) return null;

  return (
    <div className="rounded-lg bg-[var(--color-surface-alt)] p-3 text-sm">
      <div className="text-[var(--color-text-secondary)]">Voting Power</div>
      <div className="font-semibold">
        {parseFloat(data.balance).toFixed(2)} PAS × {data.weight}
      </div>
    </div>
  );
}
