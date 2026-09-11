import Link from 'next/link'
import {
  memo,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import type { PortfolioProject } from '@/lib/portfolio'
import {
  MOBILE_SECTION_CONTENT_PADDING_LEFT,
  MOBILE_SECTION_CONTENT_PADDING_RIGHT,
} from '@/components/portfolio/mobileLayout'
import {
  PortfolioInlineMarkdown,
  PortfolioLedgerFrame,
  ProjectHeadingUnderline,
} from './PortfolioText'

const MOBILE_SECTION_CONTENT_INSETS: CSSProperties = {
  paddingLeft: MOBILE_SECTION_CONTENT_PADDING_LEFT,
  paddingRight: MOBILE_SECTION_CONTENT_PADDING_RIGHT,
}

type ProjectColorStyle = CSSProperties & {
  '--project-color': string
}

const MOBILE_CONTENT_VERTICAL_PADDING_REM = 1.5
const CONTACT_LINK_CLASS_NAME =
  'portfolio-contact-link underline decoration-1 underline-offset-[0.18em]'

function useStartScreenContentAlignment(enabled: boolean) {
  const startScreenRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const contentSectionRef = useRef<HTMLDivElement>(null)
  const [shouldBottomAlign, setShouldBottomAlign] = useState(false)

  useLayoutEffect(() => {
    if (!enabled) {
      return
    }

    const startScreen = startScreenRef.current
    const header = headerRef.current
    const contentSection = contentSectionRef.current

    if (!startScreen || !header || !contentSection) {
      return
    }

    const updateAlignment = () => {
      const startScreenStyle = window.getComputedStyle(startScreen)
      const rootFontSize = Number.parseFloat(
        window.getComputedStyle(document.documentElement).fontSize,
      )
      const verticalPadding = rootFontSize * MOBILE_CONTENT_VERTICAL_PADDING_REM
      const availableHeight =
        startScreen.clientHeight -
        Number.parseFloat(startScreenStyle.paddingTop) -
        Number.parseFloat(startScreenStyle.paddingBottom) -
        header.getBoundingClientRect().height -
        Number.parseFloat(startScreenStyle.rowGap)
      const nextShouldBottomAlign =
        availableHeight < contentSection.scrollHeight + verticalPadding * 2

      setShouldBottomAlign((current) =>
        current === nextShouldBottomAlign ? current : nextShouldBottomAlign,
      )
    }

    const resizeObserver = new ResizeObserver(updateAlignment)
    resizeObserver.observe(startScreen)
    resizeObserver.observe(header)
    resizeObserver.observe(contentSection)
    updateAlignment()

    return () => resizeObserver.disconnect()
  }, [enabled])

  return {
    startScreenRef,
    headerRef,
    contentSectionRef,
    shouldBottomAlign: enabled && shouldBottomAlign,
  }
}

function PortfolioStartHeader({
  headerRef,
  isMobilePortraitLayout,
  isTouchLandscapeLayout,
  isWideLayout,
}: {
  headerRef: RefObject<HTMLDivElement | null>
  isMobilePortraitLayout: boolean
  isTouchLandscapeLayout: boolean
  isWideLayout: boolean
}) {
  return (
    <div
      ref={headerRef}
      className={
        isTouchLandscapeLayout
          ? 'min-w-0'
          : isWideLayout
            ? 'portfolio-wide-content-inset absolute inset-x-0 top-[var(--portfolio-contact-edge-inset)] [--portfolio-wide-content-inset-right:var(--portfolio-header-control-reserved-width)]'
            : 'min-w-0'
      }
    >
      <div
        data-portfolio-start-header-content
        className={`mx-auto w-full ${
          isWideLayout && !isTouchLandscapeLayout ? '' : 'max-w-6xl'
        } ${
          isMobilePortraitLayout
            ? 'relative'
            : `flex flex-col items-start gap-4 sm:flex-row sm:items-start sm:justify-between ${
                isTouchLandscapeLayout
                  ? 'sm:flex-row'
                  : isWideLayout
                    ? 'sm:flex-row'
                    : ''
              }`
        }`}
      >
        {!isWideLayout ? (
          <div
            className="flex shrink-0 items-center text-portfolio-text"
            data-portfolio-start-title
          >
            <h1 className="whitespace-nowrap font-bold italic">
              Aaron M. Wright
            </h1>
          </div>
        ) : null}
        <address
          className={`min-w-0 font-resume-mono font-normal text-portfolio-text not-italic ${
            isWideLayout ? 'ml-auto' : 'w-full sm:ml-auto sm:w-auto'
          }`}
        >
          <div
            className={
              isWideLayout
                ? 'flex items-start justify-end gap-[var(--portfolio-default-spacing)]'
                : 'grid gap-4 sm:flex sm:items-start sm:justify-end sm:gap-[var(--portfolio-default-spacing)]'
            }
          >
            <p className="sm:text-right">
              302-70 Dyrgas Gate
              <br />
              Canmore, Alberta
              <br />
              T1W 3J6
            </p>
            <p className="flex flex-col items-start sm:items-end sm:text-right">
              <a
                className={`${CONTACT_LINK_CLASS_NAME} break-all`}
                href="mailto:aaron@aaronwright.ca"
              >
                aaron@aaronwright.ca
              </a>
              <a className={CONTACT_LINK_CLASS_NAME} href="tel:+16477469426">
                +1-647-746-9426
              </a>
              <Link
                className={CONTACT_LINK_CLASS_NAME}
                href="/resume.pdf"
                target="_blank"
                rel="noreferrer"
              >
                Résumé PDF
              </Link>
            </p>
          </div>
        </address>
      </div>
    </div>
  )
}

function PortfolioProjectIndex({
  contentSectionRef,
  getProjectColor,
  pendingProjectIndex,
  projects,
  setTitleRef,
  shouldBottomAlign,
  useTwoColumnIndex,
  isTouchLandscapeLayout,
  isWideLayout,
  onHoveredChange,
  onPreview,
  onSelect,
}: {
  contentSectionRef: RefObject<HTMLDivElement | null>
  getProjectColor: (index: number) => string
  pendingProjectIndex: number | null
  projects: PortfolioProject[]
  setTitleRef: (index: number, node: HTMLSpanElement | null) => void
  shouldBottomAlign: boolean
  useTwoColumnIndex: boolean
  isTouchLandscapeLayout: boolean
  isWideLayout: boolean
  onHoveredChange: (hovered: boolean) => void
  onPreview: (index: number, previewing: boolean) => void
  onSelect: (index: number, keyboardTriggered: boolean) => void
}) {
  return (
    <div
      ref={contentSectionRef}
      data-portfolio-start-content
      className={`portfolio-start-index-container mx-auto w-full max-w-[var(--resume-content-width)] ${
        isWideLayout && !isTouchLandscapeLayout
          ? ''
          : `min-h-0 ${shouldBottomAlign ? 'self-end' : 'self-center'}`
      }`}
    >
      <PortfolioLedgerFrame
        aria-label="Portfolio sections"
        data-portfolio-index-two-column={useTwoColumnIndex || undefined}
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
                  className="min-w-0 font-bold uppercase"
                >
                  {project.title}
                </span>
                <span className="font-bold">
                  <ProjectHeadingUnderline
                    title={project.title}
                    className="transition-colors duration-[var(--portfolio-motion-state)] ease-out group-hover:text-portfolio-text group-focus-visible:text-portfolio-text motion-reduce:transition-none"
                  />
                </span>
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
  isTouchInput,
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
  isTouchInput: boolean
  isWideLayout: boolean
  isTouchLandscapeLayout: boolean
  getProjectColor: (index: number) => string
  setTitleRef: (index: number, node: HTMLSpanElement | null) => void
  onHoveredChange: (hovered: boolean) => void
  onPreview: (index: number, previewing: boolean) => void
  onSelect: (index: number, keyboardTriggered: boolean) => void
}) {
  const isMobilePortraitLayout =
    isTouchInput && !isWideLayout && !isTouchLandscapeLayout
  const useTwoColumnIndex = isTouchLandscapeLayout
  const { startScreenRef, headerRef, contentSectionRef, shouldBottomAlign } =
    useStartScreenContentAlignment(isMobilePortraitLayout)

  return (
    <section
      ref={startScreenRef}
      className={`relative h-dvh snap-start snap-always ${
        isWideLayout && !isTouchLandscapeLayout
          ? 'portfolio-wide-content-inset'
          : 'portfolio-safe-inline'
      } ${
        isTouchLandscapeLayout
          ? 'grid grid-rows-[auto_minmax(0,1fr)] gap-2'
          : isWideLayout
            ? 'flex flex-col justify-center py-16'
            : `grid grid-rows-[auto_minmax(0,1fr)] ${
                isTouchInput ? 'gap-4' : ''
              } pb-6 pt-[var(--portfolio-header-text-edge-inset)]`
      }`}
      style={
        isTouchLandscapeLayout
          ? {
              paddingTop: 'var(--portfolio-header-text-edge-inset)',
              paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
              ...MOBILE_SECTION_CONTENT_INSETS,
            }
          : !isWideLayout
            ? MOBILE_SECTION_CONTENT_INSETS
            : undefined
      }
    >
      <PortfolioStartHeader
        headerRef={headerRef}
        isMobilePortraitLayout={isMobilePortraitLayout}
        isTouchLandscapeLayout={isTouchLandscapeLayout}
        isWideLayout={isWideLayout}
      />
      <PortfolioProjectIndex
        contentSectionRef={contentSectionRef}
        getProjectColor={getProjectColor}
        isTouchLandscapeLayout={isTouchLandscapeLayout}
        isWideLayout={isWideLayout}
        pendingProjectIndex={pendingProjectIndex}
        projects={projects}
        setTitleRef={setTitleRef}
        shouldBottomAlign={shouldBottomAlign}
        useTwoColumnIndex={useTwoColumnIndex}
        onHoveredChange={onHoveredChange}
        onPreview={onPreview}
        onSelect={onSelect}
      />
    </section>
  )
})
