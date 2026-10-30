import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { notFound } from 'next/navigation'
import { portfolioFont } from '@/lib/portfolioFonts'

export const metadata: Metadata = {
  title: 'Copy Editor | Aaron M. Wright',
  description: 'A private workspace for rewriting the site copy in context.',
  robots: { index: false, follow: false },
}

const DevelopmentCopyEditor =
  process.env.NODE_ENV === 'development'
    ? dynamic(() =>
        import('@/components/copy-editor/CopyEditor').then(
          module => module.CopyEditor,
        ),
      )
    : null

export default function CopyEditorPage() {
  if (!DevelopmentCopyEditor) notFound()
  return (
    <div className={`${portfolioFont.className} ${portfolioFont.variable}`}>
      <DevelopmentCopyEditor />
    </div>
  )
}
