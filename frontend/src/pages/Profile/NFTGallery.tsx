import { useQuery } from '@tanstack/react-query';
import { readContract } from '../../lib/contracts';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';

interface NFTMetadata {
  tokenId: bigint;
  nftType: number;
  recipient: string;
  mintedAt: bigint;
  linkedProposalId: bigint;
  linkedDocId: bigint;
  linkedVersionId: bigint;
  termEnd: bigint;
  soulbound: boolean;
  active: boolean;
}

function useNFTs(address: string) {
  return useQuery({
    queryKey: ['nfts', address],
    queryFn: async () => {
      const [authorIds, guardianIds] = await Promise.all([
        readContract('NFTReward', 'getAuthorNFTs', [address as `0x${string}`]),
        readContract('NFTReward', 'getGuardianNFTs', [address as `0x${string}`]),
      ]);

      const authorTokenIds = authorIds as bigint[];
      const guardianTokenIds = guardianIds as bigint[];

      const allIds = [...authorTokenIds, ...guardianTokenIds];
      if (allIds.length === 0) return [];

      const metadataPromises = allIds.map((id) =>
        readContract('NFTReward', 'getNFTMetadata', [id])
      );
      const results = await Promise.all(metadataPromises);
      return results as NFTMetadata[];
    },
    staleTime: 60_000,
  });
}

export function NFTGallery({ address }: { address: string }) {
  const { data: nfts, isLoading } = useNFTs(address);

  if (isLoading) return <Skeleton count={2} className="mb-6" />;

  return (
    <Card className="mb-6">
      <h2 className="text-sm font-semibold mb-3">NFT Collection</h2>
      {!nfts || nfts.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">
          No NFTs found for this address.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {nfts.map((nft) => (
            <div
              key={Number(nft.tokenId)}
              className="rounded-lg border border-[var(--color-border)] p-3 text-center"
            >
              <div className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold text-white ${
                nft.nftType === 0
                  ? 'bg-[var(--color-primary)]'
                  : 'bg-[var(--color-secondary)]'
              }`}>
                ◎
              </div>
              <div className="text-xs font-semibold">
                {nft.nftType === 0 ? 'Historian' : 'Guardian'} #{Number(nft.tokenId)}
              </div>
              {nft.nftType === 0 && (
                <div className="text-xs text-[var(--color-text-secondary)]">
                  Doc #{Number(nft.linkedDocId)}
                </div>
              )}
              <div className="mt-1">
                {nft.soulbound && <Badge variant="primary" pill>Soulbound</Badge>}
                {nft.active && <Badge variant="success" pill>Active</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
