import { Card } from '../../components/ui/Card';

export function PendingReview() {
  return (
    <Card className="mb-6">
      <h2 className="text-sm font-semibold mb-3">Pending Review</h2>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Proposals in Timelock awaiting council review will appear here.
      </p>
    </Card>
  );
}
