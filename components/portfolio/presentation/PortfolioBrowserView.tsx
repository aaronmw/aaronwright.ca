import type { CSSProperties, MutableRefObject, RefObject } from 'react'
import {
  faArrowUp,
  faRotateRight,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import type { PortfolioProject, PortfolioScreenshot } from '@/lib/portfolio'
import { portfolioSlides } from '@/lib/portfolio'
import {
  getCanonicalCarouselEntries,
  getLoopingCarouselEntries,
  positiveModulo,
} from '@/components/portfolio/domain/carousel'
import { slideNavigationTitle } from '@/components/portfolio/domain/routing'
import {
  hasBuildingWithAiTextSlide,
  isModalScreenshotSlide,
  type ProjectSlide,
} from '@/components/portfolio/domain/slides'
import {
  TOP_SCREEN_COLOR,
  buildActiveProjectColorFromHex,
  buildActiveProjectColors,
  buildProjectColors,
  getProjectColor as getThemeProjectColor,
} from '@/components/portfolio/domain/theme'
import type { PortfolioMediaElement } from '@/components/portfolio/usePortfolioMediaReadiness'
import {
  SectionNavigation,
  type SectionNavigationHandle,
} from '@/components/portfolio/navigation/SectionNavigation'
import {
  SlideNavigation,
  type SlideIndicatorMotionController,
} from '@/components/portfolio/navigation/SlideNavigation'
import { NAVIGATION_SVG_SIZE } from '@/components/portfolio/navigation/navigationTokens'
import {
  CircularIconButton,
  PortfolioHelperMessage,
  type PortfolioHelperMessageKind,
} from './PortfolioControls'
import { CarouselPullBoundary, ProjectPanel } from './PortfolioMedia'
import { ImageModal, type ModalTransitionRect } from './ImageModal'
import { PortfolioStartScreen } from './PortfolioStartScreen'
import { ProjectDescription } from './PortfolioText'
import type {
  PendingNavigation,
  PortfolioIntroPhase,
} from '@/components/portfolio/runtime/types'

const START_SCREEN_INDEX = -1
const PROJECT_COLOR_OVERRIDES: Record<string, string> = {
  'building-with-ai': '#e51b65',
  'aarons-toolbox': '#7d45e4',
  'informal-systems': '#244ED0',
  'mini-series-browser': '#A72525',
  nextphrase: '#F02D5D',
}
const GENERATED_PROJECT_COLORS = buildProjectColors(portfolioSlides.length)
const GENERATED_ACTIVE_PROJECT_COLORS = buildActiveProjectColors(
  portfolioSlides.length,
)
const PROJECT_COLORS = portfolioSlides.map(
  (project, projectIndex) =>
    PROJECT_COLOR_OVERRIDES[project.slug] ??
    GENERATED_PROJECT_COLORS[projectIndex],
)
const ACTIVE_PROJECT_COLORS = portfolioSlides.map((project, projectIndex) => {
  const override = PROJECT_COLOR_OVERRIDES[project.slug]
  return override
    ? buildActiveProjectColorFromHex(override)
    : GENERATED_ACTIVE_PROJECT_COLORS[projectIndex]
})
const SECTION_NAV_HAS_SLIDES = [
  false,
  ...portfolioSlides.map(project => project.screenshots.length > 1),
]

type WideLayoutStyle = CSSProperties & {
  '--portfolio-description-rail-half-width': string
  '--portfolio-description-rail-width': string
  '--portfolio-control-gutter-width': string
  '--portfolio-slide-navigation-reserved-height': string
  '--portfolio-screenshot-size': string
}

type ProjectColorStyle = CSSProperties & {
  '--project-color': string
}

const WIDE_LAYOUT_STYLE: WideLayoutStyle = {
  '--portfolio-description-rail-half-width':
    'min(calc(50vw - 2rem), calc(3.5rem + max(16rem, 24ch)))',
  '--portfolio-description-rail-width':
    'calc(var(--portfolio-description-rail-half-width) + var(--portfolio-description-rail-half-width))',
  '--portfolio-control-gutter-width': '6rem',
  '--portfolio-slide-navigation-reserved-height': `calc(${NAVIGATION_SVG_SIZE}px + max(2rem, env(safe-area-inset-bottom, 0px)))`,
  '--portfolio-screenshot-size':
    'min(calc(100dvh - var(--portfolio-slide-navigation-reserved-height)), calc(100vw - var(--portfolio-description-rail-width) - var(--portfolio-control-gutter-width)))',
}

function getProjectColor(projectIndex: number) {
  return getThemeProjectColor(PROJECT_COLORS, projectIndex)
}

function getActiveProjectColor(projectIndex: number) {
  return getThemeProjectColor(ACTIVE_PROJECT_COLORS, projectIndex)
}

type PortfolioBrowserViewRefs = {
  curtainRef: RefObject<HTMLDivElement | null>
  keyboardSurfaceRef: RefObject<HTMLElement | null>
  sectionMenuTitleRefs: MutableRefObject<Array<HTMLSpanElement | null>>
  sectionNavigationControllerRef: MutableRefObject<SectionNavigationHandle | null>
  slideIndicatorMotionControllerRef: MutableRefObject<SlideIndicatorMotionController | null>
  verticalRef: MutableRefObject<HTMLDivElement | null>
}

type PortfolioBrowserViewModel = {
  activeProjectIndex: number
  activeSlideIndexes: number[]
  boundaryBlurProjectSlugs: ReadonlySet<string>
  introPhase: PortfolioIntroPhase
  isInlineZoomPresentationActive: boolean
  isModalClosing: boolean
  isModalLayerActive: boolean
  isModalPresentationActive: boolean
  isTouchInput: boolean
  isTouchLandscapeLayout: boolean
  isWideLayout: boolean
  modalTransitionRect: ModalTransitionRect | null
  pendingNavigation: PendingNavigation
  projectCarouselsReady: boolean[]
  projectSlides: Record<string, ProjectSlide[]>
  sectionEntryMediaReady: boolean
  sectionNavHovered: boolean
  shouldShowModal: boolean
}

type PortfolioBrowserViewActions = {
  cancelVerticalUserTravel: () => void
  closeModal: () => void
  exitInlineZoomPresentation: () => void
  finishCloseModal: () => void
  focusKeyboardSurface: () => void
  getCarouselIndexFromSlideIndex: (
    project: PortfolioProject,
    slideIndex: number,
  ) => number
  getCarouselSlides: (project: PortfolioProject) => ProjectSlide[]
  handleInlinePresentationChange: (
    screenshotId: string,
    presented: boolean,
  ) => void
  moveHorizontal: (direction: -1 | 1) => void
  moveModalHorizontal: (direction: -1 | 1) => void
  registerMediaElement: (
    key: string,
    element: PortfolioMediaElement | null,
  ) => void
  setActiveModalSlide: (slide: ProjectSlide) => void
  setActiveProject: (
    projectIndex: number,
    mode: 'push' | 'replace',
    behavior?: ScrollBehavior,
    targetSlideIndex?: number,
  ) => void
  setActiveSlide: (
    projectIndex: number,
    slideIndex: number,
    mode: 'push' | 'replace',
    behavior: ScrollBehavior,
  ) => void
  setDescriptionRef: (
    projectSlug: string,
  ) => (node: HTMLDivElement | null) => void
  setHorizontalRef: (
    projectSlug: string,
  ) => (node: HTMLDivElement | null) => void
  setSectionNavHovered: (hovered: boolean) => void
}

export function PortfolioBrowserView({
  actions,
  model,
  refs,
}: {
  actions: PortfolioBrowserViewActions
  model: PortfolioBrowserViewModel
  refs: PortfolioBrowserViewRefs
}) {
  const activeProject =
    model.activeProjectIndex >= 0
      ? portfolioSlides[model.activeProjectIndex]
      : undefined
  const activeSlides = activeProject
    ? model.projectSlides[activeProject.slug]
    : []
  const activeSlideIndex =
    model.activeProjectIndex >= 0
      ? model.activeSlideIndexes[model.activeProjectIndex]
      : 0
  const activeSlide = activeSlides[activeSlideIndex]
  const activeScreenshot =
    activeSlide?.kind === 'screenshot' ? activeSlide.screenshot : undefined
  const activeProjectColor =
    model.activeProjectIndex >= 0
      ? getProjectColor(model.activeProjectIndex)
      : undefined
  const activeCarouselSlides = activeProject
    ? actions.getCarouselSlides(activeProject)
    : []
  const activeModalSlides = activeProject
    ? model.projectSlides[activeProject.slug].filter(slide =>
        isModalScreenshotSlide(activeProject, slide),
      )
    : []
  const activeModalScreenshots = activeModalSlides.map(
    slide => slide.screenshot,
  )
  const activeCarouselIndex = activeProject
    ? actions.getCarouselIndexFromSlideIndex(activeProject, activeSlideIndex)
    : 0
  const activeModalScreenshotIndex = Math.max(
    0,
    activeModalSlides.findIndex(slide => slide.id === activeSlide?.id),
  )
  const activeNavigationSlides = model.isModalPresentationActive
    ? activeModalSlides
    : activeCarouselSlides
  const activeNavigationIndex = model.isModalPresentationActive
    ? activeModalScreenshotIndex
    : activeCarouselIndex
  const pendingModalScreenshotId =
    model.pendingNavigation?.kind === 'modal'
      ? model.pendingNavigation.screenshotId
      : null
  const pendingNavigationSlide =
    model.pendingNavigation?.kind === 'slide' &&
    model.pendingNavigation.projectIndex === model.activeProjectIndex &&
    activeProject
      ? model.projectSlides[activeProject.slug][
          model.pendingNavigation.slideIndex
        ]
      : pendingModalScreenshotId
        ? activeNavigationSlides.find(
            slide =>
              slide.kind === 'screenshot' &&
              slide.screenshot.id === pendingModalScreenshotId,
          )
        : undefined
  const pendingNavigationIndex = pendingNavigationSlide
    ? activeNavigationSlides.findIndex(
        slide => slide.id === pendingNavigationSlide.id,
      )
    : null
  const helperMessageKind: PortfolioHelperMessageKind =
    model.introPhase !== 'ready'
      ? null
      : model.isModalPresentationActive || model.isInlineZoomPresentationActive
        ? 'close'
        : model.activeProjectIndex === START_SCREEN_INDEX
          ? 'navigation'
          : null
  const canMoveHorizontally = activeNavigationSlides.length > 1
  const previousSlide = activeProject
    ? activeNavigationSlides[
        positiveModulo(activeNavigationIndex - 1, activeNavigationSlides.length)
      ]
    : undefined
  const nextSlide = activeProject
    ? activeNavigationSlides[
        positiveModulo(activeNavigationIndex + 1, activeNavigationSlides.length)
      ]
    : undefined
  const previousSlideTitle =
    activeProject && previousSlide
      ? slideNavigationTitle(activeProject, previousSlide)
      : ''
  const nextSlideTitle =
    activeProject && nextSlide
      ? slideNavigationTitle(activeProject, nextSlide)
      : ''
  const sectionNavItems = [
    {
      id: 'work',
      projectIndex: START_SCREEN_INDEX,
      title: 'Work',
      color: TOP_SCREEN_COLOR,
    },
    ...portfolioSlides.map((project, projectIndex) => ({
      id: project.id,
      projectIndex,
      title: project.title,
      color: getProjectColor(projectIndex),
    })),
  ]
  const shouldCenterSlideNavigation =
    model.isModalPresentationActive || model.isInlineZoomPresentationActive
  const moveHorizontally = (direction: -1 | 1) => {
    actions.focusKeyboardSurface()

    if (model.isModalPresentationActive) {
      actions.moveModalHorizontal(direction)
    } else {
      actions.moveHorizontal(direction)
    }
  }

  return (
    <main
      ref={refs.keyboardSurfaceRef}
      tabIndex={-1}
      className="relative isolate h-dvh overflow-hidden bg-black text-white outline-none"
    >
      <div
        ref={refs.verticalRef}
        data-portfolio-vertical-scroll
        onPointerDownCapture={actions.cancelVerticalUserTravel}
        onTouchStartCapture={actions.cancelVerticalUserTravel}
        onWheelCapture={actions.cancelVerticalUserTravel}
        className={`h-dvh overscroll-none portfolio-scrollbar-none [&>section]:blur-0 [&>section]:transition-[filter] [&>section]:duration-1000 [&>section]:ease-in-out motion-reduce:[&>section]:transition-none ${
          model.introPhase === 'ready' ? 'snap-y snap-mandatory' : 'snap-none'
        } ${
          model.introPhase === 'ready' && model.sectionEntryMediaReady
            ? 'overflow-y-auto'
            : 'overflow-y-hidden'
        }`}
      >
        <PortfolioStartScreen
          projects={portfolioSlides}
          pendingProjectIndex={
            model.pendingNavigation?.kind === 'project'
              ? model.pendingNavigation.projectIndex
              : null
          }
          isTouchInput={model.isTouchInput}
          isWideLayout={model.isWideLayout}
          isTouchLandscapeLayout={model.isTouchLandscapeLayout}
          getProjectColor={getProjectColor}
          setTitleRef={(index, node) => {
            refs.sectionMenuTitleRefs.current[index] = node
          }}
          onHoveredChange={actions.setSectionNavHovered}
          onPreview={(index, previewing) => {
            refs.sectionNavigationControllerRef.current?.preview(
              index + 1,
              previewing,
            )
          }}
          onSelect={(index, keyboardTriggered) => {
            actions.focusKeyboardSurface()
            refs.sectionNavigationControllerRef.current?.pin(
              index + 1,
              'vertical',
              keyboardTriggered,
            )
            actions.setActiveProject(index, 'push', 'smooth', 0)
          }}
        />

        {portfolioSlides.map((project, projectIndex) => {
          const slides = actions.getCarouselSlides(project)
          const renderedSlides = model.isWideLayout
            ? getLoopingCarouselEntries(slides, true)
            : getCanonicalCarouselEntries(slides)
          const hasMobilePullBoundaries =
            !model.isWideLayout && slides.length > 1
          const projectNumber = String(projectIndex + 1).padStart(2, '0')
          const activeCarouselIndex = actions.getCarouselIndexFromSlideIndex(
            project,
            model.activeSlideIndexes[projectIndex] ?? 0,
          )
          const projectColor = getProjectColor(projectIndex)
          const isProjectActive =
            model.activeProjectIndex === projectIndex
          const projectContentColor =
            isProjectActive
              ? getActiveProjectColor(projectIndex)
              : projectColor
          const projectBodyColor = isProjectActive
            ? '#fff'
            : 'rgb(255 255 255 / 0.8)'

          return (
            <section
              key={project.id}
              className="relative h-dvh snap-start snap-always overflow-hidden bg-black"
              aria-label={project.title}
              style={WIDE_LAYOUT_STYLE}
            >
              {model.isWideLayout && !hasBuildingWithAiTextSlide(project) ? (
                <ProjectDescription
                  project={project}
                  projectNumber={projectNumber}
                  projectColor={projectColor}
                  projectBodyColor={projectBodyColor}
                  projectContentColor={projectContentColor}
                  setDescriptionRef={actions.setDescriptionRef(project.slug)}
                  isWideLayout={model.isWideLayout}
                  className={`absolute bottom-10 left-0 top-10 z-10 w-[var(--portfolio-description-rail-width)] bg-black/80 py-6 pl-[var(--portfolio-control-gutter-width)] pr-6 backdrop-blur-md transition-opacity duration-500 ease-out motion-reduce:transition-none ${
                    model.isInlineZoomPresentationActive &&
                    model.activeProjectIndex === projectIndex
                      ? 'pointer-events-none opacity-0'
                      : 'opacity-100'
                  }`}
                />
              ) : null}
              <div
                ref={actions.setHorizontalRef(project.slug)}
                data-portfolio-carousel={project.slug}
                className={`flex h-dvh snap-x snap-mandatory overflow-y-hidden overscroll-x-contain portfolio-scrollbar-none ${
                  model.projectCarouselsReady[projectIndex]
                    ? 'overflow-x-auto'
                    : 'overflow-x-hidden'
                } ${model.isWideLayout ? 'w-screen' : ''}`}
              >
                {hasMobilePullBoundaries ? (
                  <CarouselPullBoundary
                    edge="before"
                    projectColor={projectColor}
                  />
                ) : null}
                {renderedSlides.map(({ item: slide, key, realIndex, kind }) => (
                  <ProjectPanel
                    key={`${project.id}-${key}`}
                    project={project}
                    projectNumber={projectNumber}
                    projectColor={projectColor}
                    projectBodyColor={projectBodyColor}
                    projectContentColor={projectContentColor}
                    slide={slide}
                    carouselIndex={realIndex}
                    carouselEntryKind={kind}
                    isWideLayout={model.isWideLayout}
                    restingMediaPadding={
                      model.isTouchInput ? '0rem' : '1.5rem'
                    }
                    reserveSectionNavigationGutter={
                      model.isTouchInput && !model.isWideLayout
                    }
                    isActive={
                      model.activeProjectIndex === projectIndex &&
                      activeCarouselIndex === realIndex
                    }
                    inlineZoomPresentationActive={
                      model.isInlineZoomPresentationActive &&
                      model.activeProjectIndex === projectIndex
                    }
                    shouldBlurMedia={
                      slides.length > 2 &&
                      model.boundaryBlurProjectSlugs.has(project.slug)
                    }
                    concealedScreenshotId={
                      model.isModalLayerActive
                        ? activeScreenshot?.id
                        : undefined
                    }
                    registerMediaElement={actions.registerMediaElement}
                    setDescriptionRef={actions.setDescriptionRef(project.slug)}
                    onInlinePresentationChange={
                      actions.handleInlinePresentationChange
                    }
                  />
                ))}
                {hasMobilePullBoundaries ? (
                  <CarouselPullBoundary
                    edge="after"
                    projectColor={projectColor}
                  />
                ) : null}
              </div>
            </section>
          )
        })}
      </div>

      {model.isWideLayout || model.isTouchInput ? (
        <SectionNavigation
          controllerRef={refs.sectionNavigationControllerRef}
          sourceRef={refs.verticalRef}
          menuTitleRefs={refs.sectionMenuTitleRefs}
          items={sectionNavItems.map((item, itemIndex) => ({
            id: item.id,
            title: item.title,
            color: item.color,
            hasSlides: SECTION_NAV_HAS_SLIDES[itemIndex] ?? false,
            pending: Boolean(
              (model.pendingNavigation?.kind === 'project' &&
                model.pendingNavigation.projectIndex === item.projectIndex) ||
              ((model.pendingNavigation?.kind === 'slide' ||
                model.pendingNavigation?.kind === 'modal') &&
                item.projectIndex === model.activeProjectIndex),
            ),
          }))}
          activeIndex={model.activeProjectIndex + 1}
          hovered={model.sectionNavHovered}
          geometryMode={model.isTouchInput ? 'centered' : 'title-linked'}
          hideRightRail={model.isTouchInput}
          modalLayerActive={model.isModalLayerActive}
          modalPresentationActive={model.isModalPresentationActive}
          canMoveHorizontally={canMoveHorizontally}
          previousSlideTitle={previousSlideTitle}
          nextSlideTitle={nextSlideTitle}
          onHoveredChange={actions.setSectionNavHovered}
          onHorizontalNavigate={side =>
            moveHorizontally(side === 'left' ? -1 : 1)
          }
          onVerticalNavigate={itemIndex => {
            actions.focusKeyboardSurface()
            actions.setActiveProject(itemIndex - 1, 'push')
          }}
        />
      ) : null}

      <nav
        className={`pointer-events-none isolate ${
          model.isWideLayout
            ? 'grid grid-cols-[var(--portfolio-description-rail-width)_minmax(0,1fr)_var(--portfolio-control-gutter-width)]'
            : 'flex justify-center px-6'
        }`}
        aria-label={
          activeProject ? `${activeProject.title} screens` : 'Portfolio screens'
        }
        style={
          {
            ...WIDE_LAYOUT_STYLE,
            'position': 'absolute',
            'right': 0,
            'bottom': 'max(2rem, env(safe-area-inset-bottom, 0px))',
            'left': 0,
            'height': '52px',
            'overflow': 'visible',
            'zIndex': model.isModalLayerActive ? 60 : 40,
            '--project-color': activeProjectColor ?? getProjectColor(0),
            '--portfolio-modal-indicator-translate-x':
              'calc(3rem - var(--portfolio-description-rail-half-width))',
          } as ProjectColorStyle &
            WideLayoutStyle & {
              '--portfolio-modal-indicator-translate-x': string
            }
        }
      >
        <div
          className={`relative transition-transform duration-500 ease-out motion-reduce:transition-none ${
            model.isWideLayout ? 'col-start-2 justify-self-center' : ''
          } ${
            model.isWideLayout && shouldCenterSlideNavigation
              ? 'translate-x-[var(--portfolio-modal-indicator-translate-x)] will-change-transform'
              : 'translate-x-0'
          }`}
        >
          <SlideNavigation
            controllerRef={refs.slideIndicatorMotionControllerRef}
            items={activeNavigationSlides.map(slide => ({
              id: slide.id,
              label:
                slide.kind === 'description'
                  ? `Show ${activeProject?.title ?? 'Portfolio'} description`
                  : `Show ${slide.screenshot.alt}`,
            }))}
            activeIndex={activeNavigationIndex}
            pendingIndex={pendingNavigationIndex}
            color={activeProjectColor ?? getProjectColor(0)}
            onSelect={navigationIndex => {
              if (!activeProject) {
                return
              }

              const slide = activeNavigationSlides[navigationIndex]

              if (!slide) {
                return
              }

              actions.focusKeyboardSurface()
              const slideIndex = Math.max(
                0,
                model.projectSlides[activeProject.slug].findIndex(
                  projectSlide => projectSlide.id === slide.id,
                ),
              )

              if (model.isModalPresentationActive) {
                actions.setActiveModalSlide(slide)
                return
              }

              actions.setActiveSlide(
                model.activeProjectIndex,
                slideIndex,
                'push',
                'smooth',
              )
            }}
          />
        </div>
        {!model.isTouchInput ? (
          <div
            className={`pointer-events-auto absolute top-0 grid h-[52px] place-items-center transition-opacity duration-300 ease-out ${
              model.activeProjectIndex === START_SCREEN_INDEX
                ? 'pointer-events-none opacity-0'
                : 'opacity-100'
            }`}
            style={{
              right:
                'calc(1.5rem + env(safe-area-inset-right, 0px))',
              width: NAVIGATION_SVG_SIZE,
            }}
          >
            <CircularIconButton
              icon={faArrowUp}
              iconClassName="size-7"
              ring
              className="relative size-11 bg-transparent text-[var(--project-color)]"
              aria-label="Back to top"
              onClick={() => {
                actions.focusKeyboardSurface()
                actions.setActiveProject(START_SCREEN_INDEX, 'push')
              }}
            />
          </div>
        ) : null}
      </nav>

      <CircularIconButton
        icon={faXmark}
        iconClassName="size-7"
        ring
        className={`fixed right-5 top-5 z-[70] isolate size-11 bg-black text-[var(--project-color)] transition-[transform,opacity] duration-300 motion-reduce:transition-none ${
          model.isInlineZoomPresentationActive
            ? 'translate-y-0 rotate-0 opacity-100'
            : 'pointer-events-none -translate-y-16 rotate-90 opacity-0'
        }`}
        style={
          {
            '--project-color': activeProjectColor ?? PROJECT_COLORS[0],
            'position': 'fixed',
            'top': 'max(1.25rem, env(safe-area-inset-top, 0px))',
            'right': 'max(1.25rem, env(safe-area-inset-right, 0px))',
          } as ProjectColorStyle
        }
        aria-label="Reset image zoom"
        title="Close"
        aria-hidden={model.isInlineZoomPresentationActive ? undefined : true}
        tabIndex={model.isInlineZoomPresentationActive ? undefined : -1}
        onClick={actions.exitInlineZoomPresentation}
      />

      {model.shouldShowModal && activeProject && activeScreenshot ? (
        <ImageModal
          indicatorMotionControllerRef={refs.slideIndicatorMotionControllerRef}
          project={activeProject}
          projectColor={activeProjectColor ?? getProjectColor(0)}
          screenshot={activeScreenshot}
          screenshots={activeModalScreenshots}
          activeScreenshotIndex={activeModalScreenshotIndex}
          transitionRect={model.modalTransitionRect}
          isClosing={model.isModalClosing}
          registerMediaElement={actions.registerMediaElement}
          onClose={actions.closeModal}
          onExited={actions.finishCloseModal}
        />
      ) : null}

      <PortfolioHelperMessage
        kind={
          model.isWideLayout && !model.isTouchInput ? helperMessageKind : null
        }
      />

      <div
        ref={refs.curtainRef}
        data-portfolio-loading-curtain
        data-phase={model.introPhase}
        className={`fixed inset-0 z-[100] grid place-items-center bg-black ${
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
          <p className="text-lg font-light leading-relaxed text-white/80">
            Portfolio media didn&apos;t finish loading.
          </p>
          <CircularIconButton
            icon={faRotateRight}
            iconClassName="size-6"
            ring
            className="relative size-11 bg-black text-white"
            aria-label="Reload page"
            title="Reload page"
            onClick={() => window.location.reload()}
          />
        </div>
      </div>
    </main>
  )
}
