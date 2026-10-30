import dynamic from 'next/dynamic'
import { Mosaic } from './Mosaic'
import { mosaicProjects } from '@/lib/mosaic'
import { HOME_SEO, mosaicSeoCopy } from '@/lib/siteMetadata'

// The editor and its input handlers are excluded from the production route.
const DevelopmentMosaic =
  process.env.NODE_ENV === 'development'
    ? dynamic(() =>
        import('./MosaicDevelopment').then(module => module.MosaicDevelopment),
      )
    : null

export function MosaicPortfolio() {
  const projects = mosaicProjects.map(project => ({
    ...project,
    pageTitle: mosaicSeoCopy(project).title,
  }))
  return DevelopmentMosaic ? (
    <DevelopmentMosaic
      projects={projects}
      galleryTitle={HOME_SEO.title}
    />
  ) : (
    <Mosaic
      projects={projects}
      galleryTitle={HOME_SEO.title}
    />
  )
}
