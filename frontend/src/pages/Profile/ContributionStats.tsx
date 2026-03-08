import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { readContract } from '../../lib/contracts';
import { Card } from '../../components/ui/Card';

export function ContributionStats({ address }: { address: string }) {
  const { t } = useTranslation();

  const { data } = useQuery({
    queryKey: ['contributionStats', address],
    queryFn: async () => {
      const [memberNFTs, creatorNFTs, guardianNFTs] = await Promise.all([
        readContract('NFTReward', 'getNFTsByType', [address as `0x${string}`, 0]).catch(() => []),
        readContract('NFTReward', 'getNFTsByType', [address as `0x${string}`, 1]).catch(() => []),
        readContract('NFTReward', 'getNFTsByType', [address as `0x${string}`, 2]).catch(() => []),
      ]);
      const memberCount = (memberNFTs as bigint[]).length;
      const creatorCount = (creatorNFTs as bigint[]).length;
      const guardianCount = (guardianNFTs as bigint[]).length;
      const isMember = await readContract('ArchiveCouncil', 'isMember', [
        address as `0x${string}`,
      ]).catch(() => false);

      return {
        memberNFTs: memberCount,
        creatorNFTs: creatorCount,
        guardianNFTs: guardianCount,
        totalNFTs: memberCount + creatorCount + guardianCount,
        isCouncilMember: isMember as boolean,
      };
    },
    staleTime: 60_000,
  });

  const stats = [
    { label: t('profile.member_nfts', 'Member NFTs'), value: data?.memberNFTs ?? 0 },
    { label: t('profile.creator_nfts', 'Creator NFTs'), value: data?.creatorNFTs ?? 0 },
    { label: t('profile.guardian_nfts'), value: data?.guardianNFTs ?? 0 },
    { label: t('profile.council_member'), value: data?.isCouncilMember ? '✓' : '—' },
  ];

  return (
    <section className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="text-center">
          <div className="text-xl font-bold">{s.value}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">{s.label}</div>
        </Card>
      ))}
    </section>
  );
}
