import { useQuery } from '@tanstack/react-query';
import { readContract } from '../../lib/contracts';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';

interface NFTMetadata {
  tokenId: bigint;
  nftType: number;
  holder: string;
  mintedAt: bigint;
  lockEnd: bigint;
  linkedDocId: bigint;
  linkedProposalId: bigint;
  active: boolean;
}

const NFT_TYPE_CONFIG: Record<number, { label: string; color: string; icon: string }> = {
  0: { label: 'Member', color: 'bg-blue-500', icon: '◈' },
  1: { label: 'Creator', color: 'bg-[var(--color-primary)]', icon: '◎' },
  2: { label: 'Guardian', color: 'bg-amber-500', icon: '⬡' },
};

function useNFTs(address: string) {
  return useQuery({
    queryKey: ['nfts', address],
    queryFn: async () => {
      const [memberIds, creatorIds, guardianIds] = await Promise.all([
        readContract('NFTReward', 'getNFTsByType', [address as `0x${string}`, 0]),
        readContract('NFTReward', 'getNFTsByType', [address as `0x${string}`, 1]),
        readContract('NFTReward', 'getNFTsByType', [address as `0x${string}`, 2]),
      ]);

      const allIds = [
        ...(memberIds as bigint[]),
        ...(creatorIds as bigint[]),
        ...(guardianIds as bigint[]),
      ];

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
          {nfts.map((nft) => {
            const type = NFT_TYPE_CONFIG[nft.nftType] ?? NFT_TYPE_CONFIG[1];
            return (
              <div
                key={Number(nft.tokenId)}
                className="rounded-lg border border-[var(--color-border)] p-3 text-center"
              >
                <div className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold text-white ${type.color}`}>
                  {type.icon}
                </div>
                <div className="text-xs font-semibold">
                  {type.label} #{Number(nft.tokenId)}
                </div>
                {nft.nftType === 1 && Number(nft.linkedDocId) > 0 && (
                  <div className="text-xs text-[var(--color-text-secondary)]">
                    Doc #{Number(nft.linkedDocId)}
                  </div>
                )}
                <div className="mt-1">
                  <Badge variant={nft.active ? 'success' : 'neutral'} pill>{nft.active ? 'Active' : 'Inactive'}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
