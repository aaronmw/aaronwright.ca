import type { RefObject } from 'react'
import type { ControllerRef } from 'yet-another-react-lightbox'
import type { PortfolioProject } from '@/lib/portfolio'
import type { PortfolioViewerSlide } from '../domain/viewer'
import { PortfolioSlideRail } from '../navigation/PortfolioNavigationRail'
import { CircularIconButton } from './PortfolioControls'
import { PortfolioIcon } from './PortfolioIcon'

export function PortfolioViewerControls({
  controllerRef,
  index,
  project,
  slides,
  onClose,
  onSelect,
}: {
  controllerRef: RefObject<ControllerRef | null>
  index: number
  project: PortfolioProject
  slides: PortfolioViewerSlide[]
  onClose: () => void
  onSelect: (index: number) => void
}) {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-[var(--portfolio-layer-viewer-controls)] text-portfolio-text"
        data-portfolio-viewer-controls
      >
        {slides.length > 1 ? (
          <>
            <CircularIconButton
              visual={
                <PortfolioIcon
                  name="left"
                  className="text-portfolio-accent-decoration group-disabled:text-portfolio-text-dimmed"
                />
              }
              iconClassName=""
              className="group pointer-events-auto fixed top-1/2 size-[var(--portfolio-control-size)] -translate-y-1/2 bg-transparent text-portfolio-text disabled:pointer-events-none"
              style={{
                left: 'calc(var(--portfolio-navigation-control-edge-offset) + env(safe-area-inset-left, 0px))',
              }}
              aria-label="Previous image"
              disabled={index === 0}
              onClick={() => controllerRef.current?.prev()}
            />
            <CircularIconButton
              visual={
                <PortfolioIcon
                  name="right"
                  className="text-portfolio-accent-decoration group-disabled:text-portfolio-text-dimmed"
                />
              }
              iconClassName=""
              className="group pointer-events-auto fixed top-1/2 size-[var(--portfolio-control-size)] -translate-y-1/2 bg-transparent text-portfolio-text disabled:pointer-events-none"
              style={{
                right:
                  'calc(var(--portfolio-navigation-control-edge-offset) + env(safe-area-inset-right, 0px))',
              }}
              aria-label="Next image"
              disabled={index === slides.length - 1}
              onClick={() => controllerRef.current?.next()}
            />
          </>
        ) : null}
        <CircularIconButton
          visual={
            <PortfolioIcon
              name="close"
              className="text-portfolio-accent-decoration"
            />
          }
          iconClassName=""
          className="pointer-events-auto fixed size-[var(--portfolio-control-size)] bg-transparent text-portfolio-text"
          style={{
            right:
              'calc(var(--portfolio-navigation-control-edge-offset) + env(safe-area-inset-right, 0px))',
            top: 'max(var(--portfolio-navigation-rail-edge-offset), env(safe-area-inset-top, 0px))',
          }}
          aria-label="Close enlarged image"
          onClick={onClose}
        />
      </div>
      {slides.length > 1 ? (
        <nav
          data-portfolio-viewer-slide-navigation
          className="pointer-events-auto absolute inset-x-0 bottom-[var(--portfolio-frame-rule-size)] grid h-[calc(var(--portfolio-navigation-track-size)+env(safe-area-inset-bottom,0px))] place-items-center pb-[env(safe-area-inset-bottom,0px)] font-portfolio-controls"
          aria-label={`${project.title} screens`}
        >
          <PortfolioSlideRail
            items={slides.map(slide => ({
              id: slide.id,
              label: `Show ${slide.screenshot.alt}`,
            }))}
            activeIndex={index}
            onSelect={onSelect}
          />
        </nav>
      ) : null}
    </>
  )
}
