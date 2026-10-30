import type { MosaicProject } from '@/components/mosaic/types'
import { canonicalMosaicSlug } from '@/components/mosaic/routing'
import { getPortfolioProject, type PortfolioProject } from './portfolio'

export type SeoCopy = { title: string; description: string }

export const SITE_URL = 'https://aaronwright.ca'
export const SITE_NAME = 'Aaron M. Wright'
export const SITE_ROLE = 'Product Designer & Frontend Engineer'
export const HOME_SEO: SeoCopy = {
  title: `${SITE_NAME} | ${SITE_ROLE}`,
  description:
    'Product design and frontend engineering by Aaron M. Wright. Explore product redesigns, design systems, and tools that help teams do better work.',
}

export function metadataText(value: string) {
  return value
    .replace(/!?\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\u00ad|&shy;|&#173;|&#x0*ad;/gi, '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/[*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function portfolioSeoCopy(project?: PortfolioProject): SeoCopy {
  if (!project) return HOME_SEO
  return {
    title: metadataText(
      project.slug === 'about-me'
        ? project.seo.title
        : `${project.seo.title} | ${SITE_NAME}`,
    ),
    description: metadataText(project.seo.description),
  }
}

export function mosaicSeoCopy(project?: MosaicProject): SeoCopy {
  if (!project) return HOME_SEO
  const legacyProject = getPortfolioProject(canonicalMosaicSlug(project.slug))
  if (legacyProject) return portfolioSeoCopy(legacyProject)
  return {
    title: `${metadataText(project.title)} | ${SITE_NAME}`,
    description: metadataText(project.summary),
  }
}
