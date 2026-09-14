import { PortfolioLogoMark } from './PortfolioLogoMark'

export function PortfolioDesktopIdentity({
  activeProjectIndex,
  onSelectTop,
}: {
  activeProjectIndex: number
  onSelectTop: () => void
}) {
  return (
    <div
      className="portfolio-desktop-identity pointer-events-none fixed z-[var(--portfolio-layer-identity)] flex h-[var(--portfolio-control-size)] items-center"
      data-portfolio-desktop-identity
    >
      <button
        type="button"
        aria-label="Back to top"
        data-interactive-pop="off"
        data-portfolio-home-logo
        className="pointer-events-auto grid size-[var(--portfolio-control-size)] shrink-0 place-items-center border-0 bg-transparent p-0 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current"
        onClick={onSelectTop}
      >
        <PortfolioLogoMark className="text-portfolio-accent-decoration" />
      </button>
      <h1
        className={`portfolio-cap-trim ml-[calc(var(--portfolio-logo-surround)-var(--portfolio-logo-control-inset))] whitespace-nowrap font-bold italic text-portfolio-text transition-opacity duration-[var(--portfolio-motion-identity)] motion-reduce:transition-none ${
          activeProjectIndex === -1 ? 'opacity-100' : 'opacity-0'
        }`}
        data-portfolio-desktop-name
      >
        Aaron M. Wright
      </h1>
    </div>
  )
}
