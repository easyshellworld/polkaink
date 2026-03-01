import { Card } from '../../components/ui/Card';

export function ProposalHistory({ address: _address }: { address: string }) {
  return (
    <Card>
      <h2 className="text-sm font-semibold mb-3">Proposal History</h2>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Past proposals will be listed here once the indexer is connected.
      </p>
    </Card>
  );
}
