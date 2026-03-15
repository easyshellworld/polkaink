import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDocuments } from '../../hooks/useDocuments';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { Pagination } from '../../components/ui/Pagination';
import { DocumentCard } from './DocumentCard';
import { FilterBar } from './FilterBar';

export default function LibraryPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const perPage = 10;
  const { data, isLoading } = useDocuments(0, 200);

  const allDocs = useMemo(() => data?.documents ?? [], [data]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allDocs.forEach((d) => d.tags.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [allDocs]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setPage(0);
  };

  const filtered = useMemo(() => {
    let docs = allDocs;
    if (search.trim()) {
      const q = search.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.tags.some((tag) => tag.toLowerCase().includes(q)) ||
          d.author.toLowerCase().includes(q)
      );
    }
    if (selectedTags.length > 0) {
      docs = docs.filter((d) => selectedTags.some((tag) => d.tags.includes(tag)));
    }
    if (sortBy === 'versions') {
      docs = [...docs].sort((a, b) => Number(b.currentVersionId) - Number(a.currentVersionId));
    }
    return docs;
  }, [allDocs, search, selectedTags, sortBy]);

  const total = filtered.length;
  const totalPages = Math.ceil(total / perPage);
  const documents = filtered.slice(page * perPage, (page + 1) * perPage);

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('library.title')}</h1>
      </div>

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
        sortBy={sortBy}
        onSortChange={(v) => { setSortBy(v); setPage(0); }}
      />

      <div className="flex items-center gap-3 mb-5">
        {allTags.length > 0 && (
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-all duration-200 ${
                selectedTags.length > 0
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary-10)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              {t('library.filter', 'Filter')}
              {selectedTags.length > 0 && (
                <span className="ml-1 rounded-full bg-[var(--color-primary)] text-white text-xs w-5 h-5 flex items-center justify-center">
                  {selectedTags.length}
                </span>
              )}
            </button>

            {filterOpen && (
              <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 shadow-xl z-50 animate-slide-down max-h-64 overflow-y-auto">
                {allTags.map((tag) => {
                  const checked = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-sm hover:bg-[var(--color-surface-alt)] transition-colors"
                    >
                      <span className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                        checked
                          ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                          : 'border-[var(--color-border)]'
                      }`}>
                        {checked && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </span>
                      {tag}
                    </button>
                  );
                })}
                {selectedTags.length > 0 && (
                  <>
                    <div className="mx-3 my-1.5 border-t border-[var(--color-border)]" />
                    <button
                      onClick={() => { setSelectedTags([]); setPage(0); }}
                      className="w-full px-4 py-2 text-xs text-[var(--color-primary)] hover:bg-[var(--color-surface-alt)] transition-colors text-left"
                    >
                      {t('library.clear_all', 'Clear all')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-10)] px-2.5 py-1 text-xs font-medium text-[var(--color-primary)]"
              >
                {tag}
                <button
                  onClick={() => toggleTag(tag)}
                  className="hover:text-[var(--color-primary-hover)] transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

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
