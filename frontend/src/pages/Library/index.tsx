import { useState } from 'react';
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
  const perPage = 10;
  const { data, isLoading } = useDocuments(page, perPage);

  const documents = data?.documents ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / perPage);

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

      {isLoading ? (
        <Skeleton count={3} />
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
          <div className="text-4xl mb-4">📜</div>
          <h2 className="text-lg font-semibold mb-2">{t('library.empty_title')}</h2>
          <p className="text-[var(--color-text-secondary)] mb-4">{t('library.empty_desc')}</p>
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
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </PageWrapper>
  );
}
