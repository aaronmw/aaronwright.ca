import type { MetadataRoute } from 'next'
import { portfolioSlides } from '@/lib/portfolio'

const SITE_URL = 'https://aaronwright.ca'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/work` },
    ...portfolioSlides.map(project => ({
      url: `${SITE_URL}/work/${project.slug}`,
    })),
  ]
}
