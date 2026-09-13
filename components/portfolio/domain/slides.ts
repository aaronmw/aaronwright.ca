import type { PortfolioProject, PortfolioScreenshot } from '@/lib/portfolio'
import { positiveModulo } from './carousel'

export type ProjectSlide =
  | {
      id: string
      kind: 'description'
      slug: 'description'
    }
  | {
      id: string
      kind: 'details'
      slug: 'details'
    }
  | {
      id: string
      kind: 'screenshot'
      slug: string
      screenshot: PortfolioScreenshot
    }

export type PortfolioSelection = {
  projectIndex: number
  slideIndex: number
}

export function getProjectSlides(project: PortfolioProject): ProjectSlide[] {
  const screenshotSlides = project.screenshots.map(screenshot => ({
    id: screenshot.id,
    kind: 'screenshot' as const,
    slug: screenshot.slug,
    screenshot,
  }))

  const mediaSlides: Array<Extract<ProjectSlide, { kind: 'screenshot' }>> = [
    ...(project.cover_image
      ? [
          {
            id: project.cover_image.id,
            kind: 'screenshot' as const,
            slug: project.cover_image.slug,
            screenshot: project.cover_image,
          },
        ]
      : []),
    ...screenshotSlides,
  ]

  if (mediaSlides.length > 0) return mediaSlides

  return [
    {
      id: `${project.id}-description`,
      kind: 'description',
      slug: 'description',
    },
    ...(project.detailsMarkdown
      ? [
          {
            id: `${project.id}-details`,
            kind: 'details' as const,
            slug: 'details' as const,
          },
        ]
      : []),
  ]
}

export function getProjectSlidesBySlug(projects: PortfolioProject[]) {
  return Object.fromEntries(
    projects.map(project => [project.slug, getProjectSlides(project)]),
  ) as Record<string, ProjectSlide[]>
}

export function getInitialSlideIndexes(
  projects: PortfolioProject[],
  projectSlug?: string,
  screenshotSlug?: string,
) {
  return projects.map(project => {
    if (project.slug !== projectSlug || !screenshotSlug) {
      return 0
    }

    const slideIndex = getProjectSlides(project).findIndex(
      slide => slide.slug === screenshotSlug,
    )

    return slideIndex >= 0 ? slideIndex : 0
  })
}

export function getVerticalTargetProjectIndex(
  currentProjectIndex: number,
  direction: -1 | 1,
  projectCount: number,
) {
  const screenCount = projectCount + 1
  const currentScreenIndex = currentProjectIndex + 1
  const nextScreenIndex = positiveModulo(
    currentScreenIndex + direction,
    screenCount,
  )

  return nextScreenIndex - 1
}

export function isVideoScreenshot(screenshot: PortfolioScreenshot) {
  return /\.(webm|mp4|m4v|ogv|ogg)(?:$|\?)/i.test(screenshot.src)
}

export function hasProjectScreenshots(project: PortfolioProject) {
  return getProjectMediaScreenshots(project).length > 0
}

export function isViewerScreenshotSlide(
  _project: PortfolioProject,
  slide: ProjectSlide,
): slide is Extract<ProjectSlide, { kind: 'screenshot' }> {
  return slide.kind === 'screenshot'
}

export function carouselMediaKey(screenshot: PortfolioScreenshot) {
  return `carousel:${screenshot.id}`
}

export function viewerMediaKey(screenshot: PortfolioScreenshot) {
  return `modal:${screenshot.id}`
}

export function getProjectMediaScreenshots(project: PortfolioProject) {
  return project.cover_image
    ? [project.cover_image, ...project.screenshots]
    : project.screenshots
}

export function getSlideMediaKey(
  project: PortfolioProject,
  slide: ProjectSlide,
  useDesktopVisual: boolean,
) {
  if (slide.kind === 'screenshot') {
    return carouselMediaKey(slide.screenshot)
  }

  if (useDesktopVisual) {
    const firstScreenshot = getProjectMediaScreenshots(project)[0]
    return firstScreenshot ? carouselMediaKey(firstScreenshot) : undefined
  }

  return undefined
}
