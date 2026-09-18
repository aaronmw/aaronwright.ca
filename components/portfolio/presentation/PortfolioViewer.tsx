'use client'

import Lightbox, { type RenderSlideProps } from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import type { PortfolioProject } from '@/lib/portfolio'
import { portfolioMotion } from '@/lib/portfolioTokens'
import { viewerMediaKey } from '../domain/slides'
import type { PortfolioViewerSlide, ViewerOpenIntent } from '../domain/viewer'
import type { PortfolioMediaElement } from '../usePortfolioMediaReadiness'
import { PortfolioViewerControls } from './PortfolioViewerControls'
import { ScreenshotMedia } from './PortfolioMedia'
import { usePortfolioViewerTransition } from './usePortfolioViewerTransition'

export function PortfolioViewer({
  project,
  slides,
  index,
  intent,
  registerMediaElement,
  onView,
  onSelect,
  onClose,
}: {
  project: PortfolioProject
  slides: PortfolioViewerSlide[]
  index: number
  intent: ViewerOpenIntent
  registerMediaElement: (
    key: string,
    element: PortfolioMediaElement | null,
  ) => void
  onView: (index: number) => void
  onSelect: (index: number) => void
  onClose: () => void
}) {
  const {
    animateOpen,
    controllerRef,
    handleView,
    phase,
    requestClose,
    zoomRef,
  } = usePortfolioViewerTransition({ index, intent, slides, onClose, onView })

  function renderSlide({ slide }: RenderSlideProps) {
    if (slide.type !== 'portfolio-media') return null
    return (
      <div
        data-portfolio-viewer-stage={slide.id}
        className="relative h-dvh w-screen [--portfolio-media-padding:clamp(var(--portfolio-default-spacing),5vw,6rem)] [--portfolio-media-top-padding:var(--portfolio-media-padding)]"
      >
        <ScreenshotMedia
          screenshot={slide.screenshot}
          initialAspectRatio={
            slide.id === intent.mediaId ? intent.sourceAspectRatio : undefined
          }
          mediaKey={viewerMediaKey(slide.screenshot)}
          registerMediaElement={registerMediaElement}
          priority
          sizes="100vw"
          className="object-contain"
        />
      </div>
    )
  }

  return (
    <Lightbox
      open
      close={requestClose}
      index={index}
      slides={slides}
      plugins={[Zoom]}
      className={`portfolio-viewer portfolio-viewer--${phase} ${phase === 'closing' ? 'pointer-events-none' : ''}`}
      controller={{
        ref: controllerRef,
        closeOnBackdropClick: false,
        closeOnPullDown: false,
        closeOnPullUp: false,
      }}
      carousel={{ finite: true, preload: 1, padding: 0, spacing: 0 }}
      animation={{
        fade: 0,
        swipe: portfolioMotion.viewerSwipe,
        navigation: portfolioMotion.viewerNavigation,
        zoom: portfolioMotion.viewerZoom,
      }}
      toolbar={{ buttons: [] }}
      zoom={{
        ref: zoomRef,
        maxZoom: 2,
        supports: ['portfolio-media'],
        doubleClickMaxStops: 1,
        pinchZoomV4: true,
        scrollToZoom: false,
      }}
      render={{
        slide: renderSlide,
        buttonPrev: () => null,
        buttonNext: () => null,
        buttonClose: () => null,
        buttonZoom: () => null,
        controls: () => (
          <PortfolioViewerControls
            controllerRef={controllerRef}
            index={index}
            project={project}
            slides={slides}
            onClose={requestClose}
            onSelect={onSelect}
          />
        ),
      }}
      labels={{ Lightbox: `${project.title} enlarged media` }}
      on={{
        entering: animateOpen,
        view: ({ index: nextIndex }) => handleView(nextIndex),
      }}
    />
  )
}
