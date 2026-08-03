'use client'

import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { portfolioSlides } from '@/lib/portfolio'
import { pageTitle } from '@/components/portfolio/domain/routing'
import {
  getSlideMediaKey,
  isAboutMeTextScreenshot,
  modalMediaKey,
} from '@/components/portfolio/domain/slides'
import { usePortfolioMediaReadiness } from '@/components/portfolio/usePortfolioMediaReadiness'
import { usePortfolioLayout } from '@/components/portfolio/runtime/usePortfolioLayout'
import { usePortfolioModel } from '@/components/portfolio/runtime/usePortfolioModel'
import { usePortfolioSelection } from '@/components/portfolio/runtime/usePortfolioSelection'
import { usePortfolioHistory } from '@/components/portfolio/runtime/usePortfolioHistory'
import { usePortfolioMediaNavigation } from '@/components/portfolio/runtime/usePortfolioMediaNavigation'
import { usePortfolioCarouselRuntime } from '@/components/portfolio/runtime/usePortfolioCarouselRuntime'
import { usePortfolioSectionRuntime } from '@/components/portfolio/runtime/usePortfolioSectionRuntime'
import { usePortfolioModalRuntime } from '@/components/portfolio/runtime/usePortfolioModalRuntime'
import { usePortfolioIntroReveal } from '@/components/portfolio/runtime/usePortfolioIntroReveal'
import { usePortfolioKeyboardNavigation } from '@/components/portfolio/runtime/usePortfolioKeyboardNavigation'
import { useInlineZoomPresentation } from '@/components/portfolio/runtime/useInlineZoomPresentation'
import type { SlideIndicatorMotionController } from '@/components/portfolio/navigation/SlideNavigation'
import type { SectionNavigationHandle } from '@/components/portfolio/navigation/SectionNavigation'
import type { ModalTransitionRect } from '@/components/portfolio/presentation/ImageModal'
import { PortfolioBrowserView } from '@/components/portfolio/presentation/PortfolioBrowserView'

type PortfolioBrowserProps = {
  initialProjectSlug?: string
  initialScreenshotSlug?: string
  initialModalOpen?: boolean
}

const START_SCREEN_INDEX = -1

export function PortfolioBrowser({
  initialProjectSlug,
  initialScreenshotSlug,
  initialModalOpen = false,
}: PortfolioBrowserProps) {
  const keyboardSurfaceRef = useRef<HTMLElement>(null)
  const verticalRef = useRef<HTMLDivElement>(null)
  const slideIndicatorMotionControllerRef =
    useRef<SlideIndicatorMotionController | null>(null)
  const sectionNavigationControllerRef = useRef<SectionNavigationHandle | null>(
    null,
  )
  const scrollSyncRef = useRef(false)
  const curtainRef = useRef<HTMLDivElement>(null)
  const initialRevealCompleteRef = useRef(false)
  const sectionMenuTitleRefs = useRef<Array<HTMLSpanElement | null>>([])
  const [sectionNavHovered, setSectionNavHovered] = useState(false)
  const {
    failure: mediaFailure,
    registerMediaElement,
    ensureMediaReady,
    preloadQueue,
    isMediaReady,
  } = usePortfolioMediaReadiness()
  const { invalidateNavigation, pendingNavigation, prepareMediaNavigation } =
    usePortfolioMediaNavigation({ ensureMediaReady, isMediaReady })
  const settleSectionNavClickTargets = (axis: 'horizontal' | 'vertical') => {
    sectionNavigationControllerRef.current?.settle(axis)
  }
  const settleHorizontalSectionNavClickTargets = () => {
    sectionNavigationControllerRef.current?.settle('horizontal')
  }

  const {
    backgroundMediaQueue,
    initialSlideIndexes,
    initialTargetScreenshot,
    normalizedInitialProjectIndex,
    openingMediaKeys,
    projectCarouselsReady,
    projectSlides,
    sectionEntryMediaReady,
  } = usePortfolioModel({
    projects: portfolioSlides,
    initialProjectSlug,
    initialScreenshotSlug,
    isMediaReady,
  })
  const {
    selection,
    setProjectIndex: setActiveProjectIndex,
    setSlideIndexes: setActiveSlideIndexes,
  } = usePortfolioSelection({
    projectIndex: normalizedInitialProjectIndex,
    slideIndexes: initialSlideIndexes,
  })
  const activeProjectIndex = selection.projectIndex
  const activeSlideIndexes = selection.slideIndexes
  const { isTouchInput, isTouchLandscapeLayout, isWideLayout } =
    usePortfolioLayout()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isModalClosing, setIsModalClosing] = useState(false)
  const [modalTransitionRect, setModalTransitionRect] =
    useState<ModalTransitionRect | null>(null)
  const {
    modalHistoryEntryRef,
    readLocationState,
    replaceModalUrl,
    updateUrl,
  } = usePortfolioHistory({
    projects: portfolioSlides,
    projectSlides,
    setIsModalOpen,
  })
  const activeProject =
    activeProjectIndex >= 0 ? portfolioSlides[activeProjectIndex] : undefined
  const activeSlides = activeProject ? projectSlides[activeProject.slug] : []
  const activeSlideIndex =
    activeProjectIndex >= 0 ? activeSlideIndexes[activeProjectIndex] : 0
  const activeSlide = activeSlides[activeSlideIndex]
  const activeScreenshot =
    activeSlide?.kind === 'screenshot' ? activeSlide.screenshot : undefined
  const {
    exitPresentation: exitInlineZoomPresentation,
    handoffScreenshotIdRef: inlineZoomHandoffScreenshotIdRef,
    handlePresentationChange: handleInlinePresentationChange,
    isPresentationActive: isInlineZoomPresentationActive,
  } = useInlineZoomPresentation({ activeProjectIndex, activeScreenshot })
  const shouldShowModal =
    isModalOpen &&
    Boolean(activeProject) &&
    Boolean(activeScreenshot) &&
    !(
      activeProject &&
      activeScreenshot &&
      isAboutMeTextScreenshot(activeProject, activeScreenshot)
    )
  const isModalPresentationActive = shouldShowModal && !isModalClosing
  const isModalLayerActive = shouldShowModal
  const {
    beginHorizontalScrollSync,
    boundaryBlurProjectSlugs,
    clearHorizontalScrollSync,
    clickHorizontalSlideIndicator,
    getCarouselIndexFromSlideIndex,
    getCarouselSlides,
    moveHorizontal,
    resetDescriptionScroll,
    scrollHorizontalToRealIndex,
    setActiveSlide,
    setDescriptionRef,
    setHorizontalRef,
    syncHorizontalViewports,
    syncViewport,
  } = usePortfolioCarouselRuntime({
    projects: portfolioSlides,
    projectSlides,
    activeProjectIndex,
    activeSlideIndexes,
    setActiveSlideIndexes,
    isWideLayout,
    isModalOpen,
    isModalVisible: shouldShowModal,
    isInlineZoomPresentationActive,
    initialRevealCompleteRef,
    scrollSyncRef,
    verticalRef,
    slideIndicatorMotionControllerRef,
    inlineZoomHandoffScreenshotIdRef,
    prepareMediaNavigation,
    updateUrl,
    replaceModalUrl,
    settleHorizontalNavigation: settleHorizontalSectionNavClickTargets,
  })
  const {
    cancelVerticalUserTravel,
    clickVerticalSectionNavButton,
    moveVertical,
    setActiveProject,
  } = usePortfolioSectionRuntime({
    projects: portfolioSlides,
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
  })
  const {
    closeModal,
    finishCloseModal,
    moveModalHorizontal,
    reopenModal,
    setActiveModalSlide,
  } = usePortfolioModalRuntime({
    activeProject,
    activeProjectIndex,
    activeSlide,
    activeSlideIndex,
    projectSlides,
    shouldShowModal,
    setIsModalOpen,
    isModalClosing,
    setIsModalClosing,
    modalTransitionRect,
    setModalTransitionRect,
    modalHistoryEntryRef,
    slideIndicatorMotionControllerRef,
    setActiveSlideIndexes,
    prepareMediaNavigation,
    beginHorizontalScrollSync,
    clearHorizontalScrollSync,
    scrollHorizontalToRealIndex,
    replaceModalUrl,
  })
  const renderedIntroPhase = usePortfolioIntroReveal({
    projects: portfolioSlides,
    projectSlides,
    normalizedInitialProjectIndex,
    initialSlideIndexes,
    initialTargetScreenshot,
    initialModalOpen,
    openingMediaKeys,
    backgroundMediaQueue,
    mediaFailure,
    ensureMediaReady,
    preloadQueue,
    setIsModalOpen,
    replaceModalUrl,
    syncHorizontalViewports,
    curtainRef,
    verticalRef,
    sectionNavigationControllerRef,
    initialRevealCompleteRef,
    scrollSyncRef,
  })
  const focusKeyboardSurface = usePortfolioKeyboardNavigation({
    projectCount: portfolioSlides.length,
    keyboardSurfaceRef,
    sectionNavigationControllerRef,
    shouldShowModal,
    isModalClosing,
    isInlineZoomPresentationActive,
    closeModal,
    reopenModal,
    exitInlineZoomPresentation,
    clickHorizontalSlideIndicator,
    clickVerticalSectionNavButton,
    moveHorizontal,
    moveModalHorizontal,
    moveVertical,
    setActiveProject,
  })

  const applyLocationState = async (behavior: ScrollBehavior) => {
    const locationState = readLocationState()

    if (!locationState) {
      window.location.assign(window.location.href)
      return
    }

    const nextSlideIndexes = portfolioSlides.map((_, projectIndex) =>
      projectIndex === locationState.projectIndex
        ? locationState.slideIndex
        : (activeSlideIndexes[projectIndex] ?? 0),
    )

    if (locationState.projectIndex >= 0) {
      const project = portfolioSlides[locationState.projectIndex]
      const slide = projectSlides[project.slug][locationState.slideIndex]
      const requiredKeys = [
        getSlideMediaKey(project, slide, isWideLayout),
        locationState.modalOpen && slide.kind === 'screenshot'
          ? modalMediaKey(slide.screenshot)
          : undefined,
      ].filter((key): key is string => Boolean(key))
      const canNavigate = await prepareMediaNavigation(
        locationState.modalOpen && slide.kind === 'screenshot'
          ? { kind: 'modal', screenshotId: slide.screenshot.id }
          : {
              kind: 'slide',
              projectIndex: locationState.projectIndex,
              slideIndex: locationState.slideIndex,
            },
        requiredKeys,
      )

      if (!canNavigate) {
        return
      }
    } else {
      invalidateNavigation()
    }

    setActiveProjectIndex(locationState.projectIndex)
    setActiveSlideIndexes(nextSlideIndexes)
    setIsModalOpen(locationState.modalOpen)

    if (locationState.projectIndex === START_SCREEN_INDEX) {
      document.title = pageTitle()
    }

    if (locationState.projectIndex >= 0) {
      const project = portfolioSlides[locationState.projectIndex]
      const slide = projectSlides[project.slug][locationState.slideIndex]
      document.title = pageTitle(project, slide)

      if (slide.kind === 'description') {
        resetDescriptionScroll(project)
      }
    }

    syncViewport(locationState.projectIndex, nextSlideIndexes, behavior)
  }
  const handlePopStateEvent = useEffectEvent(() => {
    modalHistoryEntryRef.current = false
    void applyLocationState('auto')
  })

  const syncCurrentViewportEvent = useEffectEvent(() => {
    if (!initialRevealCompleteRef.current) {
      syncHorizontalViewports(activeSlideIndexes, 'auto')
      return
    }

    syncViewport(activeProjectIndex, activeSlideIndexes, 'auto')
  })

  useEffect(() => {
    window.history.scrollRestoration = 'manual'

    window.addEventListener('popstate', handlePopStateEvent)
    return () => window.removeEventListener('popstate', handlePopStateEvent)
  }, [])

  useEffect(() => {
    window.addEventListener('resize', syncCurrentViewportEvent)
    return () => window.removeEventListener('resize', syncCurrentViewportEvent)
  }, [])

  useEffect(() => {
    syncCurrentViewportEvent()
  }, [isWideLayout])

  return (
    <PortfolioBrowserView
      model={{
        activeProjectIndex,
        activeSlideIndexes,
        boundaryBlurProjectSlugs,
        introPhase: renderedIntroPhase,
        isInlineZoomPresentationActive,
        isModalClosing,
        isModalLayerActive,
        isModalPresentationActive,
        isTouchInput,
        isTouchLandscapeLayout,
        isWideLayout,
        modalTransitionRect,
        pendingNavigation,
        projectCarouselsReady,
        projectSlides,
        sectionEntryMediaReady,
        sectionNavHovered,
        shouldShowModal,
      }}
      actions={{
        cancelVerticalUserTravel,
        closeModal,
        exitInlineZoomPresentation,
        finishCloseModal,
        focusKeyboardSurface,
        getCarouselIndexFromSlideIndex,
        getCarouselSlides,
        handleInlinePresentationChange,
        moveHorizontal,
        moveModalHorizontal,
        registerMediaElement,
        setActiveModalSlide,
        setActiveProject,
        setActiveSlide,
        setDescriptionRef,
        setHorizontalRef,
        setSectionNavHovered,
      }}
      refs={{
        curtainRef,
        keyboardSurfaceRef,
        sectionMenuTitleRefs,
        sectionNavigationControllerRef,
        slideIndicatorMotionControllerRef,
        verticalRef,
      }}
    />
  )
}
