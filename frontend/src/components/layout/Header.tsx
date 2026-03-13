import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ConnectButton } from '../wallet/ConnectButton';
import { LanguageSwitcher } from './LanguageSwitcher';

const navItems = [
  { path: '/library', key: 'nav.library', also: ['/document', '/propose'] },
  { path: '/governance', key: 'nav.governance', also: [] as string[] },
  { path: '/council', key: 'nav.council', also: [] as string[] },
  { path: '/treasury', key: 'nav.treasury', also: [] as string[] },
  { path: '/staking', key: 'nav.staking', also: [] as string[] },
  { path: '/create', key: 'nav.create', also: [] as string[] },
];

function LogoMenu() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative flex items-center gap-1" ref={ref}>
      <Link to="/" className="text-xl font-bold transition-colors hover:opacity-80">
        <span className="text-[var(--color-primary)]">Polka</span>Ink
      </Link>
      <button
        onClick={() => setOpen(!open)}
        className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
      >
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 shadow-xl z-50 animate-slide-down">
          {navItems.map(({ path, key }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-primary)] transition-colors"
            >
              {t(key)}
            </Link>
          ))}
          <div className="mx-3 my-1.5 border-t border-[var(--color-border)]" />
          <Link
            to="/polkaclaw"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[var(--color-surface-alt)] transition-colors"
          >
            <span className="text-[var(--color-text-secondary)]">{t('nav.about_team', 'About Team')}</span>
          </Link>
        </div>
      )}
    </div>
  );
}

function AgentSkillButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all duration-200"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
        {t('nav.agent_skill', 'Agent Skill')}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-lg animate-slide-down z-50">
          <h3 className="text-sm font-semibold mb-1.5">{t('agent.title')}</h3>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed mb-3">
            {t('agent.desc')}
          </p>
          <div className="flex gap-2">
            <a
              href="/polkaink_agent_skill.md"
              download="polkaink_agent_skill.md"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {t('agent.download')}
            </a>
            <a
              href="https://github.com/easyshellworld/polkaink/blob/main/skills/polkaink_agent_skill.md"
              target="_blank"
              rel="noopener"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-medium hover:bg-[var(--color-surface-alt)] transition-colors"
            >
              {t('agent.view_github')}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <LogoMenu />

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map(({ path, key, also }) => {
            const active = location.pathname === path
              || location.pathname.startsWith(path + '/')
              || also.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));
            return (
              <Link
                key={path}
                to={path}
                className={`relative px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                  active
                    ? 'text-[var(--color-primary)] bg-[var(--color-primary-10)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'
                }`}
              >
                {t(key)}
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--color-primary)]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <AgentSkillButton />
          <LanguageSwitcher />
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
