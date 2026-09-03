'use client'

import {
  faArrowUpRightFromSquare,
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const CONTROL_HEIGHT_CLASS = 'h-11'
const ICON_SLOT_CLASS =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center'

export function PortfolioProjectControls({
  activeSlideIndex,
  projectTitle,
  slideCount,
  url,
  onSelectSlide,
}: {
  activeSlideIndex: number
  projectTitle: string
  slideCount: number
  url: string
  onSelectSlide: (slideIndex: number) => void
}) {
  const hasPrevious = activeSlideIndex > 0
  const hasNext = activeSlideIndex < slideCount - 1

  return (
    <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-x-[1ch] gap-y-2">
      {slideCount > 1 ? (
        <nav
          aria-label={`${projectTitle} slides`}
          className={`flex ${CONTROL_HEIGHT_CLASS} shrink-0 items-center whitespace-nowrap`}
        >
          <button
            type="button"
            data-interactive-pop="off"
            disabled={!hasPrevious}
            aria-label={`Previous ${projectTitle} slide`}
            className="portfolio-prose-link grid h-11 grid-cols-[2.75rem_auto] items-center border-0 bg-transparent p-0 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-resume-signal disabled:pointer-events-none"
            onClick={() => onSelectSlide(activeSlideIndex - 1)}
          >
            <span className={ICON_SLOT_CLASS}>
              <FontAwesomeIcon
                icon={faChevronLeft}
                className="size-2.5"
                aria-hidden="true"
              />
            </span>
            <span className="pr-[1ch]">Prev</span>
          </button>
          <span aria-hidden="true">/</span>
          <button
            type="button"
            data-interactive-pop="off"
            disabled={!hasNext}
            aria-label={`Next ${projectTitle} slide`}
            className="portfolio-prose-link grid h-11 grid-cols-[auto_2.75rem] items-center border-0 bg-transparent p-0 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-resume-signal disabled:pointer-events-none"
            onClick={() => onSelectSlide(activeSlideIndex + 1)}
          >
            <span className="pl-[1ch]">Next</span>
            <span className={ICON_SLOT_CLASS}>
              <FontAwesomeIcon
                icon={faChevronRight}
                className="size-2.5"
                aria-hidden="true"
              />
            </span>
          </button>
          <span
            aria-live="polite"
            className="ml-[1ch]"
          >
            <strong>{activeSlideIndex + 1}</strong> of{' '}
            <strong>{slideCount}</strong>
          </span>
        </nav>
      ) : null}

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        data-interactive-pop="off"
        className="portfolio-prose-link grid h-11 shrink-0 grid-cols-[minmax(0,1fr)_2.75rem] items-center p-0 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-resume-signal"
      >
        <span className="px-[1.5ch] font-bold">Visit Project</span>
        <span className={ICON_SLOT_CLASS}>
          <FontAwesomeIcon
            icon={faArrowUpRightFromSquare}
            className="size-3.5"
            aria-hidden="true"
          />
        </span>
      </a>
    </div>
  )
}
