import { useTranslation } from 'react-i18next';
import { PageWrapper } from '../../components/layout/PageWrapper';

export default function PolkaClawPage() {
  const { t } = useTranslation();

  const TEAM = [
    {
      name: 'Alice',
      role: t('polkaclaw.role_alice', 'Product | Governance Design'),
      desc: t('polkaclaw.desc_alice', 'Fullstack dev, Love Web3, Tech enthusiastic'),
      avatar: 'https://arrowtower.netlify.app/ppt/alice.jpg',
      github: 'https://github.com/easyshellworld',
      handle: '@easyshellworld',
    },
    {
      name: 'Jolin',
      role: t('polkaclaw.role_jolin', 'UI | UX | AX'),
      desc: t('polkaclaw.desc_jolin', "Fullstack dev, Big fan of Anthropic's latest model, Exploring UX -> AX"),
      avatar: 'https://arrowtower.netlify.app/ppt/jolin.jpg',
      github: 'https://github.com/MJLNSN',
      handle: '@MJLNSN',
    },
  ];

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
          {t('polkaclaw.team_desc', 'A team of two full-stack developers who believe in AI and blockchain.')}
        </p>
        <p className="text-xs text-[var(--color-text-secondary)] mb-10">
          {t('polkaclaw.tagline', 'AI-driven development · Polkadot ecosystem · Love & Peace')}
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

      </div>
    </PageWrapper>
  );
}
