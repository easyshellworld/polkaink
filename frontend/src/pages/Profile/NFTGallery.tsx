import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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

const NFT_TYPE_CONFIG: Record<number, { labelKey: string; labelDefault: string; color: string; icon: string }> = {
  0: { labelKey: 'profile.nft_member', labelDefault: 'Member', color: 'bg-blue-500', icon: '◈' },
  1: { labelKey: 'profile.nft_creator', labelDefault: 'Creator', color: 'bg-[var(--color-primary)]', icon: '◎' },
  2: { labelKey: 'profile.nft_guardian', labelDefault: 'Guardian', color: 'bg-amber-500', icon: '⬡' },
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
  const { t } = useTranslation();
  const { data: nfts, isLoading } = useNFTs(address);

  if (isLoading) return <Skeleton count={2} className="mb-6" />;

  return (
    <Card className="mb-6">
      <h2 className="text-sm font-semibold mb-3">{t('profile.nft_collection', 'NFT Collection')}</h2>
      {!nfts || nfts.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">
          {t('profile.no_nfts', 'No NFTs found for this address.')}
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
                  {t(type.labelKey, type.labelDefault)} #{Number(nft.tokenId)}
                </div>
                {nft.nftType === 1 && Number(nft.linkedDocId) > 0 && (
                  <div className="text-xs text-[var(--color-text-secondary)]">
                    {t('profile.nft_doc', 'Doc')} #{Number(nft.linkedDocId)}
                  </div>
                )}
                <div className="mt-1">
                  <Badge variant={nft.active ? 'success' : 'neutral'} pill>{nft.active ? t('profile.nft_active', 'Active') : t('profile.nft_inactive', 'Inactive')}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
