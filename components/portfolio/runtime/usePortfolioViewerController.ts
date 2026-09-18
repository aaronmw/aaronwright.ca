'use client'

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useMemo,
  useState,
  type RefObject,
} from 'react'
import type { EmblaCarouselType } from 'embla-carousel'
import { portfolioSlides } from '@/lib/portfolio'
import { parsePortfolioRoute } from '../domain/routing'
import { isViewerScreenshotSlide, type ProjectSlide } from '../domain/slides'
import {
  getPortfolioViewerSlides,
  getViewerSlideIndex,
  type ViewerOpenIntent,
} from '../domain/viewer'
import type {
  NavigationMode,
  VerticalNavigationIntent,
} from './usePortfolioNavigationController'
import type { PortfolioRuntimeSelection } from './usePortfolioSelection'

type SelectHorizontal = (
  projectIndex: number,
  slideIndex: number,
  mode: NavigationMode,
  jump?: boolean,
) => void

type UpdateRoute = (
  projectIndex: number,
  slideIndex: number,
  mode: 'push' | 'replace',
  viewerOpen?: boolean,
) => void

export function usePortfolioViewerController({
  activeProjectIndex,
  keyboardSurfaceRef,
  projectSlides,
  selectionRef,
  selectHorizontal,
  verticalApi,
  verticalIntentRef,
  setActiveProjectIndex,
  updateRoute,
}: {
  activeProjectIndex: number
  keyboardSurfaceRef: RefObject<HTMLElement | null>
  projectSlides: Record<string, ProjectSlide[]>
  selectionRef: RefObject<PortfolioRuntimeSelection>
  selectHorizontal: SelectHorizontal
  verticalApi?: EmblaCarouselType
  verticalIntentRef: RefObject<VerticalNavigationIntent | null>
  setActiveProjectIndex: (projectIndex: number) => void
  updateRoute: UpdateRoute
}) {
  const viewerHistoryEntryRef = useRef(false)
  const pendingViewerCloseRef = useRef<{
    projectIndex: number
    slideIndex: number
  } | null>(null)
  const [viewerIntent, setViewerIntent] = useState<ViewerOpenIntent | null>(
    null,
  )
  const activeProject = portfolioSlides[activeProjectIndex]
  const viewerSlides = useMemo(
    () => (activeProject ? getPortfolioViewerSlides(activeProject) : []),
    [activeProject],
  )
  const viewerIndex = viewerIntent
    ? getViewerSlideIndex(viewerSlides, viewerIntent.mediaId)
    : 0

  const openViewer = useCallback(
    function openViewer(intent: ViewerOpenIntent) {
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
    [projectSlides, selectionRef, selectHorizontal, updateRoute],
  )

  function openActiveViewerFromKeyboard() {
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
  }

  function handleViewerView(nextViewerIndex: number) {
    const projectIndex = selectionRef.current.projectIndex
    if (projectIndex < 0) return
    const project = portfolioSlides[projectIndex]
    const viewerSlide = viewerSlides[nextViewerIndex]
    if (!viewerSlide) return
    const slideIndex = projectSlides[project.slug].findIndex(
      slide => slide.id === viewerSlide.id,
    )
    if (slideIndex < 0) return
    setViewerIntent(intent =>
      intent && intent.mediaId !== viewerSlide.id
        ? { ...intent, mediaId: viewerSlide.id }
        : intent,
    )
    if (selectionRef.current.slideIndexes[projectIndex] !== slideIndex) {
      selectHorizontal(projectIndex, slideIndex, 'silent', true)
    }
    updateRoute(projectIndex, slideIndex, 'replace', true)
  }

  function finishViewerClose() {
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
      const target =
        source?.querySelector<HTMLElement>('[data-portfolio-media-action]') ??
        keyboardSurfaceRef.current
      // The lightbox normally restores the opener. Only move focus again when
      // media navigation changed the source, or the viewer opened from a URL.
      if (target && document.activeElement !== target) {
        target.focus({ preventScroll: true })
      }
    })
  }

  const applyLocationState = useEffectEvent(() => {
    const pendingClose = pendingViewerCloseRef.current
    if (pendingClose) {
      pendingViewerCloseRef.current = null
      if (selectionRef.current.projectIndex !== pendingClose.projectIndex) {
        setActiveProjectIndex(pendingClose.projectIndex)
      }
      if (
        pendingClose.projectIndex >= 0 &&
        selectionRef.current.slideIndexes[pendingClose.projectIndex] !==
          pendingClose.slideIndex
      ) {
        selectHorizontal(
          pendingClose.projectIndex,
          pendingClose.slideIndex,
          'silent',
          true,
        )
      }
      const targetIndex = pendingClose.projectIndex + 1
      if (verticalApi?.selectedScrollSnap() !== targetIndex) {
        verticalIntentRef.current = {
          projectIndex: pendingClose.projectIndex,
          mode: 'silent',
        }
        verticalApi?.scrollTo(targetIndex, true)
      } else {
        verticalIntentRef.current = null
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
      verticalIntentRef.current = {
        projectIndex: state.projectIndex,
        mode: 'silent',
      }
      verticalApi?.scrollTo(targetIndex, true)
    } else {
      verticalIntentRef.current = null
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

  return {
    finishViewerClose,
    handleViewerView,
    openActiveViewerFromKeyboard,
    openViewer,
    setViewerIntent,
    viewerIndex,
    viewerIntent,
    viewerSlides,
  }
}
