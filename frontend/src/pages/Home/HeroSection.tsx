import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="relative py-16 text-center md:py-24 overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[var(--color-primary)] opacity-[0.04] blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-[var(--color-secondary)] opacity-[0.04] blur-3xl" />
      </div>

      <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight md:text-6xl animate-slide-up">
        {t('home.hero_title_1')}
        <br />
        <span className="gradient-text">{t('home.hero_title_2')}</span>
      </h1>
      <p className="mx-auto mt-4 max-w-lg text-[var(--color-text-secondary)] animate-slide-up" style={{ animationDelay: '100ms' }}>
        {t('home.hero_subtitle')}
      </p>
      <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--color-text-secondary)] opacity-80 animate-slide-up" style={{ animationDelay: '150ms' }}>
        {t('home.hero_desc')}
      </p>
      <div className="mt-8 flex justify-center gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
        <Link to="/create">
          <Button variant="primary" size="lg" className="hover-lift hover-glow">
            {t('home.cta_propose')}
          </Button>
        </Link>
        <Link to="/library">
          <Button variant="outline" size="lg" className="hover-lift">
            {t('home.cta_explore')}
          </Button>
        </Link>
      </div>
    </section>
  );
}
