import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { shortenAddress, formatDate } from '../../lib/utils';

interface DocSidebarProps {
  author: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

export function DocSidebar({ author, version, createdAt, updatedAt, tags }: DocSidebarProps) {
  const { t } = useTranslation();

  return (
    <aside className="space-y-4">
      <Card>
        <h3 className="text-sm font-semibold mb-3">{t('document.info')}</h3>
        <dl className="text-sm space-y-2">
          <div className="flex justify-between">
            <dt className="text-[var(--color-text-secondary)]">Version</dt>
            <dd className="font-medium">v{version}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--color-text-secondary)]">Author</dt>
            <dd className="font-medium">{shortenAddress(author)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--color-text-secondary)]">Created</dt>
            <dd>{formatDate(createdAt)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--color-text-secondary)]">Updated</dt>
            <dd>{formatDate(updatedAt)}</dd>
          </div>
        </dl>
      </Card>

      {tags.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold mb-2">Tags</h3>
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="primary">{tag}</Badge>
            ))}
          </div>
        </Card>
      )}
    </aside>
  );
}
