import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDocument } from '../../hooks/useDocuments';
import { useVersion, useVersionHistory, type VersionData } from '../../hooks/useVersionStore';
import { useMarkdownContent, useProposalMarkdown, useVersionMarkdown } from '../../hooks/useMarkdownContent';
import { useProposal } from '../../hooks/useProposals';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { shortenAddress, formatDate } from '../../lib/utils';
import { PAS_NETWORK } from '../../lib/contracts/addresses';
import { readContract } from '../../lib/contracts';
import { useDocCreationTx, useVersionTx } from '../../hooks/useRealProposer';
import { VersionTree } from './VersionTree';
import { DiffViewer } from './DiffViewer';
import { StatusBadge } from '../../components/governance/StatusBadge';

const STATUS_MAP: Record<number, { label: string; variant: 'success' | 'neutral' | 'warning' | 'error' }> = {
  0: { label: 'active', variant: 'success' },
  1: { label: 'frozen', variant: 'warning' },
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
  const { data: fallbackMarkdown, isLoading: fallbackLoading } = useMarkdownContent(docId);
  const { data: creationTxHash } = useDocCreationTx(docId);

  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const normalizedIds = useMemo(
    () => (versionIds ?? []).map((x) => Number(x)).filter((x) => x > 0),
    [versionIds]
  );
  const currentVersionIdNumber = doc && Number(doc.currentVersionId) > 0 ? Number(doc.currentVersionId) : undefined;
  const visibleVersionIds = useMemo(() => {
    if (!currentVersionIdNumber) {
      return normalizedIds;
    }
    const merged = normalizedIds.filter((id) => id <= currentVersionIdNumber);
    return merged.length ? merged : normalizedIds;
  }, [normalizedIds, currentVersionIdNumber]);

  useEffect(() => {
    if (!visibleVersionIds.length) {
      setSelectedVersionId(null);
      return;
    }

    const current = versionId ?? visibleVersionIds[visibleVersionIds.length - 1];
    setSelectedVersionId((prev) => {
      if (prev && visibleVersionIds.includes(prev)) return prev;
      return current;
    });
  }, [visibleVersionIds, versionId]);

  const { data: versionDetails } = useQuery({
    queryKey: ['documentVersionDetails', docId, visibleVersionIds.join(',')],
    queryFn: async () => {
      const raws = await Promise.all(
        visibleVersionIds.map((vid) => readContract('VersionStore', 'getVersion', [BigInt(vid)]))
      );
      return raws as VersionData[];
    },
    enabled: visibleVersionIds.length > 0,
    staleTime: 60_000,
  });

  const selectedVersionBigInt = selectedVersionId ? BigInt(selectedVersionId) : undefined;
  const { data: selectedMarkdown, isLoading: selectedMdLoading } = useVersionMarkdown(selectedVersionBigInt);

  const selectedVersionMeta = useMemo(
    () => versionDetails?.find((item) => Number(item.versionId) === selectedVersionId),
    [versionDetails, selectedVersionId]
  );
  const { data: selectedVersionTxHash } = useVersionTx(
    selectedVersionId ?? undefined,
    selectedVersionMeta?.txBlock
  );

  const diffBaseId = selectedVersionMeta && Number(selectedVersionMeta.parentVersionId) > 0
    ? Number(selectedVersionMeta.parentVersionId)
    : null;

  const diffBaseBigInt = diffBaseId ? BigInt(diffBaseId) : undefined;
  const { data: diffBaseMarkdown, isLoading: diffBaseLoading } = useVersionMarkdown(diffBaseBigInt);

  const currentVersionId = selectedVersionId ?? versionId ?? null;
  const hasVersion = currentVersionId !== null;
  const versionCount = visibleVersionIds.length;
  const pendingProposalId = doc && Number(doc.latestProposalId) > 0 ? Number(doc.latestProposalId) : undefined;
  const { data: pendingProposal } = useProposal(pendingProposalId);
  const { data: pendingProposalMarkdown, isLoading: pendingMdLoading } = useProposalMarkdown(pendingProposal?.targetVersionId);

  const builtVersionNodes = useMemo(() => {
    if (!versionDetails) return [];
    return [...versionDetails]
      .sort((a, b) => Number(b.versionId) - Number(a.versionId))
      .map((v) => ({
        id: Number(v.versionId),
        parentId: Number(v.parentVersionId) > 0 ? Number(v.parentVersionId) : null,
        author: shortenAddress(v.author),
        timestamp: Number(v.timestamp),
        isCurrent: Number(v.versionId) === Number(doc?.currentVersionId ?? 0n),
        proposalId: Number(v.proposalId) > 0 ? Number(v.proposalId) : undefined,
        contentHash: v.contentHash,
      }));
  }, [versionDetails, doc?.currentVersionId]);

  const renderMarkdown = selectedMarkdown ?? fallbackMarkdown;

  if (docLoading) {
    return (
      <PageWrapper>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-4 w-40" />
        <Skeleton className="mt-4 h-64" />
      </PageWrapper>
    );
  }

  if (!doc) {
    return (
      <PageWrapper className="py-16 text-center">
        <h2 className="text-lg font-semibold">{t('document.not_found')}</h2>
        <Link to="/library" className="mt-4 inline-block text-[var(--color-primary)] hover:underline">
          {t('document.back_library')}
        </Link>
      </PageWrapper>
    );
  }

  const explorerUrl = selectedVersionTxHash
    ? `${PAS_NETWORK.explorer}/tx/${selectedVersionTxHash}`
    : creationTxHash
    ? `${PAS_NETWORK.explorer}/tx/${creationTxHash}`
    : `${PAS_NETWORK.explorer}/address/${doc.author}`;
  const statusInfo = STATUS_MAP[doc.status] ?? STATUS_MAP[0];
  const isSeedV1 = doc.isSeed && Number(doc.currentVersionId) <= 1;
  const loadingMarkdown = selectedMdLoading || fallbackLoading || diffBaseLoading;

  return (
    <PageWrapper>
      <div className="mb-4 animate-fade-in text-sm text-[var(--color-text-secondary)]">
        <Link to="/library" className="transition-colors hover:text-[var(--color-text)]">
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
          <a href={explorerUrl} target="_blank" rel="noopener">
            <Button variant="outline">{t('document.view_explorer')}</Button>
          </a>
        </div>
      </Card>

      {hasVersion && version && (
        <Card className="mb-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h2 className="mb-2 text-sm font-semibold">{t('document.version_info')}</h2>
          <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <div>
              <span className="text-[var(--color-text-secondary)]">{t('document.version_id')}:</span>{' '}
              #{selectedVersionId ?? Number(version.id)}
            </div>
            <div>
              <span className="text-[var(--color-text-secondary)]">{t('document.block')}:</span>{' '}
              {selectedVersionMeta ? Number(selectedVersionMeta.txBlock) : Number(version.blockNumber)}
            </div>
            <div>
              <span className="text-[var(--color-text-secondary)]">{t('document.size')}:</span>{' '}
              {selectedVersionMeta ? Number(selectedVersionMeta.contentLength) : version.contentLength} {t('document.bytes', 'bytes')}
            </div>
            <div>
              <span className="text-[var(--color-text-secondary)]">{t('document.versions')}:</span>{' '}
              {versionCount}
            </div>
          </div>
          <div className="mt-2 break-all text-xs text-[var(--color-text-secondary)]">
            {t('document.content_hash')}: {selectedVersionMeta?.contentHash ?? version.contentHash}
          </div>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <Card padding="lg" className="animate-slide-up" style={{ animationDelay: '200ms' }}>
          {loadingMarkdown ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : showDiff && diffBaseId ? (
            <DiffViewer
              oldContent={diffBaseMarkdown ?? ''}
              newContent={renderMarkdown ?? ''}
              oldLabel={`v${diffBaseId}`}
              newLabel={`v${currentVersionId ?? 'N/A'}`}
            />
          ) : renderMarkdown ? (
            <div className="markdown-body">
              {!hasVersion && (
                <div className="mb-4 rounded-lg border border-[var(--color-primary-20)] bg-[var(--color-primary-10)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                  {t('document.pending_governance', 'This content is from a pending proposal and has not been merged through governance yet.')}
                </div>
              )}
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{renderMarkdown}</ReactMarkdown>
            </div>
          ) : isSeedV1 ? (
            <div className="py-8 text-center text-[var(--color-text-secondary)]">
              <p className="text-sm">{t('document.seed_empty_title', 'Seed Document - Awaiting Content')}</p>
              <p className="mt-1 text-xs">{t('document.seed_empty_desc', 'This seed document starts with an empty v1 and awaits community proposals.')}</p>
              <Button
                variant="primary"
                className="mt-4"
                onClick={() => navigate(`/propose/${Number(doc.id)}`)}
              >
                {t('document.propose_first', 'Propose First Version')}
              </Button>
            </div>
          ) : (
            <div className="py-8 text-center text-[var(--color-text-secondary)]">
              <p className="text-sm">{t('document.no_content', 'No content has been proposed for this document yet.')}</p>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card padding="lg" className="h-fit animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">{t('document.pending_proposal_title', 'Pending Proposal')}</h3>
              {pendingProposal && pendingProposalId ? (
                <Link
                  to={`/governance/${pendingProposalId}`}
                  className="text-xs text-[var(--color-primary)] hover:underline"
                >
                  {t('document.view_proposal', 'View Proposal')}
                </Link>
              ) : (
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {t('document.pending_proposal_none_small', 'No proposal')}
                </span>
              )}
            </div>
            {pendingProposal ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                  <StatusBadge status={Number(pendingProposal.status)} />
                  <span>#{Number(pendingProposal.id)}</span>
                  <span>·</span>
                  <span>
                    {t('document.status', 'Status')}:{' '}
                    {t(
                      `governance.status_${
                        ['active', 'passed', 'vetoed', 'rejected', 'executed', 'cancelled'][pendingProposal.status] ?? 'active'
                      }`
                    )}
                  </span>
                </div>
                {pendingMdLoading ? (
                  <Skeleton className="h-20" />
                ) : pendingProposalMarkdown ? (
                  <div className="markdown-body max-h-56 overflow-y-auto text-xs">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{pendingProposalMarkdown}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {t('document.pending_proposal_no_content', 'No content is available for this proposal yet.')}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 text-[var(--color-text-secondary)] text-xs">
                  <span>
                    {t('document.voting_ends', 'Voting ends')}:{' '}
                    {pendingProposal ? formatDate(Number(pendingProposal.endTime) * 1000) : '—'}
                  </span>
                  {pendingProposal?.councilWindowEnd && (
                    <span>
                      · {t('document.council_window', 'Council window ends')}:{' '}
                      {formatDate(Number(pendingProposal.councilWindowEnd) * 1000)}
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => pendingProposalId && window.location.assign(`/governance/${pendingProposalId}`)}
                >
                  {t('document.open_proposal', 'Open Proposal')}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)]">
                {t('document.pending_proposal_none', 'No pending proposal for this document.')}
              </p>
            )}
          </Card>
          <Card className="h-fit animate-slide-up" style={{ animationDelay: '220ms' }}>
            <VersionTree
              versions={builtVersionNodes}
              selectedId={currentVersionId}
              onSelect={(vid) => setSelectedVersionId(vid)}
            />
            {diffBaseId && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => setShowDiff((prev) => !prev)}
              >
                {showDiff ? t('document.view_content', 'View Content') : t('document.view_diff', 'View Diff')}
              </Button>
            )}
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
