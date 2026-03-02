import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatEther } from 'viem';
import { readContract } from '../../lib/contracts';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { Skeleton } from '../../components/ui/Skeleton';
import { shortenAddress } from '../../lib/utils';

const SPEND_CATEGORIES = ['Reward', 'Operations', 'Council', 'Grant', 'Other'];

interface SpendRecord {
  id: bigint;
  category: number;
  recipient: string;
  amount: bigint;
  description: string;
  proposalId: bigint;
  executedAt: bigint;
  executed: boolean;
}

export function SpendHistory() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const perPage = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['spendHistory', page],
    queryFn: async () => {
      const result = await readContract('Treasury', 'listSpendRecords', [
        BigInt(page * perPage), BigInt(perPage),
      ]);
      const [records, total] = result as [SpendRecord[], bigint];
      return { records, total: Number(total) };
    },
    staleTime: 30_000,
  });

  const records = data?.records ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / perPage);

  return (
    <Card>
      <h2 className="text-sm font-semibold mb-4">{t('treasury.spend_history')}</h2>

      {isLoading ? (
        <Skeleton count={3} />
      ) : records.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">{t('treasury.no_records')}</p>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <div
              key={Number(r.id)}
              className="flex items-center justify-between rounded-lg bg-[var(--color-surface-alt)] p-3"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="neutral" pill>
                    {SPEND_CATEGORIES[r.category] ?? 'Unknown'}
                  </Badge>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    #{Number(r.id)}
                  </span>
                </div>
                <div className="text-sm">{r.description}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">
                  {t('treasury.to')}: {shortenAddress(r.recipient)}
                  {Number(r.proposalId) > 0 && ` · Proposal #${Number(r.proposalId)}`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{formatEther(r.amount)} PAS</div>
                {r.executed && (
                  <div className="text-xs text-[var(--color-success)]">
                    {new Date(Number(r.executedAt) * 1000).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </Card>
  );
}
