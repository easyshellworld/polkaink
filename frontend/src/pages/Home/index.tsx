import { HeroSection } from './HeroSection';
import { StatsBar } from './StatsBar';
import { LatestProposals } from './LatestProposals';
import { Footer } from '../../components/layout/Footer';

export default function HomePage() {
  return (
    <div>
      <HeroSection />
      <StatsBar />
      <LatestProposals />
      <Footer />
    </div>
  );
}
