'use client'

import { memo, useCallback, useMemo, type CSSProperties } from 'react'
import type { EmblaCarouselType } from 'embla-carousel'
import type { PortfolioProject } from '@/lib/portfolio'
import { getProjectNarratives } from '../domain/narrative'
import type { ProjectSlide } from '../domain/slides'
import type { PortfolioMediaElement } from '../usePortfolioMediaReadiness'
import type { ViewerOpenIntent } from '../domain/viewer'
import {
  MOBILE_SECTION_CONTENT_PADDING_LEFT,
  MOBILE_SECTION_CONTENT_PADDING_RIGHT,
} from '../mobileLayout'
import { ProjectPanel } from './PortfolioMedia'
import { PortfolioProjectControls } from './PortfolioProjectControls'
import {
  PortfolioLedgerFrame,
  ProjectMetadata,
  ProjectNarrativeScroll,
} from './PortfolioText'
import { usePortfolioProjectCarousel } from './usePortfolioProjectCarousel'
import { PortfolioTextCarousel } from './PortfolioTextCarousel'

type WideLayoutStyle = CSSProperties & {
  '--portfolio-description-rail-half-width': string
  '--portfolio-description-rail-width': string
  '--portfolio-control-gutter-width': string
  '--portfolio-slide-navigation-reserved-height': string
  '--portfolio-screenshot-size': string
}

type ProjectVerticalAlignmentStyle = CSSProperties & {
  '--portfolio-project-narrative-content-top': string
}

function ProjectCarouselMetadata({
  activeSlideIndex,
  project,
  projectNumber,
  slideCount,
  onSelectSlide,
}: {
  activeSlideIndex: number
  project: PortfolioProject
  projectNumber: string
  slideCount: number
  onSelectSlide: (slideIndex: number) => void
}) {
  return (
    <ProjectMetadata
      project={project}
      projectNumber={projectNumber}
      alignWithLogo={false}
      onSelectSlide={onSelectSlide}
    >
      {slideCount > 1 || project.url ? (
        <PortfolioProjectControls
          activeSlideIndex={activeSlideIndex}
          projectTitle={project.title}
          slideCount={slideCount}
          url={project.url}
          onSelectSlide={onSelectSlide}
        />
      ) : null}
    </ProjectMetadata>
  )
}

export const PortfolioProjectCarousel = memo(function PortfolioProjectCarousel({
  project,
  projectIndex,
  projectNumber,
  slides,
  activeSlideIndex,
  active,
  playbackActive,
  isWideLayout,
  isTouchInput,
  layoutStyle,
  registerMediaElement,
  onApi,
  onSelect,
  onSelectSlide: selectProjectSlide,
  onOpenViewer,
  onBackdropVisibilityChange,
}: {
  project: PortfolioProject
  projectIndex: number
  projectNumber: string
  slides: ProjectSlide[]
  activeSlideIndex: number
  active: boolean
  playbackActive: boolean
  isWideLayout: boolean
  isTouchInput: boolean
  layoutStyle: WideLayoutStyle
  registerMediaElement: (
    key: string,
    element: PortfolioMediaElement | null,
  ) => void
  onApi: (projectIndex: number, api: EmblaCarouselType | null) => void
  onSelect: (projectIndex: number, slideIndex: number) => void
  onSelectSlide: (
    projectIndex: number,
    slideIndex: number,
    mode: 'push' | 'replace',
  ) => void
  onOpenViewer: (intent: ViewerOpenIntent) => void
  onBackdropVisibilityChange: (visible: boolean) => void
}) {
  const onSelectSlide = useCallback(
    (slideIndex: number) =>
      selectProjectSlide(projectIndex, slideIndex, 'push'),
    [projectIndex, selectProjectSlide],
  )
  const mediaSlides = useMemo(
    () =>
      slides.filter(
        (slide): slide is Extract<ProjectSlide, { kind: 'screenshot' }> =>
          slide.kind === 'screenshot',
      ),
    [slides],
  )
  const narratives = useMemo(
    () => getProjectNarratives(project, slides),
    [project, slides],
  )
  const narrative = narratives[activeSlideIndex] ?? narratives[0]
  const sideBySide = isWideLayout
  const hasMedia = mediaSlides.length > 0
  const { alignmentRootRef, narrativeContentTop, viewportRef } =
    usePortfolioProjectCarousel({
      active,
      activeSlideIndex,
      enabled: hasMedia || (!sideBySide && slides.length > 1),
      projectId: project.id,
      projectIndex,
      sideBySide,
      onApi,
      onBackdropVisibilityChange,
      onSelect,
    })

  if (!narrative) return null

  return (
    <section
      className="relative h-dvh min-h-0 min-w-0 shrink-0 basis-full overflow-hidden"
      aria-label={project.title}
      style={layoutStyle}
    >
      {!hasMedia ? (
        <PortfolioTextCarousel
          project={project}
          projectNumber={projectNumber}
          slides={slides}
          narratives={narratives}
          activeSlideIndex={activeSlideIndex}
          sideBySide={sideBySide}
          viewportRef={viewportRef}
          onSelectSlide={onSelectSlide}
        />
      ) : sideBySide ? (
        <div
          ref={alignmentRootRef}
          className="relative h-full min-h-0"
          style={
            {
              '--portfolio-project-narrative-content-top':
                narrativeContentTop === null
                  ? '50dvh'
                  : `${narrativeContentTop}px`,
            } as ProjectVerticalAlignmentStyle
          }
        >
          <div className="pointer-events-none absolute inset-x-0 top-[var(--portfolio-project-narrative-content-top)] z-[var(--portfolio-layer-overlay)] grid grid-cols-[var(--portfolio-description-rail-width)_minmax(0,1fr)_var(--portfolio-control-gutter-width)]">
            <PortfolioLedgerFrame
              aria-label={`${project.title} overview`}
              className="pointer-events-auto col-start-1 [padding-left:var(--portfolio-control-gutter-width)] [padding-right:var(--portfolio-default-spacing)] [transform:translateY(calc(-100%-2lh))]"
            >
              <ProjectCarouselMetadata
                activeSlideIndex={activeSlideIndex}
                project={project}
                projectNumber={projectNumber}
                slideCount={slides.length}
                onSelectSlide={onSelectSlide}
              />
            </PortfolioLedgerFrame>
          </div>
          <div
            ref={viewportRef}
            data-portfolio-carousel={project.slug}
            className="relative h-full min-h-0 min-w-0 overflow-hidden [touch-action:pan-y_pinch-zoom]"
          >
            <div className="relative z-[var(--portfolio-layer-content)] flex h-full min-h-0 min-w-0">
              {mediaSlides.map((slide, slideIndex) => (
                <article
                  key={slide.id}
                  data-portfolio-carousel-panel="canonical"
                  data-portfolio-carousel-index={slideIndex}
                  className="grid h-full min-h-0 min-w-0 shrink-0 basis-full grid-cols-[var(--portfolio-description-rail-width)_minmax(0,1fr)_var(--portfolio-control-gutter-width)]"
                  aria-hidden={activeSlideIndex !== slideIndex}
                  inert={activeSlideIndex !== slideIndex}
                >
                  <PortfolioLedgerFrame className="relative col-start-1 h-full min-h-0">
                    <div className="absolute left-[var(--portfolio-control-gutter-width)] right-[var(--portfolio-default-spacing)] top-[var(--portfolio-project-narrative-content-top)] bottom-[calc(var(--portfolio-frame-rule-size)+var(--portfolio-default-spacing)+env(safe-area-inset-bottom,0px))] min-h-0">
                      <ProjectNarrativeScroll
                        label={`${project.title} slide ${slideIndex + 1} text`}
                        narrative={narratives[slideIndex] ?? narrative}
                      />
                    </div>
                  </PortfolioLedgerFrame>
                  <div className="relative z-[var(--portfolio-layer-content)] col-start-2 min-h-0 min-w-0">
                    <ProjectPanel
                      slide={slide}
                      restingMediaPadding="var(--portfolio-default-spacing)"
                      isActive={activeSlideIndex === slideIndex}
                      playbackActive={playbackActive && activeSlideIndex === slideIndex}
                      registerMediaElement={registerMediaElement}
                      onOpenViewer={onOpenViewer}
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="portfolio-safe-inline relative grid h-full min-h-0 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] gap-y-[2lh] pt-[var(--portfolio-header-text-edge-inset)] pb-[var(--portfolio-slide-navigation-reserved-height)] max-[30rem]:gap-y-[1lh]"
          style={{
            paddingLeft: MOBILE_SECTION_CONTENT_PADDING_LEFT,
            paddingRight: MOBILE_SECTION_CONTENT_PADDING_RIGHT,
          }}
        >
          <PortfolioLedgerFrame
            aria-label={`${project.title} overview`}
            className="relative z-[var(--portfolio-layer-overlay)] mx-auto w-full max-w-[calc(var(--portfolio-description-rail-width)-var(--portfolio-control-gutter-width)-var(--portfolio-default-spacing))] max-[30rem]:max-w-none"
          >
            <ProjectCarouselMetadata
              activeSlideIndex={activeSlideIndex}
              project={project}
              projectNumber={projectNumber}
              slideCount={slides.length}
              onSelectSlide={onSelectSlide}
            />
          </PortfolioLedgerFrame>
          <div
            ref={viewportRef}
            data-portfolio-carousel={project.slug}
            className="relative z-[var(--portfolio-layer-content)] min-h-0 min-w-0 overflow-hidden [touch-action:pan-y_pinch-zoom]"
          >
            <div className="flex h-full min-h-0 min-w-0 gap-x-[var(--portfolio-default-spacing)]">
              {mediaSlides.map((slide, slideIndex) => (
                <article
                  key={slide.id}
                  data-portfolio-carousel-panel="canonical"
                  data-portfolio-carousel-index={slideIndex}
                  className="grid h-full min-h-0 min-w-0 shrink-0 basis-full grid-rows-[minmax(0,2fr)_minmax(0,1fr)] min-[30rem]:grid-rows-2"
                  aria-hidden={activeSlideIndex !== slideIndex}
                  inert={activeSlideIndex !== slideIndex}
                >
                  <PortfolioLedgerFrame
                    data-portfolio-stacked-text-region
                    className="row-start-1 mx-auto h-full min-h-0 min-w-0 w-full max-w-[calc(var(--portfolio-description-rail-width)-var(--portfolio-control-gutter-width)-var(--portfolio-default-spacing))] overflow-hidden max-[30rem]:max-w-none"
                  >
                    <ProjectNarrativeScroll
                      label={`${project.title} slide ${slideIndex + 1} text`}
                      narrative={narratives[slideIndex] ?? narrative}
                    />
                  </PortfolioLedgerFrame>
                  <div className="relative row-start-2 min-h-0 min-w-0">
                    <ProjectPanel
                      slide={slide}
                      reserveNavigationSpace={false}
                      restingMediaPadding={
                        isTouchInput
                          ? '0rem'
                          : 'var(--portfolio-default-spacing)'
                      }
                      isActive={activeSlideIndex === slideIndex}
                      playbackActive={playbackActive && activeSlideIndex === slideIndex}
                      registerMediaElement={registerMediaElement}
                      onOpenViewer={onOpenViewer}
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
})
