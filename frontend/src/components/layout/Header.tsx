import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ConnectButton } from '../wallet/ConnectButton';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header() {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold">
          <span className="text-[var(--color-primary)] text-2xl">◎</span>
          <span>PolkaInk</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            to="/library"
            className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
          >
            {t('nav.library')}
          </Link>
          <Link
            to="/governance"
            className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
          >
            {t('nav.governance')}
          </Link>
          <Link
            to="/create"
            className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
          >
            {t('nav.create')}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
