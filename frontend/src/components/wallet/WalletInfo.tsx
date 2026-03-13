import { useWalletStore } from '../../store/walletStore';
import { shortenAddress } from '../../lib/utils';

export function WalletInfo() {
  const { address, balance } = useWalletStore();

  if (!address) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg bg-[var(--color-surface-alt)] p-3 text-sm">
      <div className="h-8 w-8 rounded-full bg-[var(--color-primary-10)] flex items-center justify-center text-[var(--color-primary)] font-bold">
        {address.slice(2, 4).toUpperCase()}
      </div>
      <div>
        <div className="font-medium">{shortenAddress(address)}</div>
        <div className="text-xs text-[var(--color-text-secondary)]">
          {parseFloat(balance).toFixed(4)} PAS
        </div>
      </div>
    </div>
  );
}
