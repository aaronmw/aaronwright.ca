import type { Metadata } from 'next'
import { CaseStudyBrochureEditor } from '@/components/case-study-brochures/CaseStudyBrochureEditor'

export const metadata: Metadata = {
  title: 'Case Study Brochures | Aaron M. Wright',
  description:
    'A private, autosaving editor for shaping portfolio case-study brochures.',
  robots: { index: false, follow: false },
}

export default function CaseStudyBrochuresPage() {
  return <CaseStudyBrochureEditor />
}
