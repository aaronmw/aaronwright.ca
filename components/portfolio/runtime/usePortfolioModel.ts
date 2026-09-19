import { useMemo } from 'react'
import type { PortfolioProject, PortfolioScreenshot } from '@/lib/portfolio'
import {
  carouselMediaKey,
  getInitialSlideIndexes,
  getProjectMediaScreenshots,
  getProjectSlidesBySlug,
  isVideoScreenshot,
} from '@/components/portfolio/domain/slides'

export function createPortfolioModel({
  projects,
  initialProjectSlug,
  initialScreenshotSlug,
  projectSlides,
}: {
  projects: PortfolioProject[]
  initialProjectSlug?: string
  initialScreenshotSlug?: string
  projectSlides: ReturnType<typeof getProjectSlidesBySlug>
}) {
  const initialProjectIndex = initialProjectSlug
    ? projects.findIndex(project => project.slug === initialProjectSlug)
    : -1
  const normalizedInitialProjectIndex =
    initialProjectIndex >= 0 ? initialProjectIndex : -1
  const initialSlideIndexes = getInitialSlideIndexes(
    projects,
    initialProjectSlug,
    initialScreenshotSlug,
  )
  const projectImageKeys = projects.map(project =>
    getProjectMediaScreenshots(project)
      .filter(screenshot => !isVideoScreenshot(screenshot))
      .map(carouselMediaKey),
  )
  const sectionEntryImageKeys = projects.flatMap(project => {
    const first = getProjectMediaScreenshots(project)[0]
    return first && !isVideoScreenshot(first) ? [carouselMediaKey(first)] : []
  })
  const initialTargetScreenshot = (() => {
    if (normalizedInitialProjectIndex < 0) {
      return undefined
    }

    const project = projects[normalizedInitialProjectIndex]
    const initialSlide =
      projectSlides[project.slug][
        initialSlideIndexes[normalizedInitialProjectIndex] ?? 0
      ]

    return initialSlide?.kind === 'screenshot'
      ? initialSlide.screenshot
      : undefined
  })()
  const openingMediaKeys = (() => {
    const journeyKeys = projects
      .slice(0, normalizedInitialProjectIndex + 1)
      .flatMap(project => {
        const first = getProjectMediaScreenshots(project)[0]
        return first && !isVideoScreenshot(first)
          ? [carouselMediaKey(first)]
          : []
      })

    if (initialTargetScreenshot) {
      journeyKeys.push(carouselMediaKey(initialTargetScreenshot))
    }

    return Array.from(new Set(journeyKeys))
  })()
  const imagePreloadQueue = (() => {
    const activeProjectMedia =
      normalizedInitialProjectIndex >= 0
        ? getProjectMediaScreenshots(projects[normalizedInitialProjectIndex])
        : []
    const activeScreenshotIndex = initialTargetScreenshot
      ? activeProjectMedia.findIndex(
          screenshot => screenshot.id === initialTargetScreenshot.id,
        )
      : 0
    const adjacentKeys = [-1, 1]
      .map(offset => activeProjectMedia[activeScreenshotIndex + offset])
      .filter(
        (screenshot): screenshot is PortfolioScreenshot =>
          Boolean(screenshot) && !isVideoScreenshot(screenshot),
      )
      .map(carouselMediaKey)

    return Array.from(
      new Set([
        ...adjacentKeys,
        ...sectionEntryImageKeys,
        ...projectImageKeys.flat(),
      ]),
    )
  })()

  return {
    imagePreloadQueue,
    initialSlideIndexes,
    initialTargetScreenshot,
    normalizedInitialProjectIndex,
    openingMediaKeys,
    projectSlides,
  }
}

export function usePortfolioModel({
  projects,
  initialProjectSlug,
  initialScreenshotSlug,
}: {
  projects: PortfolioProject[]
  initialProjectSlug?: string
  initialScreenshotSlug?: string
}) {
  const projectSlides = useMemo(
    () => getProjectSlidesBySlug(projects),
    [projects],
  )
  return useMemo(
    () =>
      createPortfolioModel({
        projects,
        initialProjectSlug,
        initialScreenshotSlug,
        projectSlides,
      }),
    [projects, initialProjectSlug, initialScreenshotSlug, projectSlides],
  )
}
