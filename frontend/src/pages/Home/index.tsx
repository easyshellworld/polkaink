import { HeroSection } from './HeroSection';
import { StatsBar } from './StatsBar';
import { LatestProposals } from './LatestProposals';
import { FeaturedDocuments } from './FeaturedDocuments';
import { Footer } from '../../components/layout/Footer';

export default function HomePage() {
  return (
    <div>
      <HeroSection />
      <StatsBar />
      <div className="mx-auto max-w-4xl px-4">
        <FeaturedDocuments />
      </div>
      <LatestProposals />
      <Footer />
    </div>
  );
}
