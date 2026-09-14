import type { Metadata } from 'next'
import { getPortfolioProject, portfolioSlides } from './portfolio'
import { getProjectSlides } from '@/components/portfolio/domain/slides'
import {
  HOME_SEO,
  SITE_NAME,
  SITE_ROLE,
  SITE_URL,
  metadataText,
  portfolioSeoCopy,
  type SeoCopy,
} from './siteMetadata'

export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const
export const SHARE_IMAGE_SLUGS = [
  'portfolio',
  ...portfolioSlides.map(project => project.slug),
]

export function shareImageAlt(slug: string) {
  const project = getPortfolioProject(slug)
  return project
    ? `${metadataText(project.title)} — ${SITE_NAME}'s product design and frontend engineering portfolio`
    : `${SITE_NAME} — ${SITE_ROLE}`
}

function buildMetadata(
  copy: SeoCopy,
  canonicalPath: string,
  pagePath: string,
  imageSlug: string,
): Metadata {
  const title = metadataText(copy.title)
  const description = metadataText(copy.description)
  const image = {
    url: new URL(`/og/${imageSlug}`, SITE_URL).href,
    ...SHARE_IMAGE_SIZE,
    type: 'image/png',
    alt: shareImageAlt(imageSlug),
  }

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: new URL(canonicalPath, SITE_URL).href },
    openGraph: {
      type: 'website',
      locale: 'en_CA',
      siteName: SITE_NAME,
      title,
      description,
      url: new URL(pagePath, SITE_URL).href,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: image.url, alt: image.alt }],
    },
  }
}

export function getPortfolioMetadata(path: string): Metadata | null {
  const url = new URL(path, SITE_URL)
  if (url.origin !== SITE_URL) return null
  const segments = url.pathname.split('/').filter(Boolean)
  if (segments[0] !== 'work' || segments.length > 3) return null
  if (segments.length === 1)
    return buildMetadata(HOME_SEO, '/work', '/work', 'portfolio')

  const project = getPortfolioProject(segments[1])
  if (!project) return null
  const slideSlug = segments[2]
  if (
    slideSlug &&
    !getProjectSlides(project).some(
      slide => slide.kind !== 'description' && slide.slug === slideSlug,
    )
  )
    return null

  const canonicalPath = `/work/${project.slug}`
  const pagePath = slideSlug ? `${canonicalPath}/${slideSlug}` : canonicalPath
  return buildMetadata(
    portfolioSeoCopy(project),
    canonicalPath,
    pagePath,
    project.slug,
  )
}
