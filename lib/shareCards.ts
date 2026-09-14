import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getPortfolioProject } from './portfolio'
import { SHARE_IMAGE_SLUGS } from './seo'
import {
  metadataText,
  portfolioSeoCopy,
  SITE_NAME,
  SITE_ROLE,
} from './siteMetadata'

type ShareArtwork = {
  load: () => Promise<string>
  fit: 'cover' | 'contain'
  clipToPhoneFrame?: boolean
  alt: string
}

const projectArtwork: Record<string, ShareArtwork> = {
  'loopio': {
    load: () =>
      readFile(
        join(process.cwd(), 'public/portfolio/loopio-case-study/dashboard.png'),
        'base64',
      ),
    fit: 'cover',
    alt: 'Loopio product dashboard',
  },
  'freshbooks': {
    load: () =>
      readFile(
        join(
          process.cwd(),
          'public/portfolio/freshbooks-case-study/modern-ui.png',
        ),
        'base64',
      ),
    fit: 'contain',
    alt: 'Redesigned FreshBooks interface',
  },
  'informal-systems': {
    load: () =>
      readFile(
        join(process.cwd(), 'public/portfolio/informal-systems/home-page.png'),
        'base64',
      ),
    fit: 'cover',
    alt: 'Informal Systems homepage',
  },
  'aarons-toolbox': {
    load: () =>
      readFile(
        join(
          process.cwd(),
          'public/portfolio/aarons-toolbox/store-images--normalizer.png',
        ),
        'base64',
      ),
    fit: 'contain',
    alt: 'Normalizer in Aaron’s Toolbox for Figma',
  },
  'nextphrase': {
    load: () =>
      readFile(
        join(process.cwd(), 'public/portfolio/nextphrase/social-poster.png'),
        'base64',
      ),
    fit: 'contain',
    alt: 'NextPhrase title screen on a phone',
    clipToPhoneFrame: true,
  },
}

export function getShareCard(slug: string) {
  if (!SHARE_IMAGE_SLUGS.includes(slug)) return null
  const project = getPortfolioProject(slug)
  const copy = portfolioSeoCopy(project)
  const artwork = projectArtwork[slug]
  if (project && slug !== 'about-me' && !artwork) {
    throw new Error(`Missing share artwork for ${slug}`)
  }
  return {
    slug,
    title:
      slug === 'portfolio'
        ? SITE_NAME
        : slug === 'about-me'
          ? 'About Aaron'
          : metadataText(project!.title),
    description: slug === 'portfolio' ? SITE_ROLE : copy.description,
    artwork,
  }
}

export type ShareCardContent = NonNullable<ReturnType<typeof getShareCard>>
