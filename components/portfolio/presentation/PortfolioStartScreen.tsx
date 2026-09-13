import { memo, type CSSProperties } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import type { PortfolioProject } from '@/lib/portfolio'
import { OverscrollIndicator } from '@/components/OverscrollIndicator'
import {
  MOBILE_SECTION_CONTENT_PADDING_LEFT,
  MOBILE_SECTION_CONTENT_PADDING_RIGHT,
} from '@/components/portfolio/mobileLayout'
import {
  PortfolioInlineMarkdown,
  PortfolioLedgerFrame,
  ProjectHeadingUnderline,
} from './PortfolioText'
import { FiveByFive } from './FiveByFive'
import { PortfolioContactInfo } from './PortfolioContactInfo'

const MOBILE_SECTION_CONTENT_INSETS: CSSProperties = {
  paddingLeft: MOBILE_SECTION_CONTENT_PADDING_LEFT,
  paddingRight: MOBILE_SECTION_CONTENT_PADDING_RIGHT,
}

type ProjectColorStyle = CSSProperties & {
  '--project-color': string
}

function PortfolioStartHeader({
  isTouchLandscapeLayout,
  isWideLayout,
}: {
  isTouchLandscapeLayout: boolean
  isWideLayout: boolean
}) {
  return (
    <div
      className={`portfolio-start-header ${
        isTouchLandscapeLayout
          ? 'min-w-0'
          : isWideLayout
            ? 'portfolio-wide-content-inset absolute inset-x-0 top-[var(--portfolio-contact-edge-inset)] [--portfolio-wide-content-inset-right:var(--portfolio-header-control-reserved-width)]'
            : 'min-w-0'
      }`}
    >
      <div
        data-portfolio-start-header-content
        className="mx-auto flex w-full items-start justify-between gap-x-[1ch]"
      >
        {/* The wide layout draws the name beside the logo; reserve its width here. */}
        <div
          className={`flex min-w-0 items-center text-portfolio-text ${isWideLayout ? 'invisible' : ''}`}
          data-portfolio-start-title
          aria-hidden={isWideLayout || undefined}
        >
          <h1 className="font-bold italic min-[30rem]:whitespace-nowrap">
            Aaron M. Wright
          </h1>
        </div>
        <PortfolioContactInfo />
      </div>
    </div>
  )
}

function PortfolioProjectIndex({
  getProjectColor,
  pendingProjectIndex,
  projects,
  setTitleRef,
  onHoveredChange,
  onPreview,
  onSelect,
}: {
  getProjectColor: (index: number) => string
  pendingProjectIndex: number | null
  projects: PortfolioProject[]
  setTitleRef: (index: number, node: HTMLSpanElement | null) => void
  onHoveredChange: (hovered: boolean) => void
  onPreview: (index: number, previewing: boolean) => void
  onSelect: (index: number, keyboardTriggered: boolean) => void
}) {
  return (
    <div
      data-portfolio-start-content
      className="portfolio-start-index-container mx-auto min-w-0 w-full max-w-[var(--resume-content-width)]"
    >
      <PortfolioLedgerFrame
        aria-label="Portfolio sections"
        className="portfolio-start-index grid overflow-hidden"
        onPointerEnter={() => onHoveredChange(true)}
        onPointerLeave={() => onHoveredChange(false)}
      >
        {projects.map((project, index) => {
          const pending = pendingProjectIndex === index

          return (
            <button
              key={project.id}
              type="button"
              data-interactive-pop="off"
              data-portfolio-start-section-index={index + 1}
              className="portfolio-start-index-item group grid w-full touch-manipulation items-baseline pb-[1lh] text-left text-portfolio-text outline-none transition-colors duration-[var(--portfolio-motion-state)] ease-out hover:text-portfolio-accent focus-visible:text-portfolio-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-portfolio-accent motion-reduce:transition-none"
              style={
                {
                  '--project-color': getProjectColor(index),
                } as ProjectColorStyle
              }
              aria-busy={pending ? true : undefined}
              onPointerEnter={() => {
                onHoveredChange(true)
                onPreview(index, true)
              }}
              onPointerDown={(event) => {
                if (event.button !== 0) return
                onHoveredChange(true)
                onPreview(index, true)
              }}
              onPointerLeave={() => onPreview(index, false)}
              onClick={(event) => onSelect(index, event.detail === 0)}
            >
              <span className="min-w-0 whitespace-nowrap text-center text-portfolio-text-dimmed transition-colors duration-[var(--portfolio-motion-state)] ease-out group-hover:text-portfolio-text group-focus-visible:text-portfolio-text motion-reduce:transition-none">
                {pending ? (
                  <FontAwesomeIcon
                    icon={faSpinner}
                    className="size-4 animate-spin"
                  />
                ) : (
                  String(index + 1).padStart(2, '0')
                )}
              </span>
              <span className="min-w-0 pl-[2ch]">
                <span
                  ref={(node) => setTitleRef(index, node)}
                  className="portfolio-prose-link portfolio-prose-link--faux-underlined min-w-0 font-bold uppercase"
                >
                  {project.title}
                </span>
                <ProjectHeadingUnderline title={project.title} />
                <span className="portfolio-start-index-summary-stacked mt-[0.5lh] max-w-[54ch] font-normal text-portfolio-text-dimmed transition-colors duration-[var(--portfolio-motion-state)] ease-out group-hover:text-portfolio-text group-focus-visible:text-portfolio-text motion-reduce:transition-none">
                  <PortfolioInlineMarkdown>
                    {project.blurb}
                  </PortfolioInlineMarkdown>
                </span>
              </span>
              <span className="portfolio-start-index-summary-column min-w-0 text-portfolio-text-dimmed transition-colors duration-[var(--portfolio-motion-state)] ease-out group-hover:text-portfolio-text group-focus-visible:text-portfolio-text motion-reduce:transition-none">
                <PortfolioInlineMarkdown>
                  {project.blurb}
                </PortfolioInlineMarkdown>
              </span>
            </button>
          )
        })}
      </PortfolioLedgerFrame>
    </div>
  )
}

export const PortfolioStartScreen = memo(function PortfolioStartScreen({
  projects,
  pendingProjectIndex,
  isWideLayout,
  isTouchLandscapeLayout,
  getProjectColor,
  setTitleRef,
  onHoveredChange,
  onPreview,
  onSelect,
}: {
  projects: PortfolioProject[]
  pendingProjectIndex: number | null
  isWideLayout: boolean
  isTouchLandscapeLayout: boolean
  getProjectColor: (index: number) => string
  setTitleRef: (index: number, node: HTMLSpanElement | null) => void
  onHoveredChange: (hovered: boolean) => void
  onPreview: (index: number, previewing: boolean) => void
  onSelect: (index: number, keyboardTriggered: boolean) => void
}) {
  const usesScrollingMenu = !isWideLayout || isTouchLandscapeLayout
  const projectIndex = (
    <PortfolioProjectIndex
      getProjectColor={getProjectColor}
      pendingProjectIndex={pendingProjectIndex}
      projects={projects}
      setTitleRef={setTitleRef}
      onHoveredChange={onHoveredChange}
      onPreview={onPreview}
      onSelect={onSelect}
    />
  )

  return (
    <section
      className={`relative h-dvh min-h-0 snap-start snap-always ${
        usesScrollingMenu
          ? 'portfolio-safe-inline grid grid-rows-[auto_minmax(0,1fr)] gap-y-[1lh] overflow-hidden pt-[var(--portfolio-header-text-edge-inset)] pb-[calc(var(--portfolio-frame-rule-size)+var(--portfolio-navigation-control-edge-offset)+env(safe-area-inset-bottom,0px))]'
          : 'portfolio-wide-content-inset flex flex-col justify-center py-16'
      }`}
      style={usesScrollingMenu ? MOBILE_SECTION_CONTENT_INSETS : undefined}
    >
      <PortfolioStartHeader
        isTouchLandscapeLayout={isTouchLandscapeLayout}
        isWideLayout={isWideLayout}
      />
      {usesScrollingMenu ? (
        <OverscrollIndicator
          aria-label="Portfolio menu"
          role="region"
          tabIndex={0}
          bottomScrollControl={<FiveByFive variant="down" />}
          persistentScrollbar
          wrapperClassName="mx-auto h-full w-full max-w-[var(--resume-content-width)]"
          contentClassName="flex min-h-full flex-col justify-center"
          className="overflow-x-hidden outline-none [touch-action:pan-y_pinch-zoom] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-portfolio-accent"
        >
          {projectIndex}
        </OverscrollIndicator>
      ) : projectIndex}
    </section>
  )
})
