import { useTranslation } from 'react-i18next';

const STATUS_CONFIGS: Record<number, { key: string; color: string }> = {
  0: { key: 'governance.status_pending', color: 'bg-gray-500' },
  1: { key: 'governance.status_active', color: 'bg-blue-500' },
  2: { key: 'governance.status_passed', color: 'bg-green-500' },
  3: { key: 'governance.status_executed', color: 'bg-green-700' },
  4: { key: 'governance.status_rejected', color: 'bg-red-500' },
  5: { key: 'governance.status_cancelled', color: 'bg-yellow-600' },
  6: { key: 'governance.status_expired', color: 'bg-gray-400' },
};

export function StatusBadge({ status }: { status: number }) {
  const { t } = useTranslation();
  const config = STATUS_CONFIGS[status] ?? STATUS_CONFIGS[0];

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white ${config.color}`}
    >
      {t(config.key)}
    </span>
  );
}
