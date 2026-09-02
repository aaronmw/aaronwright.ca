import type { CSSProperties } from 'react'
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
const ACTIVE_COLOR = 'var(--color-resume-signal)'
const RESTING_COLOR = 'var(--portfolio-ink)'

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
  onSelect,
}: {
  items: PortfolioNavigationItem[]
  activeIndex: number
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
          <button
            key={item.id}
            type="button"
            className="absolute inset-y-0 grid place-items-center border-0 bg-transparent p-0 text-current outline-none focus-visible:z-[15] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2"
            style={{
              left: index * NAVIGATION_SVG_SIZE,
              width: NAVIGATION_SVG_SIZE,
              color: isActive ? ACTIVE_COLOR : RESTING_COLOR,
            }}
            aria-label={item.label}
            aria-current={isActive ? 'true' : undefined}
            aria-busy={item.pending || undefined}
            data-portfolio-slide-indicator-index={index}
            onClick={() => onSelect(index)}
          >
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
      })}
    </div>
  )
}

export function PortfolioSectionRail({
  items,
  activeIndex,
  side,
  hidden,
  onSelect,
}: {
  items: PortfolioNavigationItem[]
  activeIndex: number
  side: 'left' | 'right'
  hidden?: boolean
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
            <button
              key={item.id}
              type="button"
              className="absolute left-0 grid place-items-center border-0 bg-transparent p-0 outline-none focus-visible:z-[15] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2"
              style={{
                top: index * NAVIGATION_SVG_SIZE,
                width: NAVIGATION_SVG_SIZE,
                height: NAVIGATION_SVG_SIZE,
                color: isActive ? ACTIVE_COLOR : RESTING_COLOR,
              }}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              aria-busy={item.pending || undefined}
              data-portfolio-section-nav-index={index}
              data-portfolio-section-nav-side={side}
              onClick={() => onSelect(index)}
            >
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
        })}
      </div>
    </nav>
  )
}
