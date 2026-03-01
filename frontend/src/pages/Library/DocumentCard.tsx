import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { shortenAddress, formatDate } from '../../lib/utils';
import type { DocumentData } from '../../hooks/useDocuments';

const STATUS_VARIANTS: Record<number, 'success' | 'neutral' | 'error'> = {
  0: 'success',
  1: 'neutral',
  2: 'error',
};

export function DocumentCard({ doc }: { doc: DocumentData }) {
  const { t } = useTranslation();
  const hasVersion = Number(doc.currentVersionId) > 0;

  return (
    <Link to={`/document/${Number(doc.id)}`}>
      <Card hover className="hover-lift">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold">{doc.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
              <span>{t('library.by')} {shortenAddress(doc.author)}</span>
              {hasVersion && (
                <>
                  <span>·</span>
                  <span>{t('library.version')} #{Number(doc.currentVersionId)}</span>
                </>
              )}
              <span>·</span>
              <span>{formatDate(doc.updatedAt)}</span>
            </div>
            {doc.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {doc.tags.map((tag) => (
                  <Badge key={tag} variant="primary" pill>
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <Badge variant={STATUS_VARIANTS[doc.status] ?? 'neutral'} pill>
            {t(`status.${doc.status === 0 ? 'active' : doc.status === 1 ? 'archived' : 'disputed'}`)}
          </Badge>
        </div>
      </Card>
    </Link>
  );
}
