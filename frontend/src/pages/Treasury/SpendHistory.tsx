import { Card } from '../../components/ui/Card';

export function SpendHistory() {
  return (
    <Card>
      <h2 className="text-sm font-semibold mb-3">Spend History</h2>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Treasury spend records will be displayed here.
      </p>
    </Card>
  );
}
