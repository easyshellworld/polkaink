import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../../hooks/useWallet';
import { shortenAddress } from '../../lib/utils';

export function ConnectButton() {
  const { t } = useTranslation();
  const { address, balance, isConnecting, connect, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!address) {
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full bg-[var(--color-surface-alt)] pl-3 pr-2 py-1.5 text-sm font-medium hover:bg-[var(--color-border)] transition-colors"
      >
        <span className="hidden text-xs text-[var(--color-text-secondary)] sm:inline">
          {parseFloat(balance).toFixed(2)} PAS
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-surface)] px-2.5 py-0.5 border border-[var(--color-border)]">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          {shortenAddress(address)}
        </span>
        <svg className={`w-3.5 h-3.5 text-[var(--color-text-secondary)] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-1.5 shadow-lg z-50 animate-slide-down">
          <Link
            to={`/profile/${address}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[var(--color-surface-alt)] transition-colors"
          >
            <svg className="w-4 h-4 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            {t('nav.profile')}
          </Link>
          <div className="mx-3 my-1 border-t border-[var(--color-border)]" />
          <button
            onClick={() => { disconnect(); setOpen(false); }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-error)] hover:bg-[var(--color-surface-alt)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            {t('nav.disconnect')}
          </button>
        </div>
      )}
    </div>
  );
}
