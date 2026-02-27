import { useTranslation } from 'react-i18next';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(Math.max(0, page - 1))}
        disabled={page === 0}
        className="rounded px-3 py-1 text-sm disabled:opacity-30 hover:bg-[var(--color-surface-alt)]"
      >
        {t('library.prev')}
      </button>
      <span className="text-sm text-[var(--color-text-secondary)]">
        {t('library.page', { current: page + 1, total: totalPages })}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
        disabled={page >= totalPages - 1}
        className="rounded px-3 py-1 text-sm disabled:opacity-30 hover:bg-[var(--color-surface-alt)]"
      >
        {t('library.next')}
      </button>
    </div>
  );
}
