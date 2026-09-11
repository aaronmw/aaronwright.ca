'use client'

import {
  CSSProperties,
  forwardRef,
  HTMLAttributes,
  ReactNode,
  UIEventHandler,
  useCallback,
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
  wrapperClassName?: string
}

type IndicatorVisibility = {
  top: boolean
  bottom: boolean
}

const EDGE_EPSILON_PX = 1
const AUTO_SCROLL_PX_PER_SECOND = 24

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
    style,
    wrapperClassName = '',
    ...viewportProps
  },
  forwardedRef,
) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const autoScrollFrameRef = useRef<number | null>(null)
  const scrollbarTrackRef = useRef<HTMLDivElement>(null)
  const scrollbarThumbRef = useRef<HTMLSpanElement>(null)
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
    const scrollbarTrack = scrollbarTrackRef.current
    const scrollbarThumb = scrollbarThumbRef.current

    if (scrollbarTrack && scrollbarThumb) {
      scrollbarTrack.style.opacity = hasOverflow ? '1' : '0'

      if (hasOverflow) {
        const thumbHeight = Math.max(
          24,
          (viewport.clientHeight * viewport.clientHeight) /
            viewport.scrollHeight,
        )
        const maximumThumbOffset = viewport.clientHeight - thumbHeight
        const thumbOffset =
          (viewport.scrollTop / maximumScrollTop) * maximumThumbOffset
        scrollbarThumb.style.height = `${thumbHeight}px`
        scrollbarThumb.style.transform = `translateY(${thumbOffset}px)`
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

  const startAutoScroll = () => {
    const viewport = viewportRef.current
    const supportsHover = window.matchMedia(
      '(hover: hover) and (pointer: fine)',
    ).matches
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (!viewport || !supportsHover) return

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

    const handleNativeWheel = (event: WheelEvent) => event.stopPropagation()
    viewport.addEventListener('wheel', handleNativeWheel, { passive: true })

    return () => {
      resizeObserver.disconnect()
      viewport.removeEventListener('wheel', handleNativeWheel)
    }
  }, [updateIndicators])

  useLayoutEffect(
    () => () => {
      if (autoScrollFrameRef.current !== null) {
        cancelAnimationFrame(autoScrollFrameRef.current)
      }
    },
    [],
  )

  const fadeHeight =
    typeof indicatorHeight === 'number'
      ? `${indicatorHeight}px`
      : indicatorHeight
  const maskImage =
    visibility.top || visibility.bottom
      ? `linear-gradient(to bottom, ${
          visibility.top ? `transparent 0, black ${fadeHeight}` : 'black 0'
        }, ${
          visibility.bottom
            ? `black calc(100% - ${fadeHeight}), transparent 100%`
            : 'black 100%'
        })`
      : 'none'

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
        ref={setViewportRef}
        data-portfolio-native-wheel-scroll
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
        <div
          ref={scrollbarTrackRef}
          aria-hidden="true"
          className="pointer-events-none relative z-[var(--portfolio-layer-content)] col-start-1 row-start-1 h-full w-[var(--logo-stroke-width)] justify-self-end opacity-0 transition-opacity duration-[var(--portfolio-motion-feedback)] ease-[var(--ease-out)] motion-reduce:transition-none"
        >
          <span className="absolute inset-0 rounded-full bg-portfolio-shaded">
            <span
              ref={scrollbarThumbRef}
              className="absolute inset-x-0 top-0 min-h-6 rounded-full bg-[var(--portfolio-accent)]"
            />
          </span>
        </div>
      ) : null}
      {bottomScrollControl ? (
        <div
          data-overflow-scroll-control
          aria-hidden="true"
          title="Hover to scroll"
          onPointerEnter={startAutoScroll}
          onPointerLeave={stopAutoScroll}
          onPointerCancel={stopAutoScroll}
          className={`col-start-1 row-start-2 grid size-[var(--portfolio-control-size)] place-items-center justify-self-center text-[var(--portfolio-accent)] transition-opacity duration-[var(--portfolio-motion-feedback)] ease-[var(--ease-out)] motion-reduce:transition-none ${
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
