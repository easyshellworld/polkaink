import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="py-16 text-center md:py-24">
      <div className="text-6xl mb-6">◎</div>
      <h1 className="mx-auto max-w-2xl text-3xl font-bold leading-tight md:text-5xl">
        {t('home.hero_title_1')}
        <br />
        <span className="text-[var(--color-primary)]">{t('home.hero_title_2')}</span>
      </h1>
      <p className="mx-auto mt-4 max-w-lg text-[var(--color-text-secondary)]">
        {t('home.hero_subtitle')}
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <Link to="/library">
          <Button variant="primary" size="lg">
            {t('home.cta_explore')}
          </Button>
        </Link>
        <Link to="/create">
          <Button variant="outline" size="lg">
            {t('home.cta_propose')}
          </Button>
        </Link>
      </div>
    </section>
  );
}
