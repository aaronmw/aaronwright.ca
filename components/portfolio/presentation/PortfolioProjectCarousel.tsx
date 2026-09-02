'use client'

import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures'
import type { EmblaCarouselType } from 'embla-carousel'
import type { PortfolioProject } from '@/lib/portfolio'
import { getProjectNarratives } from '../domain/narrative'
import type { ProjectSlide } from '../domain/slides'
import type { PortfolioMediaElement } from '../usePortfolioMediaReadiness'
import type { ViewerOpenIntent } from '../domain/viewer'
import { getLockedMouseDragAxis } from '../runtime/mouseDragAxisLock'
import {
  MOBILE_SECTION_CONTENT_PADDING_LEFT,
  MOBILE_SECTION_CONTENT_PADDING_RIGHT,
} from '../mobileLayout'
import { ProjectPanel } from './PortfolioMedia'
import {
  PortfolioLedgerFrame,
  ProjectInformation,
  ProjectMetadata,
  ProjectNarrative,
} from './PortfolioText'

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

const NARRATIVE_HEADER_GAP_IN_LINES = 2

function readPixelValue(style: CSSStyleDeclaration, property: string) {
  const value = Number.parseFloat(style.getPropertyValue(property))
  return Number.isFinite(value) ? value : 0
}

function isSelectableTextTarget(target: EventTarget | null) {
  return Boolean(
    target instanceof Element &&
    target.closest('[data-portfolio-selectable-text]'),
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
  onOpenViewer: (intent: ViewerOpenIntent) => void
  onBackdropVisibilityChange: (visible: boolean) => void
}) {
  const [initialSlideIndex] = useState(activeSlideIndex)
  const mediaSlides = slides.filter(
    (slide): slide is Extract<ProjectSlide, { kind: 'screenshot' }> =>
      slide.kind === 'screenshot',
  )
  const narratives = getProjectNarratives(project, slides)
  const narrative = narratives[activeSlideIndex] ?? narratives[0]
  const sideBySide = isWideLayout && !isTouchInput
  const hasMedia = mediaSlides.length > 0
  const alignmentRootRef = useRef<HTMLDivElement>(null)
  const [narrativeContentTop, setNarrativeContentTop] = useState<number | null>(
    null,
  )
  const carouselMovingRef = useRef(false)
  const destinationSelectedRef = useRef(false)
  const settledSlideIndexRef = useRef(activeSlideIndex)
  const [plugins] = useState(() => [WheelGesturesPlugin()])
  const [viewportRef, emblaApi] = useEmblaCarousel(
    {
      axis: 'x',
      align: 'start',
      loop: false,
      skipSnaps: false,
      startIndex: initialSlideIndex,
      active: hasMedia,
      watchDrag: (_api, event) => {
        if (event.type !== 'mousedown') return true
        if (isSelectableTextTarget(event.target)) return false
        return getLockedMouseDragAxis(event) === 'x'
      },
    },
    plugins,
  )
  const notifyBackdropVisibility = useEffectEvent(onBackdropVisibilityChange)

  useEffect(() => {
    onApi(projectIndex, emblaApi ?? null)
    if (!emblaApi) return
    const handleSelect = () => {
      const selectedIndex = emblaApi.selectedScrollSnap()
      if (
        carouselMovingRef.current &&
        selectedIndex !== settledSlideIndexRef.current
      ) {
        destinationSelectedRef.current = true
      }
      onSelect(projectIndex, selectedIndex)
    }
    const handleScroll = () => {
      const selectedIndex = emblaApi.selectedScrollSnap()
      if (!carouselMovingRef.current) {
        carouselMovingRef.current = true
        destinationSelectedRef.current =
          selectedIndex !== settledSlideIndexRef.current
        if (active) notifyBackdropVisibility(false)
      }
      if (selectedIndex !== settledSlideIndexRef.current) {
        destinationSelectedRef.current = true
      }
      if (!destinationSelectedRef.current) return

      const snaps = emblaApi.scrollSnapList()
      const target = snaps[selectedIndex]
      const neighboringDistances = [
        snaps[selectedIndex - 1],
        snaps[selectedIndex + 1],
      ]
        .filter((snap): snap is number => snap !== undefined)
        .map(snap => Math.abs(target - snap))
      const snapDistance = Math.min(...neighboringDistances)
      const closeToDestination =
        Math.abs(emblaApi.scrollProgress() - target) <= snapDistance * 0.2
      if (active) notifyBackdropVisibility(closeToDestination)
    }
    const handleSettle = () => {
      carouselMovingRef.current = false
      destinationSelectedRef.current = false
      settledSlideIndexRef.current = emblaApi.selectedScrollSnap()
      if (active) notifyBackdropVisibility(true)
    }
    emblaApi.on('select', handleSelect)
    emblaApi.on('scroll', handleScroll)
    emblaApi.on('settle', handleSettle)
    handleSelect()
    return () => {
      emblaApi.off('select', handleSelect)
      emblaApi.off('scroll', handleScroll)
      emblaApi.off('settle', handleSettle)
      onApi(projectIndex, null)
    }
  }, [active, emblaApi, onApi, onSelect, projectIndex])

  useEffect(() => {
    if (active) notifyBackdropVisibility(true)
  }, [active])

  useLayoutEffect(() => {
    const root = alignmentRootRef.current
    if (!root) return

    const narrativeNodes = Array.from(
      root.querySelectorAll<HTMLElement>(
        '[data-portfolio-slide-narrative-content]',
      ),
    )
    const metadataNode = root.querySelector<HTMLElement>(
      '[data-portfolio-project-metadata]',
    )
    const stackedTextRegion = root.querySelector<HTMLElement>(
      '[data-portfolio-stacked-text-region]',
    )
    if (narrativeNodes.length === 0 || !metadataNode) return
    if (!sideBySide && !stackedTextRegion) return

    const updateAlignment = () => {
      const rootStyle = window.getComputedStyle(root)
      const topRuleHeight = readPixelValue(rootStyle, '--logo-stroke-width')
      const defaultSpacing =
        readPixelValue(rootStyle, '--portfolio-default-spacing') ||
        topRuleHeight * 5
      const lineHeight = Number.parseFloat(
        window.getComputedStyle(narrativeNodes[0]).lineHeight,
      )
      const narrativeGap =
        (Number.isFinite(lineHeight) ? lineHeight : 0) *
        NARRATIVE_HEADER_GAP_IN_LINES
      const tallestNarrativeHeight = Math.max(
        ...narrativeNodes.map(node => node.getBoundingClientRect().height),
      )
      const metadataHeight = metadataNode.getBoundingClientRect().height
      const centeredTop = sideBySide
        ? (root.clientHeight - tallestNarrativeHeight) / 2
        : ((stackedTextRegion?.clientHeight ?? 0) -
            (metadataHeight + narrativeGap + tallestNarrativeHeight)) /
            2 +
          metadataHeight +
          narrativeGap
      const minimumTop = sideBySide
        ? topRuleHeight + defaultSpacing + metadataHeight + narrativeGap
        : metadataHeight + narrativeGap
      const nextTop = Math.round(Math.max(centeredTop, minimumTop) * 100) / 100

      setNarrativeContentTop(current =>
        current === nextTop ? current : nextTop,
      )
    }

    const resizeObserver = new ResizeObserver(updateAlignment)
    resizeObserver.observe(root)
    resizeObserver.observe(metadataNode)
    if (stackedTextRegion) resizeObserver.observe(stackedTextRegion)
    narrativeNodes.forEach(node => resizeObserver.observe(node))
    updateAlignment()

    return () => resizeObserver.disconnect()
  }, [project.id, sideBySide])

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
              <ProjectMetadata
                project={project}
                projectNumber={projectNumber}
                alignWithLogo={false}
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
              <ProjectMetadata
                project={project}
                projectNumber={projectNumber}
                alignWithLogo={false}
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
