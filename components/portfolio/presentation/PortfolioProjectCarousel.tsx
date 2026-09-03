'use client'

import { type CSSProperties } from 'react'
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
  ProjectInformation,
  ProjectMetadata,
  ProjectNarrative,
} from './PortfolioText'
import { usePortfolioProjectCarousel } from './usePortfolioProjectCarousel'

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
    >
      {project.url ? (
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

export function PortfolioProjectCarousel({
  project,
  projectIndex,
  projectNumber,
  slides,
  activeSlideIndex,
  active,
  isWideLayout,
  isTouchInput,
  layoutStyle,
  registerMediaElement,
  onApi,
  onSelect,
  onSelectSlide,
  onOpenViewer,
  onBackdropVisibilityChange,
}: {
  project: PortfolioProject
  projectIndex: number
  projectNumber: string
  slides: ProjectSlide[]
  activeSlideIndex: number
  active: boolean
  isWideLayout: boolean
  isTouchInput: boolean
  layoutStyle: WideLayoutStyle
  registerMediaElement: (
    key: string,
    element: PortfolioMediaElement | null,
  ) => void
  onApi: (projectIndex: number, api: EmblaCarouselType | null) => void
  onSelect: (projectIndex: number, slideIndex: number) => void
  onSelectSlide: (slideIndex: number) => void
  onOpenViewer: (intent: ViewerOpenIntent) => void
  onBackdropVisibilityChange: (visible: boolean) => void
}) {
  const mediaSlides = slides.filter(
    (slide): slide is Extract<ProjectSlide, { kind: 'screenshot' }> =>
      slide.kind === 'screenshot',
  )
  const narratives = getProjectNarratives(project, slides)
  const narrative = narratives[activeSlideIndex] ?? narratives[0]
  const sideBySide = isWideLayout && !isTouchInput
  const hasMedia = mediaSlides.length > 0
  const { alignmentRootRef, narrativeContentTop, viewportRef } =
    usePortfolioProjectCarousel({
      active,
      activeSlideIndex,
      hasMedia,
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
        <div className="portfolio-safe-inline grid h-full place-items-center py-16">
          <ProjectInformation
            project={project}
            projectNumber={projectNumber}
            narrative={narrative}
            expanded
          />
        </div>
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
          <div className="absolute inset-x-0 top-[var(--portfolio-project-narrative-content-top)] z-20 grid grid-cols-[var(--portfolio-description-rail-width)_minmax(0,1fr)_var(--portfolio-control-gutter-width)]">
            <PortfolioLedgerFrame
              aria-label={`${project.title} overview`}
              className="col-start-1 [padding-left:var(--portfolio-control-gutter-width)] [padding-right:var(--portfolio-default-spacing)] [transform:translateY(calc(-100%-2lh))]"
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
            <div className="relative z-10 flex h-full min-h-0 min-w-0">
              {mediaSlides.map((slide, slideIndex) => (
                <article
                  key={slide.id}
                  data-portfolio-carousel-panel="canonical"
                  data-portfolio-carousel-index={slideIndex}
                  className="grid h-full min-h-0 min-w-0 shrink-0 basis-full grid-cols-[var(--portfolio-description-rail-width)_minmax(0,1fr)_var(--portfolio-control-gutter-width)] overflow-hidden"
                  aria-hidden={activeSlideIndex !== slideIndex}
                  inert={activeSlideIndex !== slideIndex}
                >
                  <PortfolioLedgerFrame className="relative col-start-1 h-full min-h-0 overflow-hidden">
                    <div className="absolute bottom-[var(--portfolio-slide-navigation-reserved-height)] left-[var(--portfolio-control-gutter-width)] right-[var(--portfolio-default-spacing)] top-[calc(var(--portfolio-project-narrative-content-top)-2lh)] min-h-0">
                      <ProjectNarrative
                        project={project}
                        narrative={narratives[slideIndex] ?? narrative}
                        wrapperClassName="h-full"
                      />
                    </div>
                  </PortfolioLedgerFrame>
                  <div className="relative z-10 col-start-2 min-h-0 min-w-0">
                    <ProjectPanel
                      slide={slide}
                      restingMediaPadding="var(--portfolio-default-spacing)"
                      isActive={activeSlideIndex === slideIndex}
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
          ref={alignmentRootRef}
          className="portfolio-safe-inline relative grid h-full min-h-0 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)_minmax(0,2fr)] pt-10"
          style={
            {
              'paddingLeft': MOBILE_SECTION_CONTENT_PADDING_LEFT,
              'paddingRight': MOBILE_SECTION_CONTENT_PADDING_RIGHT,
              '--portfolio-project-narrative-content-top':
                narrativeContentTop === null
                  ? '50%'
                  : `${narrativeContentTop}px`,
            } as ProjectVerticalAlignmentStyle
          }
        >
          <div
            data-portfolio-stacked-text-region
            className="pointer-events-none relative z-20 col-start-1 row-start-1 min-h-0 min-w-0"
          >
            <PortfolioLedgerFrame className="pointer-events-auto absolute inset-x-0 mx-auto w-full max-w-[calc(var(--portfolio-description-rail-width)-var(--portfolio-control-gutter-width)-var(--portfolio-default-spacing))] top-[var(--portfolio-project-narrative-content-top)] [transform:translateY(calc(-100%-2lh))]">
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
            className="relative z-10 col-start-1 row-span-2 row-start-1 min-h-0 min-w-0 overflow-hidden [touch-action:pan-y_pinch-zoom]"
          >
            <div className="flex h-full min-h-0 min-w-0">
              {mediaSlides.map((slide, slideIndex) => (
                <article
                  key={slide.id}
                  data-portfolio-carousel-panel="canonical"
                  data-portfolio-carousel-index={slideIndex}
                  className="grid h-full min-h-0 min-w-0 shrink-0 basis-full grid-rows-[minmax(0,1fr)_minmax(0,2fr)]"
                  aria-hidden={activeSlideIndex !== slideIndex}
                  inert={activeSlideIndex !== slideIndex}
                >
                  <PortfolioLedgerFrame className="relative row-start-1 mx-auto h-full min-h-0 w-full max-w-[calc(var(--portfolio-description-rail-width)-var(--portfolio-control-gutter-width)-var(--portfolio-default-spacing))] overflow-hidden">
                    <div className="absolute inset-x-0 bottom-0 top-[calc(var(--portfolio-project-narrative-content-top)-2lh)] min-h-0">
                      <ProjectNarrative
                        project={project}
                        narrative={narratives[slideIndex] ?? narrative}
                        wrapperClassName="h-full"
                      />
                    </div>
                  </PortfolioLedgerFrame>
                  <div className="relative row-start-2 min-h-0 min-w-0">
                    <ProjectPanel
                      slide={slide}
                      restingMediaPadding={
                        isTouchInput
                          ? '0rem'
                          : 'var(--portfolio-default-spacing)'
                      }
                      isActive={activeSlideIndex === slideIndex}
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
}
