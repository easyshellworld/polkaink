import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDocument } from '../../hooks/useDocuments';
import { useVersion, useVersionHistory } from '../../hooks/useVersionStore';
import { useMarkdownContent } from '../../hooks/useMarkdownContent';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { shortenAddress, formatDate } from '../../lib/utils';
import { PAS_NETWORK } from '../../lib/contracts/addresses';
import { useDocCreationTx } from '../../hooks/useRealProposer';

const STATUS_MAP: Record<number, { label: string; variant: 'success' | 'neutral' | 'warning' }> = {
  0: { label: 'active', variant: 'success' },
  1: { label: 'archived', variant: 'neutral' },
  2: { label: 'disputed', variant: 'warning' },
};

export default function DocumentPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const docId = id ? Number(id) : undefined;

  const { data: doc, isLoading: docLoading } = useDocument(docId);
  const versionId = doc && Number(doc.currentVersionId) > 0 ? Number(doc.currentVersionId) : undefined;
  const { data: version } = useVersion(versionId);
  const { data: versionIds } = useVersionHistory(docId);
  const { data: markdown, isLoading: mdLoading } = useMarkdownContent(docId);
  const { data: creationTxHash } = useDocCreationTx(docId);

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

  const explorerUrl = creationTxHash
    ? `${PAS_NETWORK.explorer}/tx/${creationTxHash}`
    : `${PAS_NETWORK.explorer}/address/${doc.author}`;
  const statusInfo = STATUS_MAP[doc.status] ?? STATUS_MAP[0];
  const hasVersion = versionId !== undefined && versionId > 0;
  const versionCount = versionIds?.length ?? 0;

  return (
    <PageWrapper>
      <div className="mb-4 text-sm text-[var(--color-text-secondary)] animate-fade-in">
        <Link to="/library" className="hover:text-[var(--color-text)] transition-colors">
          {t('document.breadcrumb_library')}
        </Link>
        <span className="mx-2">/</span>
        <span>{doc.title}</span>
      </div>

      <Card padding="lg" className="mb-6 animate-slide-up">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{doc.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-secondary)]">
              <span>{t('document.author')}: {shortenAddress(doc.author)}</span>
              <span>·</span>
              <span>{t('document.created')}: {formatDate(doc.createdAt)}</span>
              {Number(doc.updatedAt) !== Number(doc.createdAt) && (
                <>
                  <span>·</span>
                  <span>{t('document.updated')}: {formatDate(doc.updatedAt)}</span>
                </>
              )}
            </div>
          </div>
          <Badge variant={statusInfo.variant} pill>
            {t(`status.${statusInfo.label}`)}
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
            href={explorerUrl}
            target="_blank"
            rel="noopener"
          >
            <Button variant="outline">{t('document.view_explorer')}</Button>
          </a>
        </div>
      </Card>

      {hasVersion && version && (
        <Card className="mb-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
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
              {versionCount}
            </div>
          </div>
          <div className="mt-2 text-xs text-[var(--color-text-secondary)] break-all">
            {t('document.content_hash')}: {version.contentHash}
          </div>
        </Card>
      )}

      {/* Markdown Content */}
      <Card padding="lg" className="animate-slide-up" style={{ animationDelay: '200ms' }}>
        {mdLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : markdown ? (
          <div className="markdown-body">
            {!hasVersion && (
              <div className="mb-4 rounded-lg bg-[var(--color-primary-10)] border border-[var(--color-primary-20)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                {t('document.pending_governance', 'This content is from a pending proposal and has not been merged through governance yet.')}
              </div>
            )}
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-center py-8 text-[var(--color-text-secondary)]">
            <p className="text-sm">{t('document.no_content', 'No content has been proposed for this document yet.')}</p>
            <Button
              variant="primary"
              className="mt-4"
              onClick={() => navigate(`/propose/${Number(doc.id)}`)}
            >
              {t('document.propose_first', 'Propose First Version')}
            </Button>
          </div>
        )}
      </Card>
    </PageWrapper>
  );
}
