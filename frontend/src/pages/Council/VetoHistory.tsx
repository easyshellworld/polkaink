import { Card } from '../../components/ui/Card';

export function VetoHistory() {
  return (
    <Card>
      <h2 className="text-sm font-semibold mb-3">Veto History</h2>
      <p className="text-sm text-[var(--color-text-secondary)]">
        All veto records are on-chain and will be displayed here.
      </p>
    </Card>
  );
}
