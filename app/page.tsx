import { getPortfolioMetadata } from '@/lib/seo';
import { HomeProjectGrid } from '@/components/HomeProjectGrid';

export const metadata = getPortfolioMetadata('/work');

export default function Home() {
  return <HomeProjectGrid />;
}
