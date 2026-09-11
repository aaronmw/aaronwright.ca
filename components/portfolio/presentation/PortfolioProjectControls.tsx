'use client'

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
  url?: string
  onSelectSlide: (slideIndex: number) => void
}) {
  const hasPrevious = activeSlideIndex > 0
  const hasNext = activeSlideIndex < slideCount - 1

  return (
    <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-x-[2ch] gap-y-2">
      {slideCount > 1 ? (
        <nav
          aria-label={`${projectTitle} slides`}
          className="flex shrink-0 items-center gap-x-[2ch] whitespace-nowrap"
        >
          <button
            type="button"
            data-interactive-pop="off"
            disabled={!hasPrevious}
            aria-label={`Previous ${projectTitle} slide`}
            className="portfolio-prose-link portfolio-prose-link--label-only inline-flex items-center gap-[1ch] border-0 bg-transparent p-0 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-portfolio-accent disabled:pointer-events-none"
            onClick={() => onSelectSlide(activeSlideIndex - 1)}
          >
            <span aria-hidden="true">&lt;</span>
            <span className="portfolio-prose-link-label portfolio-project-control-label">Prev</span>
          </button>
          <span aria-live="polite">
            <strong>{activeSlideIndex + 1}</strong>{' '}
            <span className="text-portfolio-text-dimmed">
              of <strong>{slideCount}</strong>
            </span>
          </span>
          <button
            type="button"
            data-interactive-pop="off"
            disabled={!hasNext}
            aria-label={`Next ${projectTitle} slide`}
            className="portfolio-prose-link portfolio-prose-link--label-only inline-flex items-center gap-[1ch] border-0 bg-transparent p-0 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-portfolio-accent disabled:pointer-events-none"
            onClick={() => onSelectSlide(activeSlideIndex + 1)}
          >
            <span className="portfolio-prose-link-label portfolio-project-control-label">Next</span>
            <span aria-hidden="true">&gt;</span>
          </button>
        </nav>
      ) : null}

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          data-interactive-pop="off"
          className="portfolio-prose-link inline-flex shrink-0 items-center p-0 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-portfolio-accent"
        >
          <span>Visit</span>
        </a>
      ) : null}
    </div>
  )
}
