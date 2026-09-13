'use client'

import type { EmblaViewportRefType } from 'embla-carousel-react'
import type { PortfolioProject } from '@/lib/portfolio'
import { OverscrollIndicator } from '@/components/OverscrollIndicator'
import type { ResolvedProjectNarrative } from '../domain/narrative'
import type { ProjectSlide } from '../domain/slides'
import {
  MOBILE_SECTION_CONTENT_PADDING_LEFT,
  MOBILE_SECTION_CONTENT_PADDING_RIGHT,
} from '../mobileLayout'
import { FiveByFive } from './FiveByFive'
import { PortfolioProjectControls } from './PortfolioProjectControls'
import {
  PortfolioLedgerFrame,
  ProjectMetadata,
  ProjectNarrative,
} from './PortfolioText'

export function PortfolioTextCarousel({
  project,
  projectNumber,
  slides,
  narratives,
  activeSlideIndex,
  sideBySide,
  viewportRef,
  onSelectSlide,
}: {
  project: PortfolioProject
  projectNumber: string
  slides: ProjectSlide[]
  narratives: ResolvedProjectNarrative[]
  activeSlideIndex: number
  sideBySide: boolean
  viewportRef: EmblaViewportRefType
  onSelectSlide: (slideIndex: number) => void
}) {
  const showSlideControls = !sideBySide && slides.length > 1

  return (
    <div
      className={`portfolio-safe-inline grid h-full min-h-0 pt-[var(--portfolio-header-text-edge-inset)] ${sideBySide ? 'items-center' : ''} ${showSlideControls ? 'pb-[var(--portfolio-slide-navigation-reserved-height)]' : 'pb-[calc(var(--portfolio-frame-rule-size)+var(--portfolio-navigation-control-edge-offset)+env(safe-area-inset-bottom,0px))]'}`}
      style={{
        paddingLeft: MOBILE_SECTION_CONTENT_PADDING_LEFT,
        paddingRight: MOBILE_SECTION_CONTENT_PADDING_RIGHT,
      }}
    >
      <PortfolioLedgerFrame
        className={`mx-auto grid min-h-0 min-w-0 w-full grid-rows-[auto_minmax(0,1fr)] gap-y-[2lh] max-[30rem]:gap-y-[1lh] ${sideBySide ? 'max-h-full' : 'h-full'} ${sideBySide && slides.length > 1 ? 'max-w-[calc(2*var(--resume-content-width)+2*var(--portfolio-default-spacing))]' : 'max-w-[var(--resume-content-width)]'}`}
      >
        <ProjectMetadata
          project={project}
          projectNumber={projectNumber}
          alignWithLogo={false}
          onSelectSlide={onSelectSlide}
        >
          {showSlideControls ? (
            <PortfolioProjectControls
              activeSlideIndex={activeSlideIndex}
              projectTitle={project.title}
              slideCount={slides.length}
              onSelectSlide={onSelectSlide}
            />
          ) : null}
        </ProjectMetadata>
        <div
          ref={viewportRef}
          data-portfolio-carousel={project.slug}
          className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)] overflow-hidden [touch-action:pan-y_pinch-zoom]"
        >
          <div
            className={`min-h-0 min-w-0 ${sideBySide ? 'grid grid-flow-col auto-cols-fr grid-rows-[minmax(0,1fr)] gap-x-[calc(2*var(--portfolio-default-spacing))]' : 'flex h-full gap-x-[var(--portfolio-default-spacing)]'}`}
          >
            {slides.map((slide, slideIndex) => {
              const hidden = !sideBySide && activeSlideIndex !== slideIndex
              return (
                <article
                  key={slide.id}
                  data-portfolio-carousel-panel="canonical"
                  data-portfolio-carousel-index={slideIndex}
                  className={`min-h-0 min-w-0 shrink-0 basis-full ${sideBySide ? 'grid grid-rows-[minmax(0,1fr)]' : 'h-full'}`}
                  aria-hidden={hidden}
                  inert={hidden}
                >
                  <OverscrollIndicator
                    aria-label={`${project.title} ${slide.kind === 'description' ? 'biography' : 'working style and strengths'}`}
                    role="region"
                    tabIndex={0}
                    bottomScrollControl={<FiveByFive variant="down" />}
                    persistentScrollbar
                    wrapperClassName={sideBySide ? undefined : 'h-full'}
                    className="overflow-x-hidden outline-none [touch-action:pan-y_pinch-zoom] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-portfolio-accent"
                  >
                    <ProjectNarrative
                      project={project}
                      narrative={narratives[slideIndex]}
                    />
                  </OverscrollIndicator>
                </article>
              )
            })}
          </div>
        </div>
      </PortfolioLedgerFrame>
    </div>
  )
}
