import { Suspense } from 'react';
import { PortfolioBrowser } from '@/components/portfolio/PortfolioBrowser';

export default function ProjectsPage() {
  return (
    <Suspense>
      <PortfolioBrowser />
    </Suspense>
  );
}
