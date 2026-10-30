import type { MetadataRoute } from 'next'
import { mosaicProjects } from '@/lib/mosaic'
import { canonicalMosaicSlug } from '@/components/mosaic/routing'

import { SITE_URL } from '@/lib/siteMetadata'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/work` },
    ...mosaicProjects.map(project => ({
      url: `${SITE_URL}/work/${canonicalMosaicSlug(project.slug)}`,
    })),
  ]
}
