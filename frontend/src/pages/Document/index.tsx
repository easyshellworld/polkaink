import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDocument } from '../../hooks/useDocuments';
import { useVersion, useVersionHistory } from '../../hooks/useVersionStore';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { shortenAddress, formatDate } from '../../lib/utils';
import { PAS_NETWORK, getContractAddress } from '../../lib/contracts/addresses';

export default function DocumentPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const docId = id ? Number(id) : undefined;

  const { data: doc, isLoading: docLoading } = useDocument(docId);
  const versionId = doc ? Number(doc.currentVersionId) : undefined;
  const { data: version } = useVersion(versionId);
  const { data: versionIds } = useVersionHistory(docId);

  if (docLoading) {
    return (
      <PageWrapper>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40 mt-4" />
        <Skeleton className="h-64 mt-4" />
      </PageWrapper>
    );
  }

  if (!doc) {
    return (
      <PageWrapper className="text-center py-16">
        <h2 className="text-lg font-semibold">{t('document.not_found')}</h2>
        <Link to="/library" className="mt-4 inline-block text-[var(--color-primary)] hover:underline">
          {t('document.back_library')}
        </Link>
      </PageWrapper>
    );
  }

  const contractAddr = getContractAddress('PolkaInk');

  return (
    <PageWrapper>
      <div className="mb-4 text-sm text-[var(--color-text-secondary)]">
        <Link to="/library" className="hover:text-[var(--color-text)]">
          {t('document.breadcrumb_library')}
        </Link>
        <span className="mx-2">/</span>
        <span>{doc.title}</span>
      </div>

      <Card padding="lg" className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{doc.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-secondary)]">
              <span>{t('document.author')}: {shortenAddress(doc.author)}</span>
              <span>·</span>
              <span>{t('document.created')}: {formatDate(doc.createdAt)}</span>
              <span>·</span>
              <span>{t('document.updated')}: {formatDate(doc.updatedAt)}</span>
            </div>
          </div>
          <Badge
            variant={doc.status === 0 ? 'success' : 'neutral'}
            pill
          >
            {t(`status.${doc.status === 0 ? 'active' : doc.status === 1 ? 'archived' : 'disputed'}`)}
          </Badge>
        </div>

        {doc.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {doc.tags.map((tag) => (
              <Badge key={tag} variant="primary" pill>{tag}</Badge>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <Button onClick={() => navigate(`/propose/${Number(doc.id)}`)}>
            {t('document.propose_update')}
          </Button>
          <a
            href={`${PAS_NETWORK.explorer}/address/${contractAddr}`}
            target="_blank"
            rel="noopener"
          >
            <Button variant="outline">{t('document.view_explorer')}</Button>
          </a>
        </div>
      </Card>

      {version && (
        <Card className="mb-6">
          <h2 className="text-sm font-semibold mb-2">{t('document.version_info')}</h2>
          <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <div>
              <span className="text-[var(--color-text-secondary)]">{t('document.version_id')}:</span>{' '}
              #{Number(version.id)}
            </div>
            <div>
              <span className="text-[var(--color-text-secondary)]">{t('document.block')}:</span>{' '}
              {Number(version.blockNumber)}
            </div>
            <div>
              <span className="text-[var(--color-text-secondary)]">{t('document.size')}:</span>{' '}
              {version.contentLength} bytes
            </div>
            <div>
              <span className="text-[var(--color-text-secondary)]">{t('document.versions')}:</span>{' '}
              {versionIds?.length ?? 0}
            </div>
          </div>
          <div className="mt-2 text-xs text-[var(--color-text-secondary)] break-all">
            {t('document.content_hash')}: {version.contentHash}
          </div>
        </Card>
      )}

      <Card padding="lg">
        <div className="markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {`> **Note:** ${t('document.calldata_note', { block: version ? Number(version.blockNumber) : '?' })}

${t('document.version_count', { count: versionIds?.length ?? 0 })}

Content hash: \`${version?.contentHash || 'loading...'}\``}
          </ReactMarkdown>
        </div>
      </Card>
    </PageWrapper>
  );
}
