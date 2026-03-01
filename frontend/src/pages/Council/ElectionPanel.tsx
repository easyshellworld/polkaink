import { Card } from '../../components/ui/Card';

export function ElectionPanel() {
  return (
    <Card>
      <h2 className="text-sm font-semibold mb-3">Elections</h2>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Council election functionality will be available when an election is active.
      </p>
    </Card>
  );
}
