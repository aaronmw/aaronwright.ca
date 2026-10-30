import type { PortfolioProject, PortfolioScreenshot } from '@/lib/portfolio'

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

export function isVideoScreenshot(screenshot: PortfolioScreenshot) {
  return /\.(webm|mp4|m4v|ogv|ogg)(?:$|\?)/i.test(screenshot.src)
}

export function getProjectMediaScreenshots(project: PortfolioProject) {
  return project.cover_image
    ? [project.cover_image, ...project.screenshots]
    : project.screenshots
}
