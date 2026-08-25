import type { Metadata } from 'next';
import { CaseStudyIntake } from '@/components/case-study-intake/CaseStudyIntake';

export const metadata: Metadata = {
  title: 'Case Study Interview | Aaron M. Wright',
  description: 'A private, autosaving interview for rebuilding portfolio case studies.',
  robots: { index: false, follow: false },
};

export default function CaseStudyIntakePage() {
  return <CaseStudyIntake />;
}
