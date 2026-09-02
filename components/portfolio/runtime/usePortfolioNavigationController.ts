'use client'

import type { EmblaCarouselType } from 'embla-carousel'
import { useEffect, useEffectEvent, type RefObject } from 'react'
import { portfolioSlides } from '@/lib/portfolio'
import { pageTitle, projectUrl, viewerUrl } from '../domain/routing'
import type { ProjectSlide } from '../domain/slides'
import type { PortfolioRuntimeSelection } from './usePortfolioSelection'

export type NavigationMode = 'push' | 'replace' | 'silent'

export type VerticalNavigationIntent = {
  projectIndex: number
  mode: NavigationMode
  slideIndex?: number
}

const START_SCREEN_INDEX = -1

export function usePortfolioNavigationController({
  horizontalApisRef,
  horizontalModesRef,
  projectSlides,
  selectionRef,
  verticalApi,
  verticalIntentRef,
  setActiveProjectIndex,
  setActiveSlideIndexes,
}: {
  horizontalApisRef: RefObject<Map<number, EmblaCarouselType>>
  horizontalModesRef: RefObject<Map<number, NavigationMode>>
  projectSlides: Record<string, ProjectSlide[]>
  selectionRef: RefObject<PortfolioRuntimeSelection>
  verticalApi?: EmblaCarouselType
  verticalIntentRef: RefObject<VerticalNavigationIntent | null>
  setActiveProjectIndex: (projectIndex: number) => void
  setActiveSlideIndexes: (
    update: number[] | ((current: number[]) => number[]),
  ) => void
}) {
  function updateRoute(
    projectIndex: number,
    slideIndex: number,
    mode: 'push' | 'replace',
    viewerOpen = false,
  ) {
    const project = portfolioSlides[projectIndex]
    const slide = project ? projectSlides[project.slug][slideIndex] : undefined
    const path = project && slide ? projectUrl(project, slide) : '/work'
    const url =
      viewerOpen && project && slide ? viewerUrl(project, slide) : path
    const current = `${window.location.pathname}${window.location.search}`
    if (current !== url) window.history[`${mode}State`]({}, '', url)
    document.title = pageTitle(project, slide)
  }

  function registerHorizontalApi(
    projectIndex: number,
    api: EmblaCarouselType | null,
  ) {
    if (api) horizontalApisRef.current.set(projectIndex, api)
    else horizontalApisRef.current.delete(projectIndex)
  }

  function commitHorizontalSelection(
    projectIndex: number,
    slideIndex: number,
    mode: NavigationMode,
  ) {
    setActiveSlideIndexes(indexes =>
      indexes.map((index, indexProject) =>
        indexProject === projectIndex ? slideIndex : index,
      ),
    )
    if (
      mode !== 'silent' &&
      selectionRef.current.projectIndex === projectIndex
    ) {
      updateRoute(projectIndex, slideIndex, mode)
    }
  }

  function handleHorizontalSelect(projectIndex: number, slideIndex: number) {
    const mode = horizontalModesRef.current.get(projectIndex) ?? 'replace'
    horizontalModesRef.current.delete(projectIndex)
    commitHorizontalSelection(projectIndex, slideIndex, mode)
  }

  function selectHorizontal(
    projectIndex: number,
    slideIndex: number,
    mode: NavigationMode,
    jump = false,
  ) {
    const api = horizontalApisRef.current.get(projectIndex)
    const slides = projectSlides[portfolioSlides[projectIndex].slug]
    const target = Math.max(0, Math.min(slides.length - 1, slideIndex))
    if (!api || api.selectedScrollSnap() === target) {
      commitHorizontalSelection(projectIndex, target, mode)
      return
    }
    horizontalModesRef.current.set(projectIndex, mode)
    api.scrollTo(target, jump)
  }

  function commitVerticalSelection(
    projectIndex: number,
    mode: NavigationMode,
    slideIndexOverride?: number,
  ) {
    setActiveProjectIndex(projectIndex)
    if (mode === 'silent') return
    const slideIndex =
      projectIndex >= 0
        ? (slideIndexOverride ??
          selectionRef.current.slideIndexes[projectIndex] ??
          0)
        : 0
    updateRoute(projectIndex, slideIndex, mode)
  }

  const handleVerticalSelect = useEffectEvent((api: EmblaCarouselType) => {
    const projectIndex = api.selectedScrollSnap() - 1
    const intent = verticalIntentRef.current
    verticalIntentRef.current = null
    const matchesIntent = intent?.projectIndex === projectIndex
    commitVerticalSelection(
      projectIndex,
      matchesIntent ? intent.mode : 'replace',
      matchesIntent ? intent.slideIndex : undefined,
    )
  })

  useEffect(() => {
    if (!verticalApi) return
    verticalApi.on('select', handleVerticalSelect)
    return () => {
      verticalApi.off('select', handleVerticalSelect)
    }
  }, [verticalApi])

  function setActiveProject(
    projectIndex: number,
    mode: 'push' | 'replace',
    jump = false,
    targetSlideIndex?: number,
  ) {
    const target = Math.max(
      START_SCREEN_INDEX,
      Math.min(portfolioSlides.length - 1, projectIndex),
    )
    let slideIndexOverride: number | undefined
    if (target >= 0 && targetSlideIndex !== undefined) {
      const slides = projectSlides[portfolioSlides[target].slug]
      slideIndexOverride = Math.max(
        0,
        Math.min(slides.length - 1, targetSlideIndex),
      )
      selectHorizontal(target, slideIndexOverride, 'silent', true)
    }
    const emblaIndex = target + 1
    if (!verticalApi || verticalApi.selectedScrollSnap() === emblaIndex) {
      commitVerticalSelection(target, mode, slideIndexOverride)
      return
    }
    verticalIntentRef.current = {
      projectIndex: target,
      mode,
      slideIndex: slideIndexOverride,
    }
    verticalApi.scrollTo(emblaIndex, jump)
  }

  function moveVertical(direction: -1 | 1) {
    const screenIndex = selectionRef.current.projectIndex + 1
    const nextScreen = screenIndex + direction
    if (nextScreen < 0 || nextScreen > portfolioSlides.length) return
    setActiveProject(nextScreen - 1, 'push')
  }

  function setActiveSlide(
    projectIndex: number,
    slideIndex: number,
    mode: 'push' | 'replace',
  ) {
    selectHorizontal(projectIndex, slideIndex, mode)
  }

  function moveHorizontal(direction: -1 | 1) {
    const projectIndex = selectionRef.current.projectIndex
    if (projectIndex < 0) return
    const api = horizontalApisRef.current.get(projectIndex)
    if (!api || api.scrollSnapList().length < 2) return
    const nextSlideIndex = api.selectedScrollSnap() + direction
    if (nextSlideIndex < 0 || nextSlideIndex >= api.scrollSnapList().length) {
      return
    }
    horizontalModesRef.current.set(projectIndex, 'push')
    api.scrollTo(nextSlideIndex)
  }

  return {
    handleHorizontalSelect,
    moveHorizontal,
    moveVertical,
    registerHorizontalApi,
    selectHorizontal,
    setActiveProject,
    setActiveSlide,
    updateRoute,
  }
}
