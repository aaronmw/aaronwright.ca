'use client'

import {
  CSSProperties,
  forwardRef,
  HTMLAttributes,
  PointerEvent,
  ReactNode,
  UIEventHandler,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

type OverscrollIndicatorProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'onScroll'
> & {
  bottomScrollControl?: ReactNode
  children: ReactNode
  contentClassName?: string
  indicatorHeight?: CSSProperties['height']
  onScroll?: UIEventHandler<HTMLDivElement>
  persistentScrollbar?: boolean
  // Let a containing carousel handle gestures when this region fits in full.
  scrollContainment?: 'always' | 'when-overflowing'
  touchScrollChaining?: boolean
  wrapperClassName?: string
}

type IndicatorVisibility = {
  top: boolean
  bottom: boolean
}

const EDGE_EPSILON_PX = 1
const AUTO_SCROLL_PX_PER_SECOND = 24

function getOverflowMaskImage(
  visibility: IndicatorVisibility,
  indicatorHeight: CSSProperties['height'],
) {
  if (!visibility.top && !visibility.bottom) return 'none'

  const fadeHeight =
    typeof indicatorHeight === 'number'
      ? `${indicatorHeight}px`
      : indicatorHeight

  return `linear-gradient(to bottom, ${
    visibility.top ? `transparent 0, black ${fadeHeight}` : 'black 0'
  }, ${
    visibility.bottom
      ? `black calc(100% - ${fadeHeight}), transparent 100%`
      : 'black 100%'
  })`
}

export const OverscrollIndicator = forwardRef<
  HTMLDivElement,
  OverscrollIndicatorProps
>(function OverscrollIndicator(
  {
    bottomScrollControl,
    children,
    className = '',
    contentClassName = '',
    indicatorHeight = 50,
    onScroll,
    persistentScrollbar = false,
    scrollContainment = 'always',
    touchScrollChaining = false,
    style,
    wrapperClassName = '',
    ...viewportProps
  },
  forwardedRef,
) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const autoScrollFrameRef = useRef<number | null>(null)
  const scrollbarRef = useRef<HTMLInputElement>(null)
  const generatedViewportId = useId()
  const viewportId = viewportProps.id ?? generatedViewportId
  const visibilityRef = useRef<IndicatorVisibility>({
    top: false,
    bottom: false,
  })
  const [visibility, setVisibility] = useState(visibilityRef.current)

  function setViewportRef(node: HTMLDivElement | null) {
    viewportRef.current = node

    if (typeof forwardedRef === 'function') {
      forwardedRef(node)
    } else if (forwardedRef) {
      forwardedRef.current = node
    }
  }

  // ResizeObserver needs one callback identity for its subscription lifetime.
  // react-doctor-disable-next-line react-doctor/react-compiler-no-manual-memoization
  const updateIndicators = useCallback(() => {
    const viewport = viewportRef.current

    if (!viewport) {
      return
    }

    const maximumScrollTop = Math.max(
      0,
      viewport.scrollHeight - viewport.clientHeight,
    )
    const hasOverflow = maximumScrollTop > EDGE_EPSILON_PX
    const nextVisibility = {
      top: hasOverflow && viewport.scrollTop > EDGE_EPSILON_PX,
      bottom:
        hasOverflow && viewport.scrollTop < maximumScrollTop - EDGE_EPSILON_PX,
    }
    const scrollbar = scrollbarRef.current

    if (scrollbar) {
      scrollbar.style.opacity = hasOverflow ? '1' : '0'
      scrollbar.value = hasOverflow
        ? String((viewport.scrollTop / maximumScrollTop) * 100)
        : '0'

      if (hasOverflow) {
        const thumbHeight = Math.min(
          viewport.clientHeight,
          Math.max(
            24,
            (viewport.clientHeight * viewport.clientHeight) /
              viewport.scrollHeight,
          ),
        )
        scrollbar.style.setProperty(
          '--portfolio-scrollbar-thumb-height',
          `${thumbHeight}px`,
        )
      }
    }

    const currentVisibility = visibilityRef.current

    if (
      currentVisibility.top === nextVisibility.top &&
      currentVisibility.bottom === nextVisibility.bottom
    ) {
      return
    }

    visibilityRef.current = nextVisibility
    setVisibility(nextVisibility)
  }, [])

  const handleScroll: UIEventHandler<HTMLDivElement> = event => {
    updateIndicators()
    onScroll?.(event)
  }

  const stopAutoScroll = () => {
    if (autoScrollFrameRef.current === null) return
    cancelAnimationFrame(autoScrollFrameRef.current)
    autoScrollFrameRef.current = null
  }

  const startAutoScroll = (event: PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current
    // Follow the pointer in use, including a mouse on a touch-first device.
    if (!viewport || event.pointerType === 'touch' || event.buttons !== 0) return

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    stopAutoScroll()
    let previousTime = performance.now()
    let targetScrollTop = viewport.scrollTop
    const scrollSpeed = reducedMotion
      ? AUTO_SCROLL_PX_PER_SECOND / 2
      : AUTO_SCROLL_PX_PER_SECOND

    const scroll = (time: number) => {
      const maximumScrollTop = Math.max(
        0,
        viewport.scrollHeight - viewport.clientHeight,
      )
      const elapsedSeconds = (time - previousTime) / 1000
      previousTime = time
      targetScrollTop = Math.min(
        maximumScrollTop,
        targetScrollTop + scrollSpeed * elapsedSeconds,
      )
      viewport.scrollTop = targetScrollTop

      if (viewport.scrollTop >= maximumScrollTop - EDGE_EPSILON_PX) {
        stopAutoScroll()
        updateIndicators()
        return
      }

      // This drives DOM scrolling, not a Three.js render loop.
      // react-doctor-disable-next-line react-doctor/three-prefer-set-animation-loop
      autoScrollFrameRef.current = requestAnimationFrame(scroll)
    }

    // This drives DOM scrolling, not a Three.js render loop.
    // react-doctor-disable-next-line react-doctor/three-prefer-set-animation-loop
    autoScrollFrameRef.current = requestAnimationFrame(scroll)
  }

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const content = contentRef.current

    if (!viewport || !content) {
      return
    }

    updateIndicators()

    const resizeObserver = new ResizeObserver(updateIndicators)
    resizeObserver.observe(viewport)
    resizeObserver.observe(content)

    const handleNativeWheel = (event: WheelEvent) => {
      if (
        scrollContainment === 'always' ||
        viewport.scrollHeight - viewport.clientHeight > EDGE_EPSILON_PX
      ) {
        event.stopPropagation()
      }
    }
    viewport.addEventListener('wheel', handleNativeWheel, { passive: true })

    return () => {
      resizeObserver.disconnect()
      viewport.removeEventListener('wheel', handleNativeWheel)
    }
  }, [updateIndicators, scrollContainment])

  useLayoutEffect(
    () => () => {
      if (autoScrollFrameRef.current !== null) {
        cancelAnimationFrame(autoScrollFrameRef.current)
      }
    },
    [],
  )

  const hasOverflow = visibility.top || visibility.bottom
  const containsScroll = scrollContainment === 'always' || hasOverflow
  const maskImage = getOverflowMaskImage(visibility, indicatorHeight)

  return (
    <div
      className={`relative min-h-0 min-w-0 ${
        bottomScrollControl || persistentScrollbar
          ? 'grid grid-rows-[minmax(0,1fr)_auto]'
          : ''
      } ${wrapperClassName}`}
      data-overscroll-indicator
    >
      <div
        {...viewportProps}
        id={viewportId}
        ref={setViewportRef}
        data-portfolio-native-wheel-scroll={containsScroll || undefined}
        data-portfolio-touch-scroll-chain={touchScrollChaining || undefined}
        className={`col-start-1 row-start-1 h-full w-full overflow-y-scroll overscroll-y-contain ${
          persistentScrollbar
            ? 'portfolio-scrollbar-none pr-[calc(var(--logo-stroke-width)*3)]'
            : ''
        } ${className}`}
        style={{
          ...style,
          WebkitMaskImage: maskImage,
          maskImage,
        }}
        onScroll={handleScroll}
      >
        <div
          ref={contentRef}
          className={contentClassName}
        >
          {children}
        </div>
      </div>
      {persistentScrollbar ? (
        <input
          ref={scrollbarRef}
          type="range"
          min={0}
          max={100}
          step="any"
          defaultValue={0}
          disabled={!hasOverflow}
          aria-label={`Scroll position: ${viewportProps['aria-label'] ?? 'content'}`}
          aria-controls={viewportId}
          aria-orientation="vertical"
          data-portfolio-carousel-drag-lock
          className="portfolio-scrollbar-input relative z-[var(--portfolio-layer-content)] col-start-1 row-start-1 my-0 mr-0 -ml-[calc(var(--logo-stroke-width)*2)] h-full min-h-0 w-[calc(var(--logo-stroke-width)*3)] touch-none appearance-none justify-self-end border-0 bg-transparent p-0 opacity-0 outline-none transition-opacity duration-[var(--portfolio-motion-feedback)] ease-[var(--ease-out)] [direction:ltr] [writing-mode:vertical-lr] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portfolio-accent disabled:pointer-events-none motion-reduce:transition-none"
          onPointerDown={stopAutoScroll}
          onChange={event => {
            const viewport = viewportRef.current
            if (!viewport) return
            viewport.scrollTop =
              (event.currentTarget.valueAsNumber / 100) *
              Math.max(0, viewport.scrollHeight - viewport.clientHeight)
            updateIndicators()
          }}
        />
      ) : null}
      {bottomScrollControl ? (
        <div
          data-overflow-scroll-control
          aria-hidden="true"
          title="Hover to scroll"
          onPointerEnter={startAutoScroll}
          onPointerLeave={stopAutoScroll}
          onPointerCancel={stopAutoScroll}
          className={`col-start-1 row-start-2 grid size-[var(--portfolio-control-size)] place-items-center justify-self-center text-portfolio-accent-decoration transition-opacity duration-[var(--portfolio-motion-feedback)] ease-[var(--ease-out)] motion-reduce:transition-none ${
            visibility.bottom
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0'
          }`}
        >
          {bottomScrollControl}
        </div>
      ) : null}
    </div>
  )
})
