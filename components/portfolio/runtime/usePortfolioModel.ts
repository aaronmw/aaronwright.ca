import { useMemo } from 'react'
import type { PortfolioProject, PortfolioScreenshot } from '@/lib/portfolio'
import {
  carouselMediaKey,
  getInitialSlideIndexes,
  getProjectMediaScreenshots,
  getProjectSlidesBySlug,
  isBuildingWithAiTextSlide,
} from '@/components/portfolio/domain/slides'

export function usePortfolioModel({
  projects,
  initialProjectSlug,
  initialScreenshotSlug,
  isMediaReady,
}: {
  projects: PortfolioProject[]
  initialProjectSlug?: string
  initialScreenshotSlug?: string
  isMediaReady: (key: string) => boolean
}) {
  const projectSlides = useMemo(
    () => getProjectSlidesBySlug(projects),
    [projects],
  )
  const initialProjectIndex = initialProjectSlug
    ? projects.findIndex(project => project.slug === initialProjectSlug)
    : -1
  const normalizedInitialProjectIndex =
    initialProjectIndex >= 0 ? initialProjectIndex : -1
  const initialSlideIndexes = useMemo(
    () =>
      getInitialSlideIndexes(
        projects,
        initialProjectSlug,
        initialScreenshotSlug,
      ),
    [initialProjectSlug, initialScreenshotSlug, projects],
  )
  const projectMediaKeys = useMemo(
    () =>
      projects.map(project =>
        getProjectMediaScreenshots(project).map(carouselMediaKey),
      ),
    [projects],
  )
  const sectionEntryMediaKeys = useMemo(
    () => projectMediaKeys.flatMap(keys => (keys[0] ? [keys[0]] : [])),
    [projectMediaKeys],
  )
  const initialTargetScreenshot = useMemo(() => {
    if (normalizedInitialProjectIndex < 0) {
      return undefined
    }

    const project = projects[normalizedInitialProjectIndex]
    const initialSlide =
      projectSlides[project.slug][
        initialSlideIndexes[normalizedInitialProjectIndex] ?? 0
      ]

    return initialSlide?.kind === 'screenshot' &&
      !isBuildingWithAiTextSlide(project, initialSlide)
      ? initialSlide.screenshot
      : undefined
  }, [
    initialSlideIndexes,
    normalizedInitialProjectIndex,
    projectSlides,
    projects,
  ])
  const openingMediaKeys = useMemo(() => {
    const journeyKeys = projectMediaKeys
      .slice(0, normalizedInitialProjectIndex + 1)
      .map(keys => keys[0])
      .filter(Boolean)

    if (initialTargetScreenshot) {
      journeyKeys.push(carouselMediaKey(initialTargetScreenshot))
    }

    return Array.from(new Set(journeyKeys))
  }, [initialTargetScreenshot, normalizedInitialProjectIndex, projectMediaKeys])
  const backgroundMediaQueue = useMemo(() => {
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
      .filter((screenshot): screenshot is PortfolioScreenshot =>
        Boolean(screenshot),
      )
      .map(carouselMediaKey)

    return Array.from(
      new Set([
        ...adjacentKeys,
        ...sectionEntryMediaKeys,
        ...projectMediaKeys.flat(),
      ]),
    )
  }, [
    initialTargetScreenshot,
    normalizedInitialProjectIndex,
    projectMediaKeys,
    projects,
    sectionEntryMediaKeys,
  ])

  return {
    backgroundMediaQueue,
    initialSlideIndexes,
    initialTargetScreenshot,
    normalizedInitialProjectIndex,
    openingMediaKeys,
    projectCarouselsReady: projectMediaKeys.map(keys =>
      keys.every(isMediaReady),
    ),
    projectMediaKeys,
    projectSlides,
    sectionEntryMediaKeys,
    sectionEntryMediaReady: sectionEntryMediaKeys.every(isMediaReady),
  }
}
