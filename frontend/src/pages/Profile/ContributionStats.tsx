import { Card } from '../../components/ui/Card';

export function ContributionStats({ address: _address }: { address: string }) {
  return (
    <section className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4">
      {[
        { label: 'Proposals', value: '—' },
        { label: 'Approved', value: '—' },
        { label: 'DOT Earned', value: '—' },
        { label: 'NFTs', value: '—' },
      ].map((s) => (
        <Card key={s.label} className="text-center">
          <div className="text-xl font-bold">{s.value}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">{s.label}</div>
        </Card>
      ))}
    </section>
  );
}
