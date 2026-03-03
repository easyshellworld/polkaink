import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDocuments } from '../../hooks/useDocuments';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { Pagination } from '../../components/ui/Pagination';
import { DocumentCard } from './DocumentCard';

export default function LibraryPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const perPage = 10;
  const { data, isLoading } = useDocuments(0, 200);

  const allDocs = useMemo(() => data?.documents ?? [], [data]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allDocs.forEach((d) => d.tags.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [allDocs]);

  const filtered = selectedTag
    ? allDocs.filter((d) => d.tags.includes(selectedTag))
    : allDocs;

  const total = filtered.length;
  const totalPages = Math.ceil(total / perPage);
  const documents = filtered.slice(page * perPage, (page + 1) * perPage);

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('library.title')}</h1>
        <Link to="/create">
          <Button variant="primary" size="md">
            {t('library.new_doc')}
          </Button>
        </Link>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => { setSelectedTag(null); setPage(0); }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              !selectedTag
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => { setSelectedTag(tag); setPage(0); }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                selectedTag === tag
                  ? 'bg-[var(--color-primary)] text-white shadow-sm'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <Skeleton count={3} />
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
          <div className="text-3xl mb-3 opacity-30">◎</div>
          <h2 className="text-lg font-semibold mb-2">{t('library.empty_title')}</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">{t('library.empty_desc')}</p>
          <Link to="/create">
            <Button variant="primary">{t('library.empty_cta')}</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {documents.map((doc) => (
              <DocumentCard key={Number(doc.id)} doc={doc} />
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </PageWrapper>
  );
}
