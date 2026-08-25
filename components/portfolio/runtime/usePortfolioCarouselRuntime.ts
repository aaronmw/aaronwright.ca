import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react'
import { gsap } from 'gsap'
import type { PortfolioProject } from '@/lib/portfolio'
import {
  NAVIGATION_TRAVEL_EASE,
  getCarouselPosition,
  getCarouselTargetScrollLeft,
  getNavigationTravelDuration,
  isCarouselBoundaryJump,
  positiveModulo,
} from '@/components/portfolio/domain/carousel'
import {
  getSlideMediaKey,
  isModalScreenshotSlide,
  type ProjectSlide,
} from '@/components/portfolio/domain/slides'
import type {
  HorizontalScrollOptions,
  PortfolioCarouselRuntimeOptions,
} from './carouselRuntimeTypes'

function subscribeToCarousel(
  project: PortfolioProject,
  projectIndex: number,
  carousel: HTMLDivElement,
  onScroll: (
    project: PortfolioProject,
    projectIndex: number,
    carousel: HTMLDivElement,
  ) => void,
  onScrollEnd: (
    project: PortfolioProject,
    projectIndex: number,
    carousel: HTMLDivElement,
  ) => void,
) {
  const handleScroll = () => onScroll(project, projectIndex, carousel)
  const handleScrollEnd = () => onScrollEnd(project, projectIndex, carousel)
  carousel.addEventListener('scroll', handleScroll, { passive: true })
  carousel.addEventListener('scrollend', handleScrollEnd)

  return () => {
    carousel.removeEventListener('scroll', handleScroll)
    carousel.removeEventListener('scrollend', handleScrollEnd)
  }
}

export function usePortfolioCarouselRuntime({
  projects,
  projectSlides,
  activeProjectIndex,
  activeSlideIndexes,
  setActiveSlideIndexes,
  isWideLayout,
  isModalOpen,
  isModalVisible,
  isInlineZoomPresentationActive,
  initialRevealCompleteRef,
  scrollSyncRef,
  verticalRef,
  slideIndicatorMotionControllerRef,
  inlineZoomHandoffScreenshotIdRef,
  prepareMediaNavigation,
  updateUrl,
  replaceModalUrl,
  settleHorizontalNavigation,
}: PortfolioCarouselRuntimeOptions) {
  const horizontalRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const horizontalScrollTweenRefs = useRef<
    Record<string, gsap.core.Tween | null>
  >({})
  const horizontalTargetSlideIndexesRef = useRef<Record<string, number>>({})
  const horizontalKeyboardIndicatorIndexesRef = useRef<
    Record<string, number | undefined>
  >({})
  const horizontalPendingNavigationIntentRefs = useRef<
    Record<string, number | undefined>
  >({})
  const descriptionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const horizontalScrollSyncProjectRef = useRef<string | null>(null)
  const horizontalScrollSyncTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const [boundaryBlurProjectSlugs, setBoundaryBlurProjectSlugs] = useState<
    ReadonlySet<string>
  >(() => new Set())
  const [navigationTargetSlideIndexes, setNavigationTargetSlideIndexes] =
    useState<Readonly<Record<string, number>>>({})

  const setNavigationTargetSlideIndex = (
    projectSlug: string,
    slideIndex?: number,
  ) => {
    setNavigationTargetSlideIndexes(currentIndexes => {
      if (slideIndex !== undefined) {
        if (currentIndexes[projectSlug] === slideIndex) return currentIndexes

        return { ...currentIndexes, [projectSlug]: slideIndex }
      }

      if (currentIndexes[projectSlug] === undefined) return currentIndexes

      const nextIndexes = { ...currentIndexes }
      delete nextIndexes[projectSlug]
      return nextIndexes
    })
  }

  const resetDescriptionScroll = (project: PortfolioProject) => {
    descriptionRefs.current[project.slug]?.scrollTo({ top: 0 })
  }

  const setProjectBoundaryBlur = (projectSlug: string, shouldBlur: boolean) => {
    setBoundaryBlurProjectSlugs(currentSlugs => {
      if (currentSlugs.has(projectSlug) === shouldBlur) {
        return currentSlugs
      }

      const nextSlugs = new Set(currentSlugs)
      if (shouldBlur) nextSlugs.add(projectSlug)
      else nextSlugs.delete(projectSlug)
      return nextSlugs
    })
  }

  const setHorizontalRef =
    (projectSlug: string) => (node: HTMLDivElement | null) => {
      horizontalRefs.current[projectSlug] = node
    }

  const setDescriptionRef =
    (projectSlug: string) => (node: HTMLDivElement | null) => {
      descriptionRefs.current[projectSlug] = node
    }

  const getCarouselSlides = (project: PortfolioProject) => {
    const slides = projectSlides[project.slug]
    if (!isWideLayout) return slides

    const screenshotSlides = slides.filter(slide => slide.kind === 'screenshot')
    return screenshotSlides.length > 0 ? screenshotSlides : slides
  }

  const getCarouselIndexFromSlideIndex = (
    project: PortfolioProject,
    slideIndex: number,
  ) => {
    if (!isWideLayout) return slideIndex

    const slide = projectSlides[project.slug][slideIndex]
    if (slide?.kind !== 'screenshot') return 0

    return Math.max(
      0,
      getCarouselSlides(project).findIndex(
        carouselSlide => carouselSlide.id === slide.id,
      ),
    )
  }

  const getSlideIndexFromCarouselIndex = (
    project: PortfolioProject,
    carouselIndex: number,
  ) => {
    const carouselSlides = getCarouselSlides(project)
    const carouselSlide =
      carouselSlides[positiveModulo(carouselIndex, carouselSlides.length)]

    return Math.max(
      0,
      projectSlides[project.slug].findIndex(
        slide => slide.id === carouselSlide.id,
      ),
    )
  }

  const scrollHorizontalToRealIndex = (
    project: PortfolioProject,
    slideIndex: number,
    behavior: ScrollBehavior,
    onComplete?: () => void,
    options: HorizontalScrollOptions = {},
  ) => {
    const { syncIndicator = false, boundarySourceIndex } = options
    const carousel = horizontalRefs.current[project.slug]
    if (!carousel) {
      onComplete?.()
      return
    }

    const slides = getCarouselSlides(project)
    const nextCarouselIndex = getCarouselIndexFromSlideIndex(
      project,
      slideIndex,
    )
    const targetScrollLeft = getCarouselTargetScrollLeft(
      carousel,
      nextCarouselIndex,
    )
    const initialScrollLeft = carousel.scrollLeft
    const currentTween = horizontalScrollTweenRefs.current[project.slug]
    const currentCarouselIndex = Math.max(
      0,
      Math.min(slides.length - 1, Math.round(getCarouselPosition(carousel))),
    )
    const isBoundaryTravel =
      boundarySourceIndex !== undefined &&
      boundarySourceIndex !== nextCarouselIndex
    const shouldBlurBoundary =
      slides.length > 2 &&
      (isBoundaryTravel ||
        isCarouselBoundaryJump(
          currentCarouselIndex,
          nextCarouselIndex,
          slides.length,
        ))

    if (
      behavior !== 'smooth' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      currentTween?.kill()
      horizontalScrollTweenRefs.current[project.slug] = null
      setProjectBoundaryBlur(project.slug, false)
      carousel.style.removeProperty('scroll-snap-type')
      carousel.scrollTo({ left: targetScrollLeft, behavior: 'auto' })
      if (syncIndicator) {
        slideIndicatorMotionControllerRef.current?.update(nextCarouselIndex)
        slideIndicatorMotionControllerRef.current?.complete(nextCarouselIndex)
      }
      onComplete?.()
      return
    }

    carousel.style.scrollSnapType = 'none'
    const distanceInSlides =
      Math.abs(targetScrollLeft - carousel.scrollLeft) /
      Math.max(carousel.clientWidth, 1)
    const tween = gsap.to(carousel, {
      scrollLeft: targetScrollLeft,
      duration: getNavigationTravelDuration(distanceInSlides),
      ease: NAVIGATION_TRAVEL_EASE,
      overwrite: 'auto',
      onUpdate: () => {
        if (!syncIndicator) return
        if (boundarySourceIndex === undefined) {
          slideIndicatorMotionControllerRef.current?.update(
            getCarouselPosition(carousel),
          )
          return
        }

        const scrollDistance = targetScrollLeft - initialScrollLeft
        const progress =
          Math.abs(scrollDistance) < 0.5
            ? 1
            : gsap.utils.clamp(
                0,
                1,
                (carousel.scrollLeft - initialScrollLeft) / scrollDistance,
              )
        slideIndicatorMotionControllerRef.current?.update(
          gsap.utils.interpolate(
            boundarySourceIndex,
            nextCarouselIndex,
            progress,
          ),
        )
      },
      onComplete: () => {
        if (horizontalScrollTweenRefs.current[project.slug] !== tween) return
        horizontalScrollTweenRefs.current[project.slug] = null
        carousel.style.removeProperty('scroll-snap-type')
        carousel.scrollTo({ left: targetScrollLeft, behavior: 'auto' })
        setProjectBoundaryBlur(project.slug, false)
        if (syncIndicator) {
          slideIndicatorMotionControllerRef.current?.update(nextCarouselIndex)
          slideIndicatorMotionControllerRef.current?.complete(nextCarouselIndex)
        }
        onComplete?.()
      },
      onInterrupt: () => {
        if (horizontalScrollTweenRefs.current[project.slug] === tween) {
          horizontalScrollTweenRefs.current[project.slug] = null
          setProjectBoundaryBlur(project.slug, false)
        }
      },
    })

    horizontalScrollTweenRefs.current[project.slug] = tween
    setProjectBoundaryBlur(project.slug, shouldBlurBoundary)
  }

  const syncHorizontalViewports = (
    slideIndexes: number[],
    behavior: ScrollBehavior,
  ) => {
    projects.forEach((project, projectIndex) => {
      scrollHorizontalToRealIndex(
        project,
        slideIndexes[projectIndex] ?? 0,
        behavior,
      )
    })
  }

  const syncViewport = (
    projectIndex: number,
    slideIndexes: number[],
    behavior: ScrollBehavior,
  ) => {
    const vertical = verticalRef.current
    vertical?.scrollTo({
      top: vertical.clientHeight * (projectIndex + 1),
      behavior,
    })
    syncHorizontalViewports(slideIndexes, behavior)
  }

  const clearHorizontalScrollSync = (project?: PortfolioProject) => {
    if (
      project &&
      horizontalScrollSyncProjectRef.current &&
      horizontalScrollSyncProjectRef.current !== project.slug
    ) {
      return
    }

    const syncedProjectSlug = horizontalScrollSyncProjectRef.current
    horizontalScrollSyncProjectRef.current = null
    const slug = project?.slug ?? syncedProjectSlug
    if (slug) {
      delete horizontalTargetSlideIndexesRef.current[slug]
      delete horizontalKeyboardIndicatorIndexesRef.current[slug]
      delete horizontalPendingNavigationIntentRefs.current[slug]
    }
    if (horizontalScrollSyncTimeoutRef.current) {
      clearTimeout(horizontalScrollSyncTimeoutRef.current)
      horizontalScrollSyncTimeoutRef.current = null
    }
  }

  const beginHorizontalScrollSync = (project: PortfolioProject) => {
    clearHorizontalScrollSync()
    horizontalScrollSyncProjectRef.current = project.slug
    horizontalScrollSyncTimeoutRef.current = setTimeout(() => {
      if (horizontalScrollSyncProjectRef.current === project.slug) {
        horizontalScrollSyncProjectRef.current = null
        delete horizontalTargetSlideIndexesRef.current[project.slug]
      }
      horizontalScrollSyncTimeoutRef.current = null
    }, 1000)
  }

  const setActiveSlide = async (
    projectIndex: number,
    realIndex: number,
    mode: 'push' | 'replace',
    scrollBehavior: ScrollBehavior,
    boundarySourceIndex?: number,
  ) => {
    const project = projects[projectIndex]
    const slides = projectSlides[project.slug]
    const nextIndex = positiveModulo(realIndex, slides.length)
    const nextSlide = slides[nextIndex]
    const nextScreenshotId =
      nextSlide.kind === 'screenshot' ? nextSlide.screenshot.id : null
    const currentSlideIndex =
      horizontalTargetSlideIndexesRef.current[project.slug] ??
      activeSlideIndexes[projectIndex] ??
      0
    if (
      isInlineZoomPresentationActive &&
      nextScreenshotId &&
      nextIndex !== currentSlideIndex
    ) {
      inlineZoomHandoffScreenshotIdRef.current = nextScreenshotId
    }
    const horizontalIntent =
      (horizontalPendingNavigationIntentRefs.current[project.slug] ?? 0) + 1
    horizontalPendingNavigationIntentRefs.current[project.slug] =
      horizontalIntent
    horizontalTargetSlideIndexesRef.current[project.slug] = nextIndex
    horizontalKeyboardIndicatorIndexesRef.current[project.slug] =
      getCarouselIndexFromSlideIndex(project, nextIndex)
    setNavigationTargetSlideIndex(project.slug, nextIndex)
    const canNavigate = await prepareMediaNavigation(
      { kind: 'slide', projectIndex, slideIndex: nextIndex },
      getSlideMediaKey(project, nextSlide, isWideLayout),
    )

    if (!canNavigate) {
      if (
        nextScreenshotId &&
        inlineZoomHandoffScreenshotIdRef.current === nextScreenshotId
      ) {
        inlineZoomHandoffScreenshotIdRef.current = null
      }
      if (
        horizontalPendingNavigationIntentRefs.current[project.slug] ===
        horizontalIntent
      ) {
        delete horizontalPendingNavigationIntentRefs.current[project.slug]
        delete horizontalTargetSlideIndexesRef.current[project.slug]
        setNavigationTargetSlideIndex(project.slug)
      }
      return
    }

    if (
      horizontalPendingNavigationIntentRefs.current[project.slug] !==
      horizontalIntent
    ) {
      return
    }
    delete horizontalPendingNavigationIntentRefs.current[project.slug]

    if (nextSlide.kind === 'description') resetDescriptionScroll(project)
    if (scrollBehavior === 'smooth') beginHorizontalScrollSync(project)

    horizontalTargetSlideIndexesRef.current[project.slug] = nextIndex
    horizontalKeyboardIndicatorIndexesRef.current[project.slug] =
      getCarouselIndexFromSlideIndex(project, nextIndex)
    const nextCarouselIndex = getCarouselIndexFromSlideIndex(project, nextIndex)
    slideIndicatorMotionControllerRef.current?.begin(nextCarouselIndex)
    scrollHorizontalToRealIndex(
      project,
      nextIndex,
      scrollBehavior,
      () => {
        updateUrl(project, nextSlide, mode)
        startTransition(() => {
          setActiveSlideIndexes(indexes =>
            indexes.map((index, currentProjectIndex) =>
              currentProjectIndex === projectIndex ? nextIndex : index,
            ),
          )
          setNavigationTargetSlideIndex(project.slug)
        })
      },
      { syncIndicator: true, boundarySourceIndex },
    )
  }

  const moveHorizontal = (direction: -1 | 1) => {
    if (activeProjectIndex < 0) return
    const project = projects[activeProjectIndex]
    const slides = getCarouselSlides(project)
    const currentSlideIndex =
      horizontalTargetSlideIndexesRef.current[project.slug] ??
      activeSlideIndexes[activeProjectIndex] ??
      0
    const currentCarouselIndex = getCarouselIndexFromSlideIndex(
      project,
      currentSlideIndex,
    )
    const nextCarouselIndex = positiveModulo(
      currentCarouselIndex + direction,
      slides.length,
    )
    void setActiveSlide(
      activeProjectIndex,
      getSlideIndexFromCarouselIndex(project, nextCarouselIndex),
      'push',
      'smooth',
    )
  }

  const clickHorizontalSlideIndicator = (direction: -1 | 1) => {
    const navigation = document.querySelector(
      '[data-portfolio-slide-indicators]',
    )
    const activeButton = navigation?.querySelector<HTMLButtonElement>(
      'button[data-portfolio-slide-indicator-index][aria-current="true"]',
    )
    if (!navigation || !activeButton) return false

    const buttons = Array.from(
      navigation.querySelectorAll<HTMLButtonElement>(
        'button[data-portfolio-slide-indicator-index]',
      ),
    ).filter(button => button.parentElement?.style.pointerEvents !== 'none')
    const activeProject =
      activeProjectIndex >= 0 ? projects[activeProjectIndex] : undefined
    const activeIndex =
      !isModalVisible && activeProject
        ? (horizontalKeyboardIndicatorIndexesRef.current[activeProject.slug] ??
          Number(activeButton.dataset.portfolioSlideIndicatorIndex))
        : Number(activeButton.dataset.portfolioSlideIndicatorIndex)
    const targetIndex = positiveModulo(activeIndex + direction, buttons.length)
    const targetButton = buttons.find(
      button =>
        Number(button.dataset.portfolioSlideIndicatorIndex) === targetIndex,
    )
    if (!targetButton) return false

    if (!isModalVisible && activeProject) {
      horizontalKeyboardIndicatorIndexesRef.current[activeProject.slug] =
        targetIndex
    }
    targetButton.click()
    return true
  }

  const updateActiveSlideFromScrollEvent = useEffectEvent(
    (
      project: PortfolioProject,
      projectIndex: number,
      carousel: HTMLDivElement,
    ) => {
      if (!initialRevealCompleteRef.current && scrollSyncRef.current) return
      if (
        horizontalPendingNavigationIntentRefs.current[project.slug] !==
          undefined ||
        horizontalScrollTweenRefs.current[project.slug]
      ) {
        return
      }

      const slides = getCarouselSlides(project)
      const carouselPosition = getCarouselPosition(carousel)
      setProjectBoundaryBlur(project.slug, false)
      const realIndex = Math.max(
        0,
        Math.min(slides.length - 1, Math.round(carouselPosition)),
      )
      const nextSlideIndex = getSlideIndexFromCarouselIndex(project, realIndex)
      if (horizontalScrollSyncProjectRef.current === project.slug) return

      setActiveSlideIndexes(indexes => {
        if (indexes[projectIndex] === nextSlideIndex) return indexes
        return indexes.map((index, currentProjectIndex) =>
          currentProjectIndex === projectIndex ? nextSlideIndex : index,
        )
      })
    },
  )

  const handleHorizontalScrollEndEvent = useEffectEvent(
    (
      project: PortfolioProject,
      projectIndex: number,
      carousel: HTMLDivElement,
    ) => {
      if (!initialRevealCompleteRef.current && scrollSyncRef.current) return
      if (
        horizontalPendingNavigationIntentRefs.current[project.slug] !==
          undefined ||
        horizontalScrollTweenRefs.current[project.slug]
      ) {
        return
      }

      const slides = getCarouselSlides(project)
      const carouselPosition = getCarouselPosition(carousel)
      const isBeforeFirstSlide = slides.length > 1 && carouselPosition < -0.01
      const isAfterLastSlide =
        slides.length > 1 && carouselPosition > slides.length - 1 + 0.01
      if (isBeforeFirstSlide || isAfterLastSlide) {
        const sourceIndex = isBeforeFirstSlide ? 0 : slides.length - 1
        const targetIndex = isBeforeFirstSlide ? slides.length - 1 : 0
        void setActiveSlide(
          projectIndex,
          getSlideIndexFromCarouselIndex(project, targetIndex),
          'replace',
          'smooth',
          sourceIndex,
        )
        return
      }

      const nextIndex = Math.max(
        0,
        Math.min(slides.length - 1, Math.round(carouselPosition)),
      )
      const settledScrollLeft = getCarouselTargetScrollLeft(carousel, nextIndex)
      if (Math.abs(carousel.scrollLeft - settledScrollLeft) > 0.5) {
        carousel.scrollTo({ left: settledScrollLeft, behavior: 'auto' })
      }

      const nextSlideIndex = getSlideIndexFromCarouselIndex(project, nextIndex)
      const nextSlide = projectSlides[project.slug][nextSlideIndex]
      setActiveSlideIndexes(indexes =>
        indexes.map((index, currentProjectIndex) =>
          currentProjectIndex === projectIndex ? nextSlideIndex : index,
        ),
      )
      if (nextSlide.kind === 'description') resetDescriptionScroll(project)
      if (projectIndex === activeProjectIndex) {
        if (isModalOpen && isModalScreenshotSlide(project, nextSlide)) {
          replaceModalUrl(project, nextSlide)
        } else {
          updateUrl(project, nextSlide, 'replace')
        }
        settleHorizontalNavigation()
      }
      setProjectBoundaryBlur(project.slug, false)
      clearHorizontalScrollSync(project)
    },
  )

  useEffect(() => {
    const unsubscribe = projects.flatMap((project, projectIndex) => {
      const carousel = horizontalRefs.current[project.slug]
      return carousel
        ? [
            subscribeToCarousel(
              project,
              projectIndex,
              carousel,
              updateActiveSlideFromScrollEvent,
              handleHorizontalScrollEndEvent,
            ),
          ]
        : []
    })
    return () => unsubscribe.forEach(cleanup => cleanup())
  }, [projects])

  useEffect(
    () => () => {
      const syncedProjectSlug = horizontalScrollSyncProjectRef.current
      horizontalScrollSyncProjectRef.current = null
      if (syncedProjectSlug) {
        delete horizontalTargetSlideIndexesRef.current[syncedProjectSlug]
        delete horizontalKeyboardIndicatorIndexesRef.current[syncedProjectSlug]
        delete horizontalPendingNavigationIntentRefs.current[syncedProjectSlug]
      }
      if (horizontalScrollSyncTimeoutRef.current) {
        clearTimeout(horizontalScrollSyncTimeoutRef.current)
        horizontalScrollSyncTimeoutRef.current = null
      }
      Object.values(horizontalScrollTweenRefs.current).forEach(tween =>
        tween?.kill(),
      )
      Object.values(horizontalRefs.current).forEach(carousel =>
        carousel?.style.removeProperty('scroll-snap-type'),
      )
    },
    [],
  )

  return {
    beginHorizontalScrollSync,
    boundaryBlurProjectSlugs,
    clearHorizontalScrollSync,
    clickHorizontalSlideIndicator,
    getCarouselIndexFromSlideIndex,
    getCarouselSlides,
    moveHorizontal,
    navigationTargetSlideIndexes,
    resetDescriptionScroll,
    scrollHorizontalToRealIndex,
    setActiveSlide,
    setDescriptionRef,
    setHorizontalRef,
    syncHorizontalViewports,
    syncViewport,
  }
}
