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
import { portfolioSlides } from '@/lib/portfolio'
import { usePortfolioMediaReadiness } from './usePortfolioMediaReadiness'
import { usePortfolioLayout } from './runtime/usePortfolioLayout'
import { usePortfolioModel } from './runtime/usePortfolioModel'
import { usePortfolioSelection } from './runtime/usePortfolioSelection'
import {
  usePortfolioNavigationController,
  type NavigationMode,
  type VerticalNavigationIntent,
} from './runtime/usePortfolioNavigationController'
import { usePortfolioViewerController } from './runtime/usePortfolioViewerController'
import type { PortfolioIntroPhase } from './runtime/types'
import { installPortfolioWheelAxisLock } from './runtime/wheelAxisLock'
import { installPortfolioTouchScrollChain } from './runtime/touchScrollChain'
import {
  getPortfolioMouseIntent,
  installPortfolioMouseDragAxisLock,
  isPortfolioCarouselDragLockedTarget,
} from './runtime/mouseDragAxisLock'
import { PortfolioBrowserView } from './presentation/PortfolioBrowserView'

type PortfolioBrowserProps = {
  initialProjectSlug?: string
  initialScreenshotSlug?: string
  initialViewerOpen?: boolean
}

const START_SCREEN_INDEX = -1

const TEXT_ENTRY_SELECTOR =
  'input, textarea, select, [contenteditable], [role="textbox"], [role="spinbutton"]'
const ARROW_NAVIGATION_SELECTOR = `${TEXT_ENTRY_SELECTOR}, [data-portfolio-native-wheel-scroll], [role="menu"], [role="listbox"], [role="tree"], [role="grid"], [role="tablist"], [role="radiogroup"], [role="slider"], [aria-haspopup="menu"]`
const ACTIVATION_SELECTOR = `${TEXT_ENTRY_SELECTOR}, button, a, summary, [role="button"], [role="link"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], [role="tab"], [role="checkbox"], [role="radio"], [role="switch"]`
const ACTIVE_SLIDE_INDICATOR_SELECTOR =
  '[data-portfolio-slide-indicator-index][aria-current="true"]'
const NATIVE_WHEEL_SCROLL_SELECTOR = '[data-portfolio-native-wheel-scroll]'

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

function isCarouselDragIgnoredTarget(target: EventTarget | null) {
  return (
    isSelectableTextTarget(target) ||
    isPortfolioCarouselDragLockedTarget(target)
  )
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
  const horizontalApisRef = useRef(new Map<number, EmblaCarouselType>())
  const horizontalModesRef = useRef(new Map<number, NavigationMode>())
  const verticalIntentRef = useRef<VerticalNavigationIntent | null>(null)
  const verticalViewportElementRef = useRef<HTMLElement>(null)
  const initializationStartedRef = useRef(false)
  const [introPhase, setIntroPhase] = useState<PortfolioIntroPhase>('loading')
  const {
    isTouchInput,
    isTouchLandscapeLayout,
    isWideLayout,
    isWideTextLayout,
  } = usePortfolioLayout()

  const {
    imageProgress,
    registerMediaElement,
    ensureMediaReady,
    preloadQueue,
  } = usePortfolioMediaReadiness()
  const {
    imagePreloadQueue,
    initialSlideIndexes,
    initialTargetScreenshot,
    normalizedInitialProjectIndex,
    openingMediaKeys,
    projectSlides,
  } = usePortfolioModel({
    projects: portfolioSlides,
    initialProjectSlug,
    initialScreenshotSlug,
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
        if (getPortfolioMouseIntent(event) === 'click') return true
        if (
          isPortfolioCarouselDragLockedTarget(event.target) ||
          targetMatches(event.target, NATIVE_WHEEL_SCROLL_SELECTOR)
        ) {
          return false
        }
        if (event.type !== 'mousedown') return true
        if (isSelectableTextTarget(event.target)) return false
        if (!targetMatches(event.target, '[data-portfolio-carousel]')) {
          return true
        }
        return getPortfolioMouseIntent(event) === 'y'
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
    const removeWheelAxisLock = installPortfolioWheelAxisLock(
      viewport,
      target => targetMatches(target, NATIVE_WHEEL_SCROLL_SELECTOR),
    )
    const removeMouseDragAxisLock = installPortfolioMouseDragAxisLock({
      root: viewport,
      targetSelector: '[data-portfolio-carousel]',
      ignoreTarget: isCarouselDragIgnoredTarget,
    })
    const removeTouchScrollChain = installPortfolioTouchScrollChain(
      viewport,
      isPortfolioCarouselDragLockedTarget,
    )

    return () => {
      removeWheelAxisLock()
      removeMouseDragAxisLock()
      removeTouchScrollChain()
    }
  }, [verticalApi])

  const {
    handleHorizontalSelect,
    moveHorizontal,
    moveVertical,
    registerHorizontalApi,
    selectHorizontal,
    setActiveProject,
    setActiveSlide,
    updateRoute,
  } = usePortfolioNavigationController({
    horizontalApisRef,
    horizontalModesRef,
    projectSlides,
    selectionRef,
    verticalApi,
    verticalIntentRef,
    setActiveProjectIndex,
    setActiveSlideIndexes,
  })

  const {
    finishViewerClose,
    handleViewerView,
    openActiveViewerFromKeyboard,
    openViewer,
    setViewerIntent,
    viewerIndex,
    viewerIntent,
    viewerSlides,
  } = usePortfolioViewerController({
    activeProjectIndex: selection.projectIndex,
    keyboardSurfaceRef,
    projectSlides,
    selectionRef,
    selectHorizontal,
    verticalApi,
    verticalIntentRef,
    setActiveProjectIndex,
    updateRoute,
  })

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (
      introPhase !== 'ready' ||
      viewerIntent ||
      targetMatches(event.target, '[data-portfolio-contact-dialog]')
    )
      return
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

  const initializePortfolio = useEffectEvent(async () => {
    if (!verticalApi || initializationStartedRef.current) return
    initializationStartedRef.current = true

    // Prioritize only the media visible on the initial route. Other assets
    // preload independently and never delay the initial page.
    const openingReady = ensureMediaReady(openingMediaKeys)
    void preloadQueue(imagePreloadQueue, 1)
    const targetIndex = normalizedInitialProjectIndex + 1
    if (verticalApi.selectedScrollSnap() !== targetIndex) {
      verticalIntentRef.current = {
        projectIndex: normalizedInitialProjectIndex,
        mode: 'silent',
      }
      verticalApi.scrollTo(targetIndex, true)
    } else {
      verticalIntentRef.current = null
    }
    try {
      await Promise.all([
        document.fonts.ready.catch(() => undefined),
        openingReady,
      ])
      // Settle layout with the loaded font metrics before showing the carousels
      // and enabling offscreen containment.
      await nextFrame().then(nextFrame)
    } catch {
      setIntroPhase('error')
      return
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
  })

  useLayoutEffect(() => {
    // Reveal once the initial screen is ready, without an additional fade.
    // react-doctor-disable-next-line react-hooks-js/set-state-in-effect
    void initializePortfolio()
  }, [verticalApi])

  return (
    <PortfolioBrowserView
      model={{
        activeProjectIndex: selection.projectIndex,
        activeSlideIndexes: selection.slideIndexes,
        introPhase,
        imageProgress,
        isTouchInput,
        isTouchLandscapeLayout,
        isWideLayout,
        isWideTextLayout,
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
      keyboardSurfaceRef={keyboardSurfaceRef}
      verticalViewportRef={setVerticalViewportRef}
    />
  )
}
