import type { PortfolioProject } from '@/lib/portfolio'
import type { PortfolioSelection, ProjectSlide } from './slides'
import { isAboutMeTextSlide } from './slides'

export type PortfolioRouteState = PortfolioSelection & {
  modalOpen: boolean
}

export function parsePortfolioRoute(
  pathname: string,
  search: string,
  projects: PortfolioProject[],
  projectSlides: Record<string, ProjectSlide[]>,
): PortfolioRouteState | null {
  const segments = pathname.split('/').filter(Boolean)

  if (segments[0] !== 'work') {
    return null
  }

  if (segments.length === 1) {
    return { projectIndex: -1, slideIndex: 0, modalOpen: false }
  }

  const projectIndex = projects.findIndex(
    project => project.slug === segments[1],
  )

  if (projectIndex < 0) {
    return null
  }

  const project = projects[projectIndex]
  const slides = projectSlides[project.slug]
  const screenshotSlug = segments[2]
  const slideIndex = screenshotSlug
    ? slides.findIndex(
        slide => slide.kind === 'screenshot' && slide.slug === screenshotSlug,
      )
    : 0

  if (segments.length > 3 || slideIndex < 0) {
    return null
  }

  const slide = slides[slideIndex]
  const modalOpen =
    new URLSearchParams(search).get('modal') === 'image' &&
    slide.kind === 'screenshot' &&
    !isAboutMeTextSlide(project, slide)

  return { projectIndex, slideIndex, modalOpen }
}

export function projectUrl(project: PortfolioProject, slide: ProjectSlide) {
  if (slide.kind === 'description') {
    return `/work/${project.slug}`
  }

  return `/work/${project.slug}/${slide.slug}`
}

export function pageTitle(project?: PortfolioProject, slide?: ProjectSlide) {
  if (!project || !slide) {
    return 'Work | Aaron M. Wright'
  }

  if (slide.kind === 'description') {
    return `${project.title} | Aaron M. Wright`
  }

  return `${project.title}: ${slide.slug} | Aaron M. Wright`
}

function titleCaseLabel(value: string) {
  return value.replace(/\S+/g, word =>
    word
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('-'),
  )
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function slideNavigationTitle(
  project: PortfolioProject,
  slide: ProjectSlide,
) {
  if (slide.kind === 'description') {
    return `${project.title} • Index`
  }

  const altMatch = slide.screenshot.alt.match(/^(\d+\s+of\s+\d+):\s*(.+)$/i)
  const positionLabel =
    altMatch?.[1] ??
    `${project.screenshots.findIndex(screenshot => screenshot.id === slide.screenshot.id) + 1} of ${project.screenshots.length}`
  const rawSlideLabel = altMatch?.[2] ?? slide.screenshot.slug
  const projectPrefixPattern = new RegExp(
    `^${escapeRegExp(project.title)}\\s*`,
    'i',
  )
  const slideLabel =
    rawSlideLabel.replace(projectPrefixPattern, '').trim() ||
    slide.screenshot.slug

  return `${positionLabel} • ${project.title} • ${titleCaseLabel(slideLabel)}`
}
