import type { Metadata } from 'next'
import { CopyEditor } from '@/components/copy-editor/CopyEditor'
import { portfolioFont } from '@/lib/portfolioFonts'

export const metadata: Metadata = {
  title: 'Copy Editor | Aaron M. Wright',
  description: 'A private workspace for rewriting the site copy in context.',
  robots: { index: false, follow: false },
}

export default function CopyEditorPage() {
  return (
    <div className={`${portfolioFont.className} ${portfolioFont.variable}`}>
      <CopyEditor />
    </div>
  )
}
