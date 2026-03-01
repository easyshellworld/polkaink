import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card } from '../../components/ui/Card';
import { shortenAddress } from '../../lib/utils';
import { NFTGallery } from './NFTGallery';
import { ContributionStats } from './ContributionStats';
import { ProposalHistory } from './ProposalHistory';

export default function ProfilePage() {
  const { t: _t } = useTranslation();
  const { address } = useParams<{ address: string }>();

  if (!address) {
    return (
      <PageWrapper className="text-center py-16">
        <h2 className="text-lg font-semibold">No address provided</h2>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Card padding="lg" className="mb-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-[var(--color-primary-10)] flex items-center justify-center text-[var(--color-primary)] text-xl font-bold">
            ◎
          </div>
          <div>
            <h1 className="text-xl font-bold">{shortenAddress(address)}</h1>
            <p className="text-sm text-[var(--color-text-secondary)] break-all">{address}</p>
          </div>
        </div>
      </Card>

      <ContributionStats address={address} />
      <NFTGallery address={address} />
      <ProposalHistory address={address} />
    </PageWrapper>
  );
}
