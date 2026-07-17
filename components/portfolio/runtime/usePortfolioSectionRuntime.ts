import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from 'react'
import { gsap } from 'gsap'
import type { PortfolioProject } from '@/lib/portfolio'
import {
  NAVIGATION_TRAVEL_EASE,
  getNavigationTravelDuration,
} from '@/components/portfolio/domain/carousel'
import {
  getSlideMediaKey,
  getVerticalTargetProjectIndex,
  type ProjectSlide,
} from '@/components/portfolio/domain/slides'
import type { SectionNavigationHandle } from '@/components/portfolio/navigation/SectionNavigation'
import type { PendingNavigation } from './types'

const START_SCREEN_INDEX = -1

type UsePortfolioSectionRuntimeOptions = {
  projects: PortfolioProject[]
  projectSlides: Record<string, ProjectSlide[]>
  activeProjectIndex: number
  activeSlideIndexes: number[]
  setActiveProjectIndex: (projectIndex: number) => void
  setActiveSlideIndexes: Dispatch<SetStateAction<number[]>>
  isWideLayout: boolean
  sectionNavigationControllerRef: RefObject<SectionNavigationHandle | null>
  scrollSyncRef: MutableRefObject<boolean>
  verticalRef: RefObject<HTMLDivElement | null>
  prepareMediaNavigation: (
    pending: Exclude<PendingNavigation, null>,
    mediaKeys?: string | string[],
  ) => Promise<boolean>
  invalidateNavigation: () => void
  resetDescriptionScroll: (project: PortfolioProject) => void
  scrollHorizontalToRealIndex: (
    project: PortfolioProject,
    slideIndex: number,
    behavior: ScrollBehavior,
    onComplete?: () => void,
  ) => void
  updateUrl: (
    project: PortfolioProject | undefined,
    slide: ProjectSlide | undefined,
    mode: 'push' | 'replace',
  ) => void
}

export function usePortfolioSectionRuntime({
  projects,
  projectSlides,
  activeProjectIndex,
  activeSlideIndexes,
  setActiveProjectIndex,
  setActiveSlideIndexes,
  isWideLayout,
  sectionNavigationControllerRef,
  scrollSyncRef,
  verticalRef,
  prepareMediaNavigation,
  invalidateNavigation,
  resetDescriptionScroll,
  scrollHorizontalToRealIndex,
  updateUrl,
}: UsePortfolioSectionRuntimeOptions) {
  const verticalScrollTweenRef = useRef<gsap.core.Tween | null>(null)

  const restoreVerticalScrollSnap = useCallback(() => {
    const vertical = verticalRef.current
    vertical?.style.removeProperty('scroll-snap-type')
    vertical?.removeAttribute('data-portfolio-programmatic-scroll')
  }, [])

  const cancelVerticalScrollTween = useCallback(() => {
    verticalScrollTweenRef.current?.kill()
    verticalScrollTweenRef.current = null
    restoreVerticalScrollSnap()
  }, [restoreVerticalScrollSnap])

  const cancelVerticalUserTravel = useCallback(() => {
    cancelVerticalScrollTween()
    sectionNavigationControllerRef.current?.cancel()
  }, [cancelVerticalScrollTween, sectionNavigationControllerRef])

  const setActiveProject = useCallback(
    async (
      nextProjectIndex: number,
      mode: 'push' | 'replace',
      behavior: ScrollBehavior = 'smooth',
      targetSlideIndex?: number,
    ) => {
      const boundedIndex = Math.max(
        START_SCREEN_INDEX,
        Math.min(projects.length - 1, nextProjectIndex),
      )
      const vertical = verticalRef.current

      if (boundedIndex !== START_SCREEN_INDEX) {
        const project = projects[boundedIndex]
        const slideIndex =
          targetSlideIndex ?? activeSlideIndexes[boundedIndex] ?? 0
        const slide = projectSlides[project.slug][slideIndex]
        const canNavigate = await prepareMediaNavigation(
          { kind: 'project', projectIndex: boundedIndex },
          getSlideMediaKey(project, slide, isWideLayout),
        )
        if (!canNavigate) return
      } else {
        invalidateNavigation()
      }

      setActiveProjectIndex(boundedIndex)
      if (vertical) {
        const targetScrollTop = vertical.clientHeight * (boundedIndex + 1)
        const distanceInScreens =
          Math.abs(targetScrollTop - vertical.scrollTop) /
          Math.max(vertical.clientHeight, 1)
        cancelVerticalScrollTween()

        if (
          behavior !== 'smooth' ||
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
          vertical.scrollTo({ top: targetScrollTop, behavior: 'auto' })
        } else {
          vertical.style.setProperty('scroll-snap-type', 'none')
          vertical.setAttribute('data-portfolio-programmatic-scroll', 'true')
          const tween = gsap.to(vertical, {
            scrollTop: targetScrollTop,
            duration: getNavigationTravelDuration(distanceInScreens),
            ease: NAVIGATION_TRAVEL_EASE,
            overwrite: 'auto',
            onUpdate: () =>
              sectionNavigationControllerRef.current?.syncSourcePosition(),
            onComplete: () => {
              if (verticalScrollTweenRef.current === tween) {
                verticalScrollTweenRef.current = null
              }
              restoreVerticalScrollSnap()
            },
            onInterrupt: () => {
              if (verticalScrollTweenRef.current === tween) {
                verticalScrollTweenRef.current = null
              }
              restoreVerticalScrollSnap()
            },
          })
          verticalScrollTweenRef.current = tween
        }
      }

      if (boundedIndex === START_SCREEN_INDEX) {
        updateUrl(undefined, undefined, mode)
        return
      }

      const project = projects[boundedIndex]
      const slideIndex =
        targetSlideIndex ?? activeSlideIndexes[boundedIndex] ?? 0
      const slide = projectSlides[project.slug][slideIndex]
      if (targetSlideIndex !== undefined) {
        setActiveSlideIndexes(indexes =>
          indexes.map((index, projectIndex) =>
            projectIndex === boundedIndex ? slideIndex : index,
          ),
        )
      }
      if (slide.kind === 'description') resetDescriptionScroll(project)
      scrollHorizontalToRealIndex(project, slideIndex, 'auto')
      updateUrl(project, slide, mode)
    },
    [
      activeSlideIndexes,
      cancelVerticalScrollTween,
      invalidateNavigation,
      isWideLayout,
      prepareMediaNavigation,
      projectSlides,
      projects,
      resetDescriptionScroll,
      restoreVerticalScrollSnap,
      scrollHorizontalToRealIndex,
      setActiveProjectIndex,
      setActiveSlideIndexes,
      updateUrl,
    ],
  )

  const moveVertical = useCallback(
    (direction: -1 | 1) => {
      void setActiveProject(
        getVerticalTargetProjectIndex(
          activeProjectIndex,
          direction,
          projects.length,
        ),
        'push',
      )
    },
    [activeProjectIndex, projects.length, setActiveProject],
  )

  const clickVerticalSectionNavButton = useCallback(
    (direction: -1 | 1) => {
      const pendingItemIndex =
        sectionNavigationControllerRef.current?.getPinnedIndex() ?? null
      const baseProjectIndex =
        pendingItemIndex === null ? activeProjectIndex : pendingItemIndex - 1
      const targetProjectIndex = getVerticalTargetProjectIndex(
        baseProjectIndex,
        direction,
        projects.length,
      )
      return (
        sectionNavigationControllerRef.current?.click(
          targetProjectIndex + 1,
          'left',
        ) ?? false
      )
    },
    [activeProjectIndex, projects.length, sectionNavigationControllerRef],
  )

  const handleVerticalScrollEndEvent = useEffectEvent(
    (vertical: HTMLDivElement) => {
      if (scrollSyncRef.current || verticalScrollTweenRef.current) return
      const screenIndex =
        Math.round(vertical.scrollTop / vertical.clientHeight) - 1
      const nextProjectIndex = Math.max(
        START_SCREEN_INDEX,
        Math.min(projects.length - 1, screenIndex),
      )
      setActiveProjectIndex(nextProjectIndex)

      if (nextProjectIndex === START_SCREEN_INDEX) {
        updateUrl(undefined, undefined, 'replace')
        return
      }

      const project = projects[nextProjectIndex]
      const slideIndex = activeSlideIndexes[nextProjectIndex] ?? 0
      const slide = projectSlides[project.slug][slideIndex]
      if (slide.kind === 'description') resetDescriptionScroll(project)
      updateUrl(project, slide, 'replace')
    },
  )

  useEffect(() => {
    const vertical = verticalRef.current
    if (!vertical) return
    const handleScrollEnd = () => {
      handleVerticalScrollEndEvent(vertical)
      sectionNavigationControllerRef.current?.settle('vertical')
    }
    vertical.addEventListener('scrollend', handleScrollEnd)
    return () => vertical.removeEventListener('scrollend', handleScrollEnd)
  }, [sectionNavigationControllerRef])

  useEffect(
    () => () => {
      verticalScrollTweenRef.current?.kill()
      verticalScrollTweenRef.current = null
      restoreVerticalScrollSnap()
    },
    [restoreVerticalScrollSnap],
  )

  return {
    cancelVerticalUserTravel,
    clickVerticalSectionNavButton,
    moveVertical,
    setActiveProject,
    verticalRef,
  }
}
