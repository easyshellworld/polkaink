import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useDocuments } from '../../hooks/useDocuments';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../lib/utils';

export function FeaturedDocuments() {
  const { t } = useTranslation();
  const { data } = useDocuments(0, 50);
  const allDocs = data?.documents ?? [];

  const documents = allDocs
    .filter((d) => Number(d.currentVersionId) > 0)
    .slice(0, 4);

  if (documents.length === 0) return null;

  return (
    <section className="mt-10 animate-fade-in" style={{ animationDelay: '500ms' }}>
      <h2 className="text-lg font-semibold mb-4">{t('home.featured')}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {documents.map((doc, i) => (
          <Link key={Number(doc.id)} to={`/document/${Number(doc.id)}`}>
            <Card className="hover:border-[var(--color-primary)] hover-lift transition-all duration-300 animate-slide-up" style={{ animationDelay: `${600 + i * 100}ms` }}>
              <h3 className="font-semibold mb-2">{doc.title}</h3>
              <div className="flex gap-2 mb-2 flex-wrap">
                {doc.tags.map((tag) => (
                  <Badge key={tag} variant="primary" pill>{tag}</Badge>
                ))}
              </div>
              <div className="text-xs text-[var(--color-text-secondary)]">
                {formatDate(doc.updatedAt)} · v{Number(doc.currentVersionId)}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
