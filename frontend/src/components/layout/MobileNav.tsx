import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const navItems = [
  { path: '/library', key: 'nav.library', also: ['/document', '/propose'] },
  { path: '/governance', key: 'nav.governance', also: [] as string[] },
  { path: '/create', key: 'nav.create', also: [] as string[] },
];

export function MobileNav() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-sm md:hidden">
      {navItems.map(({ path, key, also }) => {
        const active = location.pathname === path
          || location.pathname.startsWith(path + '/')
          || also.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));
        return (
          <Link
            key={path}
            to={path}
            className={`relative flex-1 py-2.5 text-center transition-all duration-200 ${
              active
                ? 'text-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)]'
            }`}
          >
            <div className="text-xs font-medium py-0.5">{t(key)}</div>
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[var(--color-primary)]" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
