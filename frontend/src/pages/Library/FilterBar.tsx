import { useTranslation } from 'react-i18next';

interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  sortBy: string;
  onSortChange: (v: string) => void;
}

export function FilterBar({ search, onSearchChange, sortBy, onSortChange }: FilterBarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
      <input
        type="text"
        placeholder={t('library.search_placeholder')}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm"
      />
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm"
      >
        <option value="latest">{t('library.sort_latest')}</option>
        <option value="versions">{t('library.sort_versions')}</option>
      </select>
    </div>
  );
}
