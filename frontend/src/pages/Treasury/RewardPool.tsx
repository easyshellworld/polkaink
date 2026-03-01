import { Card } from '../../components/ui/Card';

export function RewardPool() {
  return (
    <Card className="mb-6">
      <h2 className="text-sm font-semibold mb-3">Reward Pool</h2>
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <div className="text-lg font-bold">—</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Total Income</div>
        </div>
        <div>
          <div className="text-lg font-bold">—</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Total Spent</div>
        </div>
      </div>
    </Card>
  );
}
