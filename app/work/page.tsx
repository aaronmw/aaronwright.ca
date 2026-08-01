import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PortfolioBrowser } from '@/components/portfolio/PortfolioBrowser';

export const metadata: Metadata = {
  title: 'Work | Aaron M. Wright',
  description:
    'Selected product design and development work by Aaron M. Wright, including Figma tools, content systems, web apps, and AI-assisted projects.',
  alternates: {
    canonical: 'https://aaronwright.ca/work',
  },
};

export default function WorkPage() {
  return (
    <Suspense>
      <PortfolioBrowser />
    </Suspense>
  );
}
