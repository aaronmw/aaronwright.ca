import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Mosaic } from '@/components/mosaic/Mosaic'
import { mosaicProjects } from '@/lib/mosaic'

export const metadata: Metadata = {
  title: 'Visual portfolio — Aaron M. Wright',
  robots: { index: false, follow: false },
}

// The editor and its input handlers are excluded from the production route.
const DevelopmentMosaic =
  process.env.NODE_ENV === 'development'
    ? dynamic(() =>
        import('@/components/mosaic/MosaicDevelopment').then(
          module => module.MosaicDevelopment,
        ),
      )
    : null

export default function MosaicPage() {
  if (DevelopmentMosaic) return <DevelopmentMosaic projects={mosaicProjects} />
  return <Mosaic projects={mosaicProjects} />
}
