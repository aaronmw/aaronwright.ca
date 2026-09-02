'use client'

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { EmblaCarouselType } from 'embla-carousel'
import useEmblaCarousel from 'embla-carousel-react'
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures'
import { gsap } from 'gsap'
import { portfolioSlides } from '@/lib/portfolio'
import {
  pageTitle,
  parsePortfolioRoute,
  projectUrl,
  viewerUrl,
} from './domain/routing'
import { isViewerScreenshotSlide } from './domain/slides'
import {
  getPortfolioViewerSlides,
  getViewerSlideIndex,
  type ViewerOpenIntent,
} from './domain/viewer'
import { usePortfolioMediaReadiness } from './usePortfolioMediaReadiness'
import { usePortfolioLayout } from './runtime/usePortfolioLayout'
import { usePortfolioModel } from './runtime/usePortfolioModel'
import { usePortfolioSelection } from './runtime/usePortfolioSelection'
import type { PortfolioIntroPhase } from './runtime/types'
import { installPortfolioWheelAxisLock } from './runtime/wheelAxisLock'
import {
  getLockedMouseDragAxis,
  installPortfolioMouseDragAxisLock,
} from './runtime/mouseDragAxisLock'
import { PortfolioBrowserView } from './presentation/PortfolioBrowserView'

type PortfolioBrowserProps = {
  initialProjectSlug?: string
  initialScreenshotSlug?: string
  initialViewerOpen?: boolean
}

type NavigationMode = 'push' | 'replace' | 'silent'

const START_SCREEN_INDEX = -1

const TEXT_ENTRY_SELECTOR =
  'input, textarea, select, [contenteditable], [role="textbox"], [role="spinbutton"]'
const ARROW_NAVIGATION_SELECTOR = `${TEXT_ENTRY_SELECTOR}, [role="menu"], [role="listbox"], [role="tree"], [role="grid"], [role="tablist"], [role="radiogroup"], [role="slider"], [aria-haspopup="menu"]`
const ACTIVATION_SELECTOR = `${TEXT_ENTRY_SELECTOR}, button, a, summary, [role="button"], [role="link"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], [role="tab"], [role="checkbox"], [role="radio"], [role="switch"]`
const ACTIVE_SLIDE_INDICATOR_SELECTOR =
  '[data-portfolio-slide-indicator-index][aria-current="true"]'

function targetMatches(target: EventTarget | null, selector: string) {
  const element =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null
  return Boolean(element?.closest(selector))
}

function isSelectableTextTarget(target: EventTarget | null) {
  return targetMatches(target, '[data-portfolio-selectable-text]')
}

function nextFrame() {
  return new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
}

export function PortfolioBrowser({
  initialProjectSlug,
  initialScreenshotSlug,
  initialViewerOpen = false,
}: PortfolioBrowserProps) {
  const keyboardSurfaceRef = useRef<HTMLElement>(null)
  const curtainRef = useRef<HTMLDivElement>(null)
  const horizontalApisRef = useRef(new Map<number, EmblaCarouselType>())
  const horizontalModesRef = useRef(new Map<number, NavigationMode>())
  const verticalModeRef = useRef<NavigationMode | null>(null)
  const verticalViewportElementRef = useRef<HTMLElement>(null)
  const viewerHistoryEntryRef = useRef(false)
  const pendingViewerCloseRef = useRef<{
    projectIndex: number
    slideIndex: number
  } | null>(null)
  const initialRevealStartedRef = useRef(false)
  const [introPhase, setIntroPhase] = useState<PortfolioIntroPhase>('loading')
  const [viewerIntent, setViewerIntent] = useState<ViewerOpenIntent | null>(
    null,
  )
  const { isTouchInput, isTouchLandscapeLayout, isWideLayout } =
    usePortfolioLayout()

  const {
    failure: mediaFailure,
    registerMediaElement,
    ensureMediaReady,
    preloadQueue,
    isMediaReady,
  } = usePortfolioMediaReadiness()
  const {
    backgroundMediaQueue,
    initialSlideIndexes,
    initialTargetScreenshot,
    normalizedInitialProjectIndex,
    openingMediaKeys,
    projectSlides,
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
  const selectionRef = useRef(selection)
  useLayoutEffect(() => {
    selectionRef.current = selection
  }, [selection])
  const [verticalPlugins] = useState(() => [
    WheelGesturesPlugin({ forceWheelAxis: 'y' }),
  ])
  const [verticalViewportRef, verticalApi] = useEmblaCarousel(
    {
      axis: 'y',
      align: 'start',
      loop: false,
      skipSnaps: false,
      startIndex: normalizedInitialProjectIndex + 1,
      watchDrag: (_api, event) => {
        if (event.type !== 'mousedown') return true
        if (isSelectableTextTarget(event.target)) return false
        if (!targetMatches(event.target, '[data-portfolio-carousel]')) {
          return true
        }
        return getLockedMouseDragAxis(event) === 'y'
      },
    },
    verticalPlugins,
  )
  const setVerticalViewportRef = useCallback(
    (node: HTMLElement | null) => {
      verticalViewportElementRef.current = node
      verticalViewportRef(node)
    },
    [verticalViewportRef],
  )

  useEffect(() => {
    const viewport = verticalViewportElementRef.current
    if (!verticalApi || !viewport) return
    const removeWheelAxisLock = installPortfolioWheelAxisLock(viewport)
    const removeMouseDragAxisLock = installPortfolioMouseDragAxisLock({
      root: viewport,
      targetSelector: '[data-portfolio-carousel]',
      ignoreTarget: isSelectableTextTarget,
    })

    return () => {
      removeWheelAxisLock()
      removeMouseDragAxisLock()
    }
  }, [verticalApi])

  const activeProject =
    selection.projectIndex >= 0
      ? portfolioSlides[selection.projectIndex]
      : undefined
  const activeSlides = activeProject ? projectSlides[activeProject.slug] : []
  const activeSlideIndex =
    selection.projectIndex >= 0
      ? (selection.slideIndexes[selection.projectIndex] ?? 0)
      : 0
  const viewerSlides = activeProject
    ? getPortfolioViewerSlides(activeProject)
    : []
  const viewerIndex = viewerIntent
    ? getViewerSlideIndex(viewerSlides, viewerIntent.mediaId)
    : 0

  const updateRoute = useCallback(
    (
      projectIndex: number,
      slideIndex: number,
      mode: 'push' | 'replace',
      viewerOpen = false,
    ) => {
      const project =
        projectIndex >= 0 ? portfolioSlides[projectIndex] : undefined
      const slide = project
        ? projectSlides[project.slug][slideIndex]
        : undefined
      const path = project && slide ? projectUrl(project, slide) : '/work'
      const url =
        viewerOpen && project && slide ? viewerUrl(project, slide) : path
      const current = `${window.location.pathname}${window.location.search}`
      if (current !== url) window.history[`${mode}State`]({}, '', url)
      document.title = pageTitle(project, slide)
    },
    [projectSlides],
  )

  const registerHorizontalApi = useCallback(
    (projectIndex: number, api: EmblaCarouselType | null) => {
      if (api) horizontalApisRef.current.set(projectIndex, api)
      else horizontalApisRef.current.delete(projectIndex)
    },
    [],
  )

  const commitHorizontalSelection = useCallback(
    (projectIndex: number, slideIndex: number, mode: NavigationMode) => {
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
    },
    [setActiveSlideIndexes, updateRoute],
  )

  const handleHorizontalSelect = useCallback(
    (projectIndex: number, slideIndex: number) => {
      const mode = horizontalModesRef.current.get(projectIndex) ?? 'replace'
      horizontalModesRef.current.delete(projectIndex)
      commitHorizontalSelection(projectIndex, slideIndex, mode)
    },
    [commitHorizontalSelection],
  )

  const selectHorizontal = useCallback(
    (
      projectIndex: number,
      slideIndex: number,
      mode: NavigationMode,
      jump = false,
    ) => {
      const api = horizontalApisRef.current.get(projectIndex)
      const slides = projectSlides[portfolioSlides[projectIndex].slug]
      const target = Math.max(0, Math.min(slides.length - 1, slideIndex))
      if (!api || api.selectedScrollSnap() === target) {
        commitHorizontalSelection(projectIndex, target, mode)
        return
      }
      horizontalModesRef.current.set(projectIndex, mode)
      api.scrollTo(target, jump)
    },
    [commitHorizontalSelection, projectSlides],
  )

  const commitVerticalSelection = useCallback(
    (projectIndex: number, mode: NavigationMode) => {
      setActiveProjectIndex(projectIndex)
      if (mode === 'silent') return
      const slideIndex =
        projectIndex >= 0
          ? (selectionRef.current.slideIndexes[projectIndex] ?? 0)
          : 0
      updateRoute(projectIndex, slideIndex, mode)
    },
    [setActiveProjectIndex, updateRoute],
  )

  const handleVerticalSelect = useEffectEvent((api: EmblaCarouselType) => {
    const mode = verticalModeRef.current ?? 'replace'
    verticalModeRef.current = null
    commitVerticalSelection(api.selectedScrollSnap() - 1, mode)
  })

  useEffect(() => {
    if (!verticalApi) return
    verticalApi.on('select', handleVerticalSelect)
    return () => {
      verticalApi.off('select', handleVerticalSelect)
    }
  }, [verticalApi])

  const setActiveProject = useCallback(
    (
      projectIndex: number,
      mode: 'push' | 'replace',
      jump = false,
      targetSlideIndex?: number,
    ) => {
      const target = Math.max(
        START_SCREEN_INDEX,
        Math.min(portfolioSlides.length - 1, projectIndex),
      )
      if (target >= 0 && targetSlideIndex !== undefined) {
        selectHorizontal(target, targetSlideIndex, 'silent', true)
      }
      const emblaIndex = target + 1
      if (!verticalApi || verticalApi.selectedScrollSnap() === emblaIndex) {
        commitVerticalSelection(target, mode)
        return
      }
      verticalModeRef.current = mode
      verticalApi.scrollTo(emblaIndex, jump)
    },
    [commitVerticalSelection, selectHorizontal, verticalApi],
  )

  const moveVertical = useCallback(
    (direction: -1 | 1) => {
      const screenIndex = selectionRef.current.projectIndex + 1
      const nextScreen = screenIndex + direction
      if (nextScreen < 0 || nextScreen > portfolioSlides.length) return
      setActiveProject(nextScreen - 1, 'push')
    },
    [setActiveProject],
  )

  const setActiveSlide = useCallback(
    (projectIndex: number, slideIndex: number, mode: 'push' | 'replace') => {
      selectHorizontal(projectIndex, slideIndex, mode)
    },
    [selectHorizontal],
  )

  const moveHorizontal = useCallback((direction: -1 | 1) => {
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
  }, [])

  const openViewer = useCallback(
    (intent: ViewerOpenIntent) => {
      const projectIndex = selectionRef.current.projectIndex
      if (projectIndex < 0) return
      const project = portfolioSlides[projectIndex]
      const slides = projectSlides[project.slug]
      const slideIndex = slides.findIndex(
        slide =>
          slide.kind === 'screenshot' && slide.screenshot.id === intent.mediaId,
      )
      if (
        slideIndex < 0 ||
        !isViewerScreenshotSlide(project, slides[slideIndex])
      ) {
        return
      }

      selectHorizontal(projectIndex, slideIndex, 'silent', true)
      updateRoute(projectIndex, slideIndex, 'push', true)
      viewerHistoryEntryRef.current = true
      setViewerIntent(intent)
    },
    [projectSlides, selectHorizontal, updateRoute],
  )

  const openActiveViewerFromKeyboard = useCallback(() => {
    const projectIndex = selectionRef.current.projectIndex
    if (projectIndex < 0) return false
    const project = portfolioSlides[projectIndex]
    const slideIndex = selectionRef.current.slideIndexes[projectIndex] ?? 0
    const slide = projectSlides[project.slug][slideIndex]
    if (!isViewerScreenshotSlide(project, slide)) return false
    const source = document.querySelector<HTMLElement>(
      `[data-portfolio-screenshot-id="${CSS.escape(slide.screenshot.id)}"][data-portfolio-viewer-source="active"]`,
    )
    const rect = source?.getBoundingClientRect()
    openViewer({
      mediaId: slide.screenshot.id,
      activationKind: 'keyboard',
      sourceRect: rect
        ? {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          }
        : null,
    })
    return true
  }, [openViewer, projectSlides])

  const handleViewerView = useCallback(
    (nextViewerIndex: number) => {
      const projectIndex = selectionRef.current.projectIndex
      if (projectIndex < 0) return
      const project = portfolioSlides[projectIndex]
      const viewerSlide = getPortfolioViewerSlides(project)[nextViewerIndex]
      if (!viewerSlide) return
      const slideIndex = projectSlides[project.slug].findIndex(
        slide => slide.id === viewerSlide.id,
      )
      if (slideIndex < 0) return
      setViewerIntent(intent =>
        intent ? { ...intent, mediaId: viewerSlide.id } : intent,
      )
      selectHorizontal(projectIndex, slideIndex, 'silent', true)
      updateRoute(projectIndex, slideIndex, 'replace', true)
    },
    [projectSlides, selectHorizontal, updateRoute],
  )

  const finishViewerClose = useCallback(() => {
    const projectIndex = selectionRef.current.projectIndex
    const slideIndex =
      projectIndex >= 0
        ? (selectionRef.current.slideIndexes[projectIndex] ?? 0)
        : 0
    const closedMediaId = viewerIntent?.mediaId
    setViewerIntent(null)

    if (viewerHistoryEntryRef.current) {
      viewerHistoryEntryRef.current = false
      pendingViewerCloseRef.current = { projectIndex, slideIndex }
      window.history.back()
    } else {
      updateRoute(projectIndex, slideIndex, 'replace')
    }

    requestAnimationFrame(() => {
      const source = closedMediaId
        ? document.querySelector<HTMLElement>(
            `[data-portfolio-screenshot-id="${CSS.escape(closedMediaId)}"][data-portfolio-viewer-source="active"]`,
          )
        : null
      source?.focus?.({ preventScroll: true })
      keyboardSurfaceRef.current?.focus({ preventScroll: true })
    })
  }, [updateRoute, viewerIntent?.mediaId])

  const applyLocationState = useEffectEvent(() => {
    const pendingClose = pendingViewerCloseRef.current
    if (pendingClose) {
      pendingViewerCloseRef.current = null
      setActiveProjectIndex(pendingClose.projectIndex)
      if (pendingClose.projectIndex >= 0) {
        selectHorizontal(
          pendingClose.projectIndex,
          pendingClose.slideIndex,
          'silent',
          true,
        )
      }
      const targetIndex = pendingClose.projectIndex + 1
      if (verticalApi?.selectedScrollSnap() !== targetIndex) {
        verticalModeRef.current = 'silent'
        verticalApi?.scrollTo(targetIndex, true)
      } else {
        verticalModeRef.current = null
      }
      updateRoute(pendingClose.projectIndex, pendingClose.slideIndex, 'replace')
      return
    }

    const state = parsePortfolioRoute(
      window.location.pathname,
      window.location.search,
      portfolioSlides,
      projectSlides,
    )
    if (!state) {
      window.location.assign(window.location.href)
      return
    }

    setViewerIntent(null)
    viewerHistoryEntryRef.current = false
    setActiveProjectIndex(state.projectIndex)
    if (state.projectIndex >= 0) {
      selectHorizontal(state.projectIndex, state.slideIndex, 'silent', true)
    }
    const targetIndex = state.projectIndex + 1
    if (verticalApi?.selectedScrollSnap() !== targetIndex) {
      verticalModeRef.current = 'silent'
      verticalApi?.scrollTo(targetIndex, true)
    } else {
      verticalModeRef.current = null
    }

    if (state.viewerOpen && state.projectIndex >= 0) {
      const project = portfolioSlides[state.projectIndex]
      const slide = projectSlides[project.slug][state.slideIndex]
      if (isViewerScreenshotSlide(project, slide)) {
        setViewerIntent({
          mediaId: slide.screenshot.id,
          sourceRect: null,
          activationKind: 'deep-link',
        })
      }
    }
  })

  useEffect(() => {
    window.history.scrollRestoration = 'manual'
    window.addEventListener('popstate', applyLocationState)
    return () => window.removeEventListener('popstate', applyLocationState)
  }, [])

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (viewerIntent) return
    if (event.metaKey || event.ctrlKey || event.altKey) return

    if (event.key === '0') {
      if (targetMatches(event.target, TEXT_ENTRY_SELECTOR)) return
      event.preventDefault()
      event.stopPropagation()
      setActiveProject(START_SCREEN_INDEX, 'push')
      return
    }
    if (/^[1-9]$/.test(event.key)) {
      if (targetMatches(event.target, TEXT_ENTRY_SELECTOR)) return
      const projectIndex = Number(event.key) - 1
      if (projectIndex < portfolioSlides.length) {
        event.preventDefault()
        event.stopPropagation()
        setActiveProject(projectIndex, 'push', false, 0)
      }
      return
    }

    if (targetMatches(event.target, ARROW_NAVIGATION_SELECTOR)) return

    const targetsActiveSlideIndicator = targetMatches(
      event.target,
      ACTIVE_SLIDE_INDICATOR_SELECTOR,
    )
    const opensViewer =
      (event.key === 'Enter' &&
        (targetsActiveSlideIndicator ||
          !targetMatches(event.target, ACTIVATION_SELECTOR))) ||
      (event.code === 'Space' && targetsActiveSlideIndicator)

    if (opensViewer && openActiveViewerFromKeyboard()) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      event.stopPropagation()
      moveVertical(-1)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      event.stopPropagation()
      moveVertical(1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      event.stopPropagation()
      moveHorizontal(-1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      event.stopPropagation()
      moveHorizontal(1)
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [])

  const revealPortfolio = useEffectEvent(async () => {
    if (!verticalApi || initialRevealStartedRef.current) return
    initialRevealStartedRef.current = true

    try {
      await Promise.all([
        document.fonts.ready.catch(() => undefined),
        nextFrame().then(nextFrame),
        ensureMediaReady(openingMediaKeys),
      ])
    } catch {
      setIntroPhase('error')
      return
    }

    const targetIndex = normalizedInitialProjectIndex + 1
    if (verticalApi.selectedScrollSnap() !== targetIndex) {
      verticalModeRef.current = 'silent'
      verticalApi.scrollTo(targetIndex, true)
    } else {
      verticalModeRef.current = null
    }
    setIntroPhase('revealing')
    const curtain = curtainRef.current
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (curtain) {
      await new Promise<void>(resolve => {
        gsap.to(curtain, {
          autoAlpha: 0,
          duration: reducedMotion ? 0.12 : 0.6,
          ease: 'power3.inOut',
          onComplete: resolve,
        })
      })
    }
    setIntroPhase('ready')

    if (
      initialViewerOpen &&
      normalizedInitialProjectIndex >= 0 &&
      initialTargetScreenshot
    ) {
      setViewerIntent({
        mediaId: initialTargetScreenshot.id,
        sourceRect: null,
        activationKind: 'deep-link',
      })
    }
    void preloadQueue(backgroundMediaQueue, 2).catch(() => undefined)
  })

  useLayoutEffect(() => {
    void revealPortfolio()
  }, [verticalApi])

  useEffect(() => {
    if (mediaFailure) setIntroPhase('error')
  }, [mediaFailure])

  return (
    <PortfolioBrowserView
      model={{
        activeProjectIndex: selection.projectIndex,
        activeSlideIndexes: selection.slideIndexes,
        introPhase,
        isTouchInput,
        isTouchLandscapeLayout,
        isWideLayout,
        projectSlides,
        viewerIntent,
        viewerIndex,
        viewerSlides,
      }}
      actions={{
        finishViewerClose,
        handleHorizontalSelect,
        handleViewerView,
        moveHorizontal,
        openViewer,
        registerHorizontalApi,
        registerMediaElement,
        setActiveProject,
        setActiveSlide,
      }}
      curtainRef={curtainRef}
      keyboardSurfaceRef={keyboardSurfaceRef}
      verticalViewportRef={setVerticalViewportRef}
    />
  )
}
