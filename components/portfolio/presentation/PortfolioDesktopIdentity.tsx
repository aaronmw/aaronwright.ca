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
      className="portfolio-desktop-identity pointer-events-none fixed z-[45] flex h-11 items-center"
      data-portfolio-desktop-identity
    >
      <button
        type="button"
        aria-label="Back to top"
        data-interactive-pop="off"
        data-portfolio-home-logo
        className="pointer-events-auto grid size-11 shrink-0 place-items-center border-0 bg-transparent p-0 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current"
        onClick={onSelectTop}
      >
        <PortfolioLogoMark className="text-resume-signal" />
      </button>
      <h1
        className={`ml-[calc(var(--portfolio-logo-surround)-var(--portfolio-logo-control-inset))] whitespace-nowrap text-base font-bold italic text-[var(--portfolio-ink)] transition-opacity duration-300 motion-reduce:transition-none ${
          activeProjectIndex === -1 ? 'opacity-100' : 'opacity-0'
        }`}
        data-portfolio-desktop-name
      >
        Aaron M. Wright
      </h1>
    </div>
  )
}
