import { useTranslation } from 'react-i18next';

const STATUS_CONFIGS: Record<number, { key: string; bg: string; text: string }> = {
  0: { key: 'governance.status_pending', bg: 'bg-gray-100', text: 'text-gray-600' },
  1: { key: 'governance.status_active', bg: 'bg-[var(--color-primary-10)]', text: 'text-[var(--color-primary)]' },
  2: { key: 'governance.status_passed', bg: 'bg-green-50', text: 'text-green-600' },
  3: { key: 'governance.status_queued', bg: 'bg-amber-50', text: 'text-amber-600' },
  4: { key: 'governance.status_executed', bg: 'bg-green-100', text: 'text-green-700' },
  5: { key: 'governance.status_rejected', bg: 'bg-red-50', text: 'text-red-600' },
  6: { key: 'governance.status_vetoed', bg: 'bg-red-100', text: 'text-red-700' },
  7: { key: 'governance.status_cancelled', bg: 'bg-gray-100', text: 'text-gray-500' },
  8: { key: 'governance.status_expired', bg: 'bg-gray-100', text: 'text-gray-500' },
};

export function StatusBadge({ status }: { status: number }) {
  const { t } = useTranslation();
  const config = STATUS_CONFIGS[status] ?? STATUS_CONFIGS[0];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.bg} ${config.text}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {t(config.key)}
    </span>
  );
}
