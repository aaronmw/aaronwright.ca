import { getPortfolioMetadata } from '@/lib/seo';
import { Suspense } from 'react';
import { PortfolioBrowser } from '@/components/portfolio/PortfolioBrowser';

export const metadata = getPortfolioMetadata('/work');

export default function WorkPage() {
  return (
    <Suspense>
      <PortfolioBrowser />
    </Suspense>
  );
}
