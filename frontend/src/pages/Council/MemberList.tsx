import { Card } from '../../components/ui/Card';

export function MemberList() {
  return (
    <Card className="mb-6">
      <h2 className="text-sm font-semibold mb-3">Current Members</h2>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Council member data will be loaded from the ArchiveCouncil contract.
      </p>
    </Card>
  );
}
