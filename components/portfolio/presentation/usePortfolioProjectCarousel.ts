'use client'

import type { EmblaCarouselType } from 'embla-carousel'
import useEmblaCarousel from 'embla-carousel-react'
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures'
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  getLockedMouseDragAxis,
  isPortfolioCarouselDragLockedTarget,
} from '../runtime/mouseDragAxisLock'

const NARRATIVE_HEADER_GAP_IN_LINES = 2

function readPixelValue(style: CSSStyleDeclaration, property: string) {
  const value = Number.parseFloat(style.getPropertyValue(property))
  return Number.isFinite(value) ? value : 0
}

function isSelectableTextTarget(target: EventTarget | null) {
  return Boolean(
    target instanceof Element &&
    target.closest('[data-portfolio-selectable-text]'),
  )
}

export function usePortfolioProjectCarousel({
  active,
  activeSlideIndex,
  hasMedia,
  projectId,
  projectIndex,
  sideBySide,
  onApi,
  onBackdropVisibilityChange,
  onSelect,
}: {
  active: boolean
  activeSlideIndex: number
  hasMedia: boolean
  projectId: string
  projectIndex: number
  sideBySide: boolean
  onApi: (projectIndex: number, api: EmblaCarouselType | null) => void
  onBackdropVisibilityChange: (visible: boolean) => void
  onSelect: (projectIndex: number, slideIndex: number) => void
}) {
  const [initialSlideIndex] = useState(activeSlideIndex)
  const alignmentRootRef = useRef<HTMLDivElement>(null)
  const [narrativeContentTop, setNarrativeContentTop] = useState<number | null>(
    null,
  )
  const carouselMovingRef = useRef(false)
  const destinationSelectedRef = useRef(false)
  const settledSlideIndexRef = useRef(activeSlideIndex)
  const [plugins] = useState(() => [WheelGesturesPlugin()])
  const [viewportRef, emblaApi] = useEmblaCarousel(
    {
      axis: 'x',
      align: 'start',
      loop: false,
      skipSnaps: false,
      startIndex: initialSlideIndex,
      active: hasMedia,
      watchDrag: (_api, event) => {
        if (isPortfolioCarouselDragLockedTarget(event.target)) return false
        if (event.type !== 'mousedown') return true
        if (isSelectableTextTarget(event.target)) return false
        return getLockedMouseDragAxis(event) === 'x'
      },
    },
    plugins,
  )
  const notifyApi = useEffectEvent(onApi)
  const notifySelect = useEffectEvent(onSelect)
  const notifyBackdropVisibility = useEffectEvent((visible: boolean) => {
    if (active) onBackdropVisibilityChange(visible)
  })

  useEffect(() => {
    // The Embla instance is registered in a ref-backed API map and removed in cleanup.
    // react-doctor-disable-next-line react-doctor/no-pass-live-state-to-parent
    notifyApi(projectIndex, emblaApi ?? null)
    if (!emblaApi) return

    const handleSelect = () => {
      const selectedIndex = emblaApi.selectedScrollSnap()
      if (
        carouselMovingRef.current &&
        selectedIndex !== settledSlideIndexRef.current
      ) {
        destinationSelectedRef.current = true
      }
      notifySelect(projectIndex, selectedIndex)
    }
    const handleScroll = () => {
      const selectedIndex = emblaApi.selectedScrollSnap()
      if (!carouselMovingRef.current) {
        carouselMovingRef.current = true
        destinationSelectedRef.current =
          selectedIndex !== settledSlideIndexRef.current
        notifyBackdropVisibility(false)
      }
      if (selectedIndex !== settledSlideIndexRef.current) {
        destinationSelectedRef.current = true
      }
      if (!destinationSelectedRef.current) return

      const snaps = emblaApi.scrollSnapList()
      const target = snaps[selectedIndex]
      const neighboringDistances = [
        snaps[selectedIndex - 1],
        snaps[selectedIndex + 1],
      ]
        .filter((snap): snap is number => snap !== undefined)
        .map(snap => Math.abs(target - snap))
      const snapDistance = Math.min(...neighboringDistances)
      const closeToDestination =
        Math.abs(emblaApi.scrollProgress() - target) <= snapDistance * 0.2
      notifyBackdropVisibility(closeToDestination)
    }
    const handleSettle = () => {
      carouselMovingRef.current = false
      destinationSelectedRef.current = false
      settledSlideIndexRef.current = emblaApi.selectedScrollSnap()
      notifyBackdropVisibility(true)
    }

    emblaApi.on('select', handleSelect)
    emblaApi.on('scroll', handleScroll)
    emblaApi.on('settle', handleSettle)
    // Initial selection is an imperative Embla lifecycle notification.
    // react-doctor-disable-next-line react-doctor/no-pass-live-state-to-parent
    handleSelect()

    return () => {
      emblaApi.off('select', handleSelect)
      emblaApi.off('scroll', handleScroll)
      emblaApi.off('settle', handleSettle)
      notifyApi(projectIndex, null)
    }
  }, [emblaApi, projectIndex])

  useEffect(() => {
    if (active) {
      // Backdrop visibility is an animation event, not mirrored React state.
      // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent
      notifyBackdropVisibility(true)
    }
  }, [active])

  useLayoutEffect(() => {
    const root = alignmentRootRef.current
    if (!root) return

    const narrativeNodes = Array.from(
      root.querySelectorAll<HTMLElement>(
        '[data-portfolio-slide-narrative-content]',
      ),
    )
    const metadataNode = root.querySelector<HTMLElement>(
      '[data-portfolio-project-metadata]',
    )
    const stackedTextRegion = root.querySelector<HTMLElement>(
      '[data-portfolio-stacked-text-region]',
    )
    if (narrativeNodes.length === 0 || !metadataNode) return
    if (!sideBySide && !stackedTextRegion) return

    const updateAlignment = () => {
      const rootStyle = window.getComputedStyle(root)
      const topRuleHeight = readPixelValue(rootStyle, '--logo-stroke-width')
      const defaultSpacing =
        readPixelValue(rootStyle, '--portfolio-default-spacing') ||
        topRuleHeight * 5
      const lineHeight = Number.parseFloat(
        window.getComputedStyle(narrativeNodes[0]).lineHeight,
      )
      const narrativeGap =
        (Number.isFinite(lineHeight) ? lineHeight : 0) *
        NARRATIVE_HEADER_GAP_IN_LINES
      const tallestNarrativeHeight = Math.max(
        ...narrativeNodes.map(node => node.getBoundingClientRect().height),
      )
      const metadataHeight = metadataNode.getBoundingClientRect().height
      const centeredTop = sideBySide
        ? (root.clientHeight - tallestNarrativeHeight) / 2
        : ((stackedTextRegion?.clientHeight ?? 0) -
            (metadataHeight + narrativeGap + tallestNarrativeHeight)) /
            2 +
          metadataHeight +
          narrativeGap
      const minimumTop = sideBySide
        ? topRuleHeight + defaultSpacing + metadataHeight + narrativeGap
        : metadataHeight + narrativeGap
      const nextTop = Math.round(Math.max(centeredTop, minimumTop) * 100) / 100

      setNarrativeContentTop(current =>
        current === nextTop ? current : nextTop,
      )
    }

    const resizeObserver = new ResizeObserver(updateAlignment)
    resizeObserver.observe(root)
    resizeObserver.observe(metadataNode)
    if (stackedTextRegion) resizeObserver.observe(stackedTextRegion)
    narrativeNodes.forEach(node => resizeObserver.observe(node))
    updateAlignment()

    return () => resizeObserver.disconnect()
  }, [projectId, sideBySide])

  return { alignmentRootRef, narrativeContentTop, viewportRef }
}
