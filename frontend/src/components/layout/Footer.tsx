import { useTranslation } from 'react-i18next';
import { PAS_NETWORK, getContractAddress } from '../../lib/contracts/addresses';

export function Footer() {
  const { t } = useTranslation();
  const contractAddr = getContractAddress('PolkaInk');

  return (
    <footer className="border-t border-[var(--color-border)] py-8 text-center text-xs text-[var(--color-text-secondary)]">
      {t('home.footer_built')}{' '}
      <a
        href={PAS_NETWORK.explorer}
        target="_blank"
        rel="noopener"
        className="text-[var(--color-primary)] hover:underline"
      >
        Polkadot Hub
      </a>{' '}
      · {t('home.footer_powered')} · {t('home.footer_onchain')} ·{' '}
      <a
        href={`${PAS_NETWORK.explorer}/address/${contractAddr}`}
        target="_blank"
        rel="noopener"
        className="text-[var(--color-primary)] hover:underline"
      >
        {t('home.footer_contract')}
      </a>
    </footer>
  );
}
