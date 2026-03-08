import { PageWrapper } from '../../components/layout/PageWrapper';

const TEAM = [
  {
    name: 'Alice',
    role: 'Product / Governance Design',
    desc: 'Fullstack dev, Love Web3, Tech enthusiastic',
    avatar: 'https://arrowtower.netlify.app/ppt/alice.jpg',
    github: 'https://github.com/easyshellworld',
    handle: '@easyshellworld',
  },
  {
    name: 'Jolin',
    role: 'Smart Contract / Frontend',
    desc: 'Fullstack dev, Big fan of Anthropic\'s latest model, Exploring UX -> AX',
    avatar: 'https://arrowtower.netlify.app/ppt/jolin.jpg',
    github: 'https://github.com/MJLNSN',
    handle: '@MJLNSN',
  },
];

export default function PolkaClawPage() {
  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto text-center py-8 animate-fade-in">
        <img
          src="/polkaclaw.png"
          alt="PolkaClaw"
          className="mx-auto h-28 w-28 rounded-2xl mb-6 shadow-xl shadow-[var(--color-primary)]/10"
        />
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-[var(--color-primary)]">Polka</span>Claw
        </h1>
        <p className="text-[var(--color-text-secondary)] mb-1 text-sm">
          A team of two full-stack developers who believe in AI and blockchain.
        </p>
        <p className="text-xs text-[var(--color-text-secondary)] mb-10">
          AI-driven development · Polkadot ecosystem · Love & Peace
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          {TEAM.map((m) => (
            <a
              key={m.handle}
              href={m.github}
              target="_blank"
              rel="noopener"
              className="group block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center transition-all duration-300 hover:border-[var(--color-primary)] hover:shadow-lg hover:shadow-[var(--color-primary)]/8 hover:-translate-y-1"
            >
              <img
                src={m.avatar}
                alt={m.name}
                className="mx-auto h-24 w-24 rounded-full border-4 border-[var(--color-border)] group-hover:border-[var(--color-primary)] transition-colors mb-4 object-cover"
              />
              <h3 className="text-lg font-bold group-hover:text-[var(--color-primary)] transition-colors">{m.name}</h3>
              <p className="text-xs text-[var(--color-primary)] font-mono mb-2">{m.handle}</p>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">{m.role}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{m.desc}</p>
            </a>
          ))}
        </div>

        <div className="mt-12 rounded-xl bg-[var(--color-surface-alt)] p-6 text-sm text-[var(--color-text-secondary)]">
          <p className="mb-2">PolkaClaw — PolkaInk 的创始团队</p>
          <p>基于 Polkadot Hub · DAO 治理 · 永久存储</p>
          <div className="flex justify-center gap-4 mt-4">
            <a
              href="https://github.com/easyshellworld/polkaink"
              target="_blank"
              rel="noopener"
              className="text-[var(--color-primary)] hover:underline text-xs"
            >
              GitHub Repo
            </a>
            <a
              href="/ppt.html"
              target="_blank"
              rel="noopener"
              className="text-[var(--color-primary)] hover:underline text-xs"
            >
              Pitch Deck
            </a>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
