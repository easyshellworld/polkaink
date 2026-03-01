import { Card } from '../../components/ui/Card';

export function BalanceCard() {
  return (
    <Card padding="lg" className="mb-6 text-center">
      <div className="text-xs text-[var(--color-text-secondary)] mb-1">Treasury Balance</div>
      <div className="text-3xl font-bold">— PAS</div>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        Treasury balance will be loaded from the Treasury contract.
      </p>
    </Card>
  );
}
