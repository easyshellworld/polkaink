import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { readContract } from '../../lib/contracts';
import { Card } from '../../components/ui/Card';

export function ContributionStats({ address }: { address: string }) {
  const { t } = useTranslation();

  const { data } = useQuery({
    queryKey: ['contributionStats', address],
    queryFn: async () => {
      const [authorNFTs, guardianNFTs] = await Promise.all([
        readContract('NFTReward', 'getAuthorNFTs', [address as `0x${string}`]).catch(() => []),
        readContract('NFTReward', 'getGuardianNFTs', [address as `0x${string}`]).catch(() => []),
      ]);
      const authorCount = (authorNFTs as bigint[]).length;
      const guardianCount = (guardianNFTs as bigint[]).length;
      const isMember = await readContract('ArchiveCouncil', 'isActiveMember', [
        address as `0x${string}`,
      ]).catch(() => false);

      return {
        authorNFTs: authorCount,
        guardianNFTs: guardianCount,
        totalNFTs: authorCount + guardianCount,
        isCouncilMember: isMember as boolean,
      };
    },
    staleTime: 60_000,
  });

  const stats = [
    { label: t('profile.author_nfts'), value: data?.authorNFTs ?? 0 },
    { label: t('profile.guardian_nfts'), value: data?.guardianNFTs ?? 0 },
    { label: t('profile.total_nfts'), value: data?.totalNFTs ?? 0 },
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
