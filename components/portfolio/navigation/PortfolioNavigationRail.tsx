import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react'
import { FiveByFive } from '../presentation/FiveByFive'
import {
  getNavigationMarkerOffset,
  NAVIGATION_SVG_SIZE,
} from './navigationTokens'

export type PortfolioNavigationItem = {
  id: string
  label: string
  pending?: boolean
}

const DOT_SIZE = 'var(--logo-stroke-width)'
const DEFAULT_PREVIEW_DRAW_DELAY_MS = 300
const DEFAULT_PREVIEW_DRAW_DURATION_MS = 250
const PREVIEW_CELL_COUNT = 16

function NavigationDotButton({
  item,
  index,
  active,
  ariaCurrent,
  label,
  previewDrawDelayMs,
  previewDrawDurationMs,
  style,
  dataAttributes,
  onSelect,
}: {
  item: PortfolioNavigationItem
  index: number
  active: boolean
  ariaCurrent: 'true' | 'page' | undefined
  label: string
  previewDrawDelayMs: number
  previewDrawDurationMs: number
  style: CSSProperties
  dataAttributes: Record<`data-${string}`, string | number>
  onSelect: (index: number) => void
}) {
  const [previewing, setPreviewing] = useState(false)
  const [visiblePreviewCellCount, setVisiblePreviewCellCount] = useState(0)
  const previewingRef = useRef(false)
  const stepDelayMs =
    Math.max(0, previewDrawDurationMs) / Math.max(1, PREVIEW_CELL_COUNT - 1)

  const setPreview = (nextPreviewing: boolean) => {
    if (previewingRef.current === nextPreviewing) return
    previewingRef.current = nextPreviewing
    setPreviewing(nextPreviewing)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisiblePreviewCellCount(nextPreviewing ? PREVIEW_CELL_COUNT : 0)
      return
    }
    setVisiblePreviewCellCount(current =>
      Math.max(
        0,
        Math.min(
          PREVIEW_CELL_COUNT,
          nextPreviewing ? (current === 0 ? 0 : current + 1) : current - 1,
        ),
      ),
    )
  }

  useEffect(() => {
    const target = previewing ? PREVIEW_CELL_COUNT : 0
    if (visiblePreviewCellCount === target) return

    const timer = window.setTimeout(
      () => {
        setVisiblePreviewCellCount(current =>
          Math.max(
            0,
            Math.min(PREVIEW_CELL_COUNT, current + (previewing ? 1 : -1)),
          ),
        )
      },
      previewing && visiblePreviewCellCount === 0
        ? Math.max(0, previewDrawDelayMs)
        : stepDelayMs,
    )

    return () => window.clearTimeout(timer)
  }, [previewDrawDelayMs, previewing, stepDelayMs, visiblePreviewCellCount])

  const showPointerPreview = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'touch') setPreview(true)
  }

  return (
    <button
      type="button"
      className={`absolute grid place-items-center border-0 bg-transparent p-0 outline-none focus-visible:z-[15] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 ${
        active
          ? 'text-resume-signal'
          : 'text-[var(--portfolio-ink)] hover:text-resume-signal focus-visible:text-resume-signal'
      }`}
      style={style}
      aria-label={label}
      aria-current={ariaCurrent}
      aria-busy={item.pending || undefined}
      {...dataAttributes}
      onPointerEnter={showPointerPreview}
      onPointerLeave={() => setPreview(false)}
      onFocus={() => setPreview(true)}
      onBlur={() => setPreview(false)}
      onClick={() => {
        setPreview(false)
        onSelect(index)
      }}
    >
      <span className="pointer-events-none absolute inset-0 grid place-items-center text-resume-signal">
        <FiveByFive
          variant="outline"
          visibleCellCount={visiblePreviewCellCount}
        />
      </span>
      <span
        className={item.pending ? 'portfolio-pending-dot' : ''}
        style={{
          width: DOT_SIZE,
          height: DOT_SIZE,
          background: 'currentColor',
        }}
        aria-hidden="true"
      />
    </button>
  )
}

function RailMarker() {
  return (
    <span
      data-portfolio-navigation-marker
      className="pointer-events-none absolute z-10 grid place-items-center"
      style={{
        width: NAVIGATION_SVG_SIZE,
        height: NAVIGATION_SVG_SIZE,
      }}
      aria-hidden="true"
    >
      <span className="size-[calc(var(--logo-stroke-width)*5)] bg-resume-signal" />
    </span>
  )
}

function markerEdgeInset(slotCount: number) {
  return `calc(${slotCount * NAVIGATION_SVG_SIZE + NAVIGATION_SVG_SIZE / 2}px - var(--logo-stroke-width) * 2.5)`
}

function getMarkerClipPath(
  axis: 'horizontal' | 'vertical',
  activeIndex: number,
  itemCount: number,
) {
  const before = markerEdgeInset(activeIndex)
  const after = markerEdgeInset(itemCount - activeIndex - 1)
  const crossAxis = markerEdgeInset(0)

  return axis === 'horizontal'
    ? `inset(${crossAxis} ${after} ${crossAxis} ${before})`
    : `inset(${before} ${crossAxis} ${after} ${crossAxis})`
}

function MaskedActiveDot({
  axis,
  activeIndex,
  itemCount,
  pending,
}: {
  axis: 'horizontal' | 'vertical'
  activeIndex: number
  itemCount: number
  pending?: boolean
}) {
  return (
    <span
      data-portfolio-active-dot-mask={axis}
      className="pointer-events-none absolute inset-0 z-20 transition-[clip-path] duration-300 ease-out motion-reduce:transition-none"
      style={{ clipPath: getMarkerClipPath(axis, activeIndex, itemCount) }}
      aria-hidden="true"
    >
      <span
        className="absolute grid place-items-center"
        style={
          axis === 'horizontal'
            ? {
                insetBlock: 0,
                left: activeIndex * NAVIGATION_SVG_SIZE,
                width: NAVIGATION_SVG_SIZE,
              }
            : {
                insetInline: 0,
                top: activeIndex * NAVIGATION_SVG_SIZE,
                height: NAVIGATION_SVG_SIZE,
              }
        }
      >
        <span
          className={pending ? 'portfolio-pending-dot bg-white' : 'bg-white'}
          style={{ width: DOT_SIZE, height: DOT_SIZE }}
        />
      </span>
    </span>
  )
}

export function PortfolioSlideRail({
  items,
  activeIndex,
  previewDrawDelayMs = DEFAULT_PREVIEW_DRAW_DELAY_MS,
  previewDrawDurationMs = DEFAULT_PREVIEW_DRAW_DURATION_MS,
  onSelect,
}: {
  items: PortfolioNavigationItem[]
  activeIndex: number
  previewDrawDelayMs?: number
  previewDrawDurationMs?: number
  onSelect: (index: number) => void
}) {
  if (items.length <= 1) return null

  return (
    <div
      data-portfolio-slide-indicators
      data-interactive-pop="off"
      className="pointer-events-auto relative h-[52px] font-portfolio-controls"
      style={{
        width: items.length * NAVIGATION_SVG_SIZE,
      }}
    >
      <div
        className="absolute inset-y-0 left-0 z-10 transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{
          transform: `translateX(${getNavigationMarkerOffset(activeIndex)}px)`,
        }}
      >
        <RailMarker />
      </div>
      <MaskedActiveDot
        axis="horizontal"
        activeIndex={activeIndex}
        itemCount={items.length}
        pending={items[activeIndex]?.pending}
      />
      {items.map((item, index) => {
        const isActive = index === activeIndex

        return (
          <NavigationDotButton
            key={item.id}
            item={item}
            index={index}
            active={isActive}
            ariaCurrent={isActive ? 'true' : undefined}
            label={item.label}
            previewDrawDelayMs={previewDrawDelayMs}
            previewDrawDurationMs={previewDrawDurationMs}
            style={{
              left: index * NAVIGATION_SVG_SIZE,
              width: NAVIGATION_SVG_SIZE,
              insetBlock: 0,
            }}
            dataAttributes={{
              'data-portfolio-slide-indicator-index': index,
            }}
            onSelect={onSelect}
          />
        )
      })}
    </div>
  )
}

export function PortfolioSectionRail({
  items,
  activeIndex,
  side,
  hidden,
  previewDrawDelayMs = DEFAULT_PREVIEW_DRAW_DELAY_MS,
  previewDrawDurationMs = DEFAULT_PREVIEW_DRAW_DURATION_MS,
  onSelect,
}: {
  items: PortfolioNavigationItem[]
  activeIndex: number
  side: 'left' | 'right'
  hidden?: boolean
  previewDrawDelayMs?: number
  previewDrawDurationMs?: number
  onSelect: (index: number) => void
}) {
  const height = items.length * NAVIGATION_SVG_SIZE
  const trackStyle = {
    [side]: 0,
    width: 'var(--portfolio-navigation-track-size)',
  } as CSSProperties

  return (
    <nav
      aria-label={`${side === 'left' ? 'Left' : 'Right'} section navigation`}
      data-portfolio-section-nav-zone={side}
      data-interactive-pop="off"
      className={`fixed inset-y-0 z-40 font-portfolio-controls transition-opacity duration-200 motion-reduce:transition-none ${
        hidden ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      style={trackStyle}
    >
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: NAVIGATION_SVG_SIZE, height }}
      >
        <div
          className="absolute left-0 top-0 z-10 transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{
            transform: `translateY(${getNavigationMarkerOffset(activeIndex)}px)`,
          }}
        >
          <RailMarker />
        </div>
        <MaskedActiveDot
          axis="vertical"
          activeIndex={activeIndex}
          itemCount={items.length}
          pending={items[activeIndex]?.pending}
        />
        {items.map((item, index) => {
          const isActive = index === activeIndex
          const label = isActive
            ? `Current section: ${item.label}`
            : `Show ${item.label}`

          return (
            <NavigationDotButton
              key={item.id}
              item={item}
              index={index}
              active={isActive}
              ariaCurrent={isActive ? 'page' : undefined}
              label={label}
              previewDrawDelayMs={previewDrawDelayMs}
              previewDrawDurationMs={previewDrawDurationMs}
              style={{
                top: index * NAVIGATION_SVG_SIZE,
                left: 0,
                width: NAVIGATION_SVG_SIZE,
                height: NAVIGATION_SVG_SIZE,
              }}
              dataAttributes={{
                'data-portfolio-section-nav-index': index,
                'data-portfolio-section-nav-side': side,
              }}
              onSelect={onSelect}
            />
          )
        })}
      </div>
    </nav>
  )
}
