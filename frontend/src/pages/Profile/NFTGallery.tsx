import { Card } from '../../components/ui/Card';

export function NFTGallery({ address: _address }: { address: string }) {
  return (
    <Card className="mb-6">
      <h2 className="text-sm font-semibold mb-3">NFT Collection</h2>
      <p className="text-sm text-[var(--color-text-secondary)]">
        NFT gallery will display Author and Guardian NFTs once the indexer is connected.
      </p>
    </Card>
  );
}
