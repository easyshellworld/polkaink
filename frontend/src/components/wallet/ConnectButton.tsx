import { useTranslation } from 'react-i18next';
import { useWallet } from '../../hooks/useWallet';
import { shortenAddress } from '../../lib/utils';

export function ConnectButton() {
  const { t } = useTranslation();
  const { address, balance, isConnecting, connect, disconnect } = useWallet();

  if (address) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-[var(--color-text-secondary)] sm:inline">
          {parseFloat(balance).toFixed(2)} PAS
        </span>
        <button
          onClick={disconnect}
          className="rounded-full bg-[var(--color-surface-alt)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-border)] transition-colors"
        >
          {shortenAddress(address)}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      className="rounded-full bg-[var(--color-primary)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
    >
      {isConnecting ? '...' : t('nav.connect')}
    </button>
  );
}
