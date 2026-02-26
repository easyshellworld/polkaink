import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const navItems = [
  { path: '/', key: 'nav.home' },
  { path: '/library', key: 'nav.library' },
  { path: '/governance', key: 'nav.governance' },
  { path: '/create', key: 'nav.create' },
];

export function MobileNav() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-[var(--color-border)] bg-[var(--color-surface)] md:hidden">
      {navItems.map(({ path, key }) => {
        const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
        return (
          <Link
            key={path}
            to={path}
            className={`flex-1 py-3 text-center text-xs font-medium transition-colors ${
              active
                ? 'text-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)]'
            }`}
          >
            {t(key)}
          </Link>
        );
      })}
    </div>
  );
}
