'use client'

import { useState, type CSSProperties, type RefObject } from 'react'
import type { EmblaCarouselType } from 'embla-carousel'
import type { EmblaViewportRefType } from 'embla-carousel-react'
import { faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { portfolioSlides } from '@/lib/portfolio'
import type { ProjectSlide } from '../domain/slides'
import type { PortfolioViewerSlide, ViewerOpenIntent } from '../domain/viewer'
import { getProjectColor } from '../domain/portfolioColors'
import type { PortfolioMediaElement } from '../usePortfolioMediaReadiness'
import {
  PortfolioSectionRail,
  PortfolioSlideRail,
} from '../navigation/PortfolioNavigationRail'
import type { PortfolioIntroPhase } from '../runtime/types'
import { usePortfolioTheme } from '../PortfolioThemeProvider'
import { PortfolioThemeMenu } from '../PortfolioThemeMenu'
import { PortfolioProjectCarousel } from './PortfolioProjectCarousel'
import { PortfolioDesktopIdentity } from './PortfolioDesktopIdentity'
import { PortfolioStartScreen } from './PortfolioStartScreen'
import { PortfolioLogoMark } from './PortfolioLogoMark'
import { PortfolioViewer } from './PortfolioViewer'
import { CircularIconButton, PortfolioHelperMessage } from './PortfolioControls'
import { FiveByFive } from './FiveByFive'
import { MOBILE_SECTION_CONTENT_PADDING_LEFT } from '../mobileLayout'

const START_SCREEN_INDEX = -1

type WideLayoutStyle = CSSProperties & {
  '--portfolio-description-rail-half-width': string
  '--portfolio-description-rail-width': string
  '--portfolio-control-gutter-width': string
  '--portfolio-slide-navigation-reserved-height': string
  '--portfolio-screenshot-size': string
}

type ProjectColorStyle = CSSProperties & { '--project-color': string }

const WIDE_LAYOUT_STYLE: WideLayoutStyle = {
  '--portfolio-description-rail-half-width':
    'min(calc(50vw - 2rem), calc(3.5rem + max(16rem, 24ch)))',
  '--portfolio-description-rail-width':
    'calc(var(--portfolio-description-rail-half-width) + var(--portfolio-description-rail-half-width))',
  '--portfolio-control-gutter-width': 'var(--portfolio-header-content-inset)',
  '--portfolio-slide-navigation-reserved-height':
    'calc(var(--portfolio-navigation-track-size) + var(--portfolio-frame-rule-size) + env(safe-area-inset-bottom, 0px))',
  '--portfolio-screenshot-size':
    'min(calc(100dvh - var(--portfolio-slide-navigation-reserved-height)), calc(100vw - var(--portfolio-description-rail-width) - var(--portfolio-control-gutter-width)))',
}

type PortfolioBrowserViewModel = {
  activeProjectIndex: number
  activeSlideIndexes: number[]
  introPhase: PortfolioIntroPhase
  isTouchInput: boolean
  isTouchLandscapeLayout: boolean
  isWideLayout: boolean
  projectSlides: Record<string, ProjectSlide[]>
  viewerIntent: ViewerOpenIntent | null
  viewerIndex: number
  viewerSlides: PortfolioViewerSlide[]
}

type PortfolioBrowserViewActions = {
  finishViewerClose: () => void
  handleHorizontalSelect: (projectIndex: number, slideIndex: number) => void
  handleViewerView: (index: number) => void
  moveHorizontal: (direction: -1 | 1) => void
  openViewer: (intent: ViewerOpenIntent) => void
  registerHorizontalApi: (
    projectIndex: number,
    api: EmblaCarouselType | null,
  ) => void
  registerMediaElement: (
    key: string,
    element: PortfolioMediaElement | null,
  ) => void
  setActiveProject: (
    projectIndex: number,
    mode: 'push' | 'replace',
    jump?: boolean,
    targetSlideIndex?: number,
  ) => void
  setActiveSlide: (
    projectIndex: number,
    slideIndex: number,
    mode: 'push' | 'replace',
  ) => void
}

export function PortfolioBrowserView({
  actions,
  model,
  curtainRef,
  keyboardSurfaceRef,
  verticalViewportRef,
}: {
  actions: PortfolioBrowserViewActions
  model: PortfolioBrowserViewModel
  curtainRef: RefObject<HTMLDivElement | null>
  keyboardSurfaceRef: RefObject<HTMLElement | null>
  verticalViewportRef: EmblaViewportRefType
}) {
  const { resolvedTheme } = usePortfolioTheme()
  const [mediaBackdropVisible, setMediaBackdropVisible] = useState(true)
  const viewerOpen = Boolean(model.viewerIntent)
  const usesSideBySideProjectLayout = model.isWideLayout && !model.isTouchInput
  const activeProject =
    model.activeProjectIndex >= 0
      ? portfolioSlides[model.activeProjectIndex]
      : undefined
  const activeSlides = activeProject
    ? model.projectSlides[activeProject.slug]
    : []
  const activeSlideIndex =
    model.activeProjectIndex >= 0
      ? (model.activeSlideIndexes[model.activeProjectIndex] ?? 0)
      : 0
  const activeSlide = activeSlides[activeSlideIndex]
  const activeProjectHasMedia = activeSlides.some(
    slide => slide.kind === 'screenshot',
  )
  const activeProjectColor =
    model.activeProjectIndex >= 0
      ? getProjectColor(model.activeProjectIndex, resolvedTheme)
      : getProjectColor(0, resolvedTheme)
  const sectionItems = [
    { id: 'work', label: 'Work' },
    ...portfolioSlides.map(project => ({
      id: project.id,
      label: project.title,
    })),
  ]
  const selectTop = () => {
    actions.setActiveProject(START_SCREEN_INDEX, 'push')
    keyboardSurfaceRef.current?.focus({ preventScroll: true })
  }
  const horizontalNavigation = (
    <nav
      data-portfolio-underlying-horizontal-navigation
      className={`pointer-events-none absolute inset-x-0 bottom-[var(--portfolio-frame-rule-size)] z-40 h-[calc(var(--portfolio-navigation-track-size)+env(safe-area-inset-bottom,0px))] transition-opacity duration-200 motion-reduce:transition-none ${
        model.introPhase === 'ready' && !viewerOpen
          ? 'opacity-100'
          : 'pointer-events-none opacity-0'
      }`}
      style={
        {
          ...WIDE_LAYOUT_STYLE,
          '--project-color': activeProjectColor,
        } as ProjectColorStyle & WideLayoutStyle
      }
      aria-label={
        activeProject ? `${activeProject.title} screens` : 'Portfolio screens'
      }
    >
      <div
        className="pointer-events-none absolute top-[calc(var(--portfolio-navigation-track-size)/2)] -translate-x-1/2 -translate-y-1/2"
        style={{
          left: !usesSideBySideProjectLayout
            ? '50%'
            : 'calc(50% + (var(--portfolio-description-rail-width) - var(--portfolio-control-gutter-width)) / 2)',
        }}
      >
        <PortfolioSlideRail
          items={activeSlides.map(slide => ({
            id: slide.id,
            label:
              slide.kind === 'description'
                ? `Show ${activeProject?.title ?? 'Portfolio'} description`
                : `Show ${slide.screenshot.alt}`,
          }))}
          activeIndex={activeSlideIndex}
          onSelect={index => {
            if (model.activeProjectIndex < 0) return
            actions.setActiveSlide(model.activeProjectIndex, index, 'push')
          }}
        />
      </div>
      {!model.isTouchInput ? (
        <div
          className={`pointer-events-auto absolute top-0 grid h-[var(--portfolio-navigation-track-size)] w-[var(--portfolio-navigation-track-size)] place-items-center transition-opacity duration-300 ease-out ${
            model.activeProjectIndex === START_SCREEN_INDEX || viewerOpen
              ? 'pointer-events-none opacity-0'
              : 'opacity-100'
          }`}
          style={{ right: 0 }}
        >
          <CircularIconButton
            visual={
              <FiveByFive
                variant="up"
                className="bg-resume-signal text-white"
              />
            }
            iconClassName=""
            className="font-portfolio-controls relative size-11 bg-transparent text-[var(--project-color)]"
            aria-label="Back to top"
            onClick={() => actions.setActiveProject(START_SCREEN_INDEX, 'push')}
          />
        </div>
      ) : null}
    </nav>
  )

  return (
    <main
      ref={keyboardSurfaceRef}
      tabIndex={-1}
      className="portfolio-theme-surface relative isolate h-dvh overflow-hidden text-[var(--portfolio-ink)] outline-none"
    >
      <div
        className={`pointer-events-none fixed inset-0 z-0 grid ${
          usesSideBySideProjectLayout
            ? 'grid-cols-[var(--portfolio-description-rail-width)_minmax(0,1fr)_var(--portfolio-control-gutter-width)]'
            : 'place-items-center'
        }`}
        style={WIDE_LAYOUT_STYLE}
        aria-hidden="true"
      >
        <span
          data-portfolio-media-backdrop
          className={`size-[100vmin] transition-opacity motion-reduce:transition-none ${
            model.activeProjectIndex >= 0 &&
            activeProjectHasMedia &&
            mediaBackdropVisible
              ? 'opacity-100 duration-[450ms] ease-out'
              : 'opacity-0 duration-150 ease-in'
          } ${usesSideBySideProjectLayout ? 'col-start-2 place-self-center' : ''}`}
          style={{
            background: viewerOpen
              ? 'radial-gradient(circle closest-side, color-mix(in srgb, var(--color-resume-signal) 20%, transparent) 0%, transparent 100%)'
              : 'radial-gradient(circle closest-side, color-mix(in srgb, var(--color-resume-signal) 10%, transparent) 0%, transparent 100%)',
          }}
        />
      </div>
      <div
        data-portfolio-browser-chrome
        className="absolute inset-0 z-10"
      >
        <span
          data-portfolio-top-rule
          className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[var(--portfolio-frame-rule-size)] bg-resume-signal"
          aria-hidden="true"
        />
        <span
          data-portfolio-bottom-rule
          className="pointer-events-none fixed inset-x-0 bottom-0 z-50 h-[var(--portfolio-frame-rule-size)] bg-resume-signal"
          aria-hidden="true"
        />
        <div
          ref={verticalViewportRef}
          data-portfolio-vertical-carousel
          className="h-dvh overflow-hidden [touch-action:pan-x_pinch-zoom]"
        >
          <div className="flex h-dvh flex-col">
            <div className="h-dvh min-h-0 shrink-0 basis-full">
              <PortfolioStartScreen
                projects={portfolioSlides}
                pendingProjectIndex={null}
                isTouchInput={model.isTouchInput}
                isWideLayout={model.isWideLayout}
                isTouchLandscapeLayout={model.isTouchLandscapeLayout}
                getProjectColor={projectIndex =>
                  getProjectColor(projectIndex, resolvedTheme)
                }
                setTitleRef={() => undefined}
                onHoveredChange={() => undefined}
                onPreview={() => undefined}
                onSelect={index => {
                  actions.setActiveProject(index, 'push', false, 0)
                  keyboardSurfaceRef.current?.focus({ preventScroll: true })
                }}
              />
            </div>

            {portfolioSlides.map((project, projectIndex) => {
              const slides = model.projectSlides[project.slug]
              return (
                <PortfolioProjectCarousel
                  key={project.id}
                  project={project}
                  projectIndex={projectIndex}
                  projectNumber={String(projectIndex + 1).padStart(2, '0')}
                  slides={slides}
                  activeSlideIndex={model.activeSlideIndexes[projectIndex] ?? 0}
                  active={model.activeProjectIndex === projectIndex}
                  isWideLayout={model.isWideLayout}
                  isTouchInput={model.isTouchInput}
                  layoutStyle={WIDE_LAYOUT_STYLE}
                  registerMediaElement={actions.registerMediaElement}
                  onApi={actions.registerHorizontalApi}
                  onSelect={actions.handleHorizontalSelect}
                  onOpenViewer={actions.openViewer}
                  onBackdropVisibilityChange={setMediaBackdropVisible}
                />
              )
            })}
          </div>
        </div>

        {model.isWideLayout ? (
          <PortfolioDesktopIdentity
            activeProjectIndex={model.activeProjectIndex}
            onSelectTop={selectTop}
          />
        ) : null}

        {!model.isWideLayout ? (
          <div
            data-portfolio-narrow-layout-logo
            className="pointer-events-none fixed left-0 top-[var(--portfolio-header-edge-inset)] z-[35] flex justify-center"
            style={{ width: MOBILE_SECTION_CONTENT_PADDING_LEFT }}
          >
            <button
              type="button"
              aria-label="Back to top"
              data-interactive-pop="off"
              data-portfolio-home-logo
              className="pointer-events-auto grid size-11 shrink-0 place-items-center border-0 bg-transparent p-0 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current"
              onClick={selectTop}
            >
              <PortfolioLogoMark className="shrink-0 text-resume-signal" />
            </button>
          </div>
        ) : null}

        <PortfolioThemeMenu
          hidden={viewerOpen}
          isTouchInput={model.isTouchInput}
          isTouchLandscapeLayout={model.isTouchLandscapeLayout}
          isWideLayout={model.isWideLayout}
        />

        <PortfolioSectionRail
          items={sectionItems}
          activeIndex={model.activeProjectIndex + 1}
          side="left"
          hidden={viewerOpen}
          onSelect={index => {
            const projectIndex = index - 1
            if (
              projectIndex >= 0 &&
              projectIndex === model.activeProjectIndex
            ) {
              actions.setActiveSlide(projectIndex, 0, 'push')
              return
            }
            actions.setActiveProject(
              projectIndex,
              'push',
              false,
              projectIndex >= 0 ? 0 : undefined,
            )
          }}
        />

        {viewerOpen && model.viewerIntent && activeProject ? (
          <PortfolioViewer
            project={activeProject}
            slides={model.viewerSlides}
            index={model.viewerIndex}
            intent={model.viewerIntent}
            registerMediaElement={actions.registerMediaElement}
            onView={actions.handleViewerView}
            onSelect={actions.handleViewerView}
            onClose={actions.finishViewerClose}
          />
        ) : null}

        <PortfolioHelperMessage
          kind={
            model.isWideLayout &&
            !model.isTouchInput &&
            model.introPhase === 'ready' &&
            model.activeProjectIndex === START_SCREEN_INDEX &&
            !viewerOpen
              ? 'navigation'
              : null
          }
        />

        <div
          ref={curtainRef}
          data-portfolio-loading-curtain
          data-phase={model.introPhase}
          className={`portfolio-theme-surface fixed inset-0 z-[100] grid place-items-center ${
            model.introPhase === 'ready'
              ? 'pointer-events-none'
              : 'pointer-events-auto'
          }`}
        >
          <div
            role={model.introPhase === 'error' ? 'alert' : undefined}
            className={`flex max-w-md flex-col items-center gap-5 px-8 text-center transition-opacity duration-300 ${
              model.introPhase === 'error' ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden={model.introPhase === 'error' ? undefined : true}
          >
            <p className="text-lg font-normal leading-relaxed text-[var(--portfolio-ink-80)]">
              Portfolio media didn&apos;t finish loading.
            </p>
            <CircularIconButton
              icon={faRotateRight}
              iconClassName="size-6"
              ring
              className="portfolio-theme-surface relative size-11 text-[var(--portfolio-ink)]"
              aria-label="Reload page"
              title="Reload page"
              onClick={() => window.location.reload()}
            />
          </div>
        </div>
        {horizontalNavigation}
      </div>
    </main>
  )
}
