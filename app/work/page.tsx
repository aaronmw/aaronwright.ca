import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PortfolioBrowser } from '@/components/portfolio/PortfolioBrowser';

export const metadata: Metadata = {
  title: 'Work | Aaron M. Wright',
  description: 'A viewport-sized portfolio browser for Aaron M. Wright.',
};

export default function WorkPage() {
  return (
    <Suspense>
      <PortfolioBrowser />
    </Suspense>
  );
}
