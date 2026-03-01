import { useState } from 'react';
import { PAS_NETWORK, getContractAddress } from '../../lib/contracts/addresses';

const DONATE_ADDRESSES = [
  { chain: 'Polkadot / BSC / EVM', address: '0x9D0aB09c181A9238816645811611b203A7934EE5' },
  { chain: 'Tron', address: 'TLb1pjrbNJZN7gdiywvqJ6dsxZWWATXgUV' },
  { chain: 'Solana', address: 'EvQr6ueXbV2j93YhoQJY2kxrT9zrT4tMjKoHjgDT6p7K' },
  { chain: 'Bitcoin', address: 'bc1qxyz2k42dnt7l887uqm3z2letruhkjskq2swafz' },
];

export function Footer() {
  const contractAddr = getContractAddress('PolkaInkRegistry');
  const [showDonate, setShowDonate] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (address: string) => {
    await navigator.clipboard.writeText(address);
    setCopied(address);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <footer className="border-t border-[var(--color-border)] mt-16">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg font-bold"><span className="text-[var(--color-primary)]">Polka</span>Ink</span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              On-chain Polkadot history preservation protocol. Immutable, community-governed, forever.
            </p>
            <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
              Built by{' '}
              <span className="font-semibold text-[var(--color-primary)]">PolkaClaw</span>
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Links</h4>
            <div className="flex flex-col gap-2 text-sm text-[var(--color-text-secondary)]">
              <a
                href="https://github.com/easyshellworld/polkaink"
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 hover:text-[var(--color-text)] transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                GitHub
              </a>
              <a
                href={PAS_NETWORK.explorer}
                target="_blank"
                rel="noopener"
                className="hover:text-[var(--color-text)] transition-colors"
              >
                Blockchain Explorer
              </a>
              <a
                href={`${PAS_NETWORK.explorer}/address/${contractAddr}`}
                target="_blank"
                rel="noopener"
                className="hover:text-[var(--color-text)] transition-colors"
              >
                Registry Contract
              </a>
              <a
                href="mailto:mjlnsn@gmail.com"
                className="hover:text-[var(--color-text)] transition-colors"
              >
                mjlnsn@gmail.com
              </a>
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Support the Project</h4>
            <button
              onClick={() => setShowDonate(!showDonate)}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] px-4 py-2 text-sm font-medium text-white transition-all duration-300 hover:shadow-lg hover:shadow-[var(--color-primary)]/25 hover:scale-105 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              Addresses
            </button>

            {showDonate && (
              <div className="mt-3 space-y-2 animate-fade-in">
                {DONATE_ADDRESSES.map(({ chain, address }) => (
                  <div
                    key={chain}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-2.5 text-xs"
                  >
                    <div className="font-medium text-[var(--color-text-secondary)] mb-1">{chain}</div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 break-all text-[var(--color-text)]">{address}</code>
                      <button
                        onClick={() => handleCopy(address)}
                        className="shrink-0 rounded-md px-2 py-1 text-[10px] font-medium bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors"
                      >
                        {copied === address ? '✓' : 'Copy'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--color-border)] text-center text-xs text-[var(--color-text-secondary)]">
          © 2026 PolkaInk · Built on{' '}
          <a href={PAS_NETWORK.explorer} target="_blank" rel="noopener" className="text-[var(--color-primary)] hover:underline">
            Polkadot Hub
          </a>
          {' '}· Powered by Calldata Storage · All content on-chain
        </div>
      </div>
    </footer>
  );
}
