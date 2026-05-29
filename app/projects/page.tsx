import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PortfolioBrowser } from '@/components/portfolio/PortfolioBrowser';

export const metadata: Metadata = {
  title: 'Projects | Aaron M. Wright',
  description: 'A viewport-sized portfolio browser for Aaron M. Wright.',
};

export default function ProjectsPage() {
  return (
    <Suspense>
      <PortfolioBrowser />
    </Suspense>
  );
}
