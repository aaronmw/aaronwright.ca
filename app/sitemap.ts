import type { MetadataRoute } from 'next'
import { portfolioSlides } from '@/lib/portfolio'

import { SITE_URL } from '@/lib/siteMetadata'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/work` },
    ...portfolioSlides.map(project => ({
      url: `${SITE_URL}/work/${project.slug}`,
    })),
  ]
}
