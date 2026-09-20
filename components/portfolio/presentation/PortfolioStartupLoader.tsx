import { faRotateRight } from '@fortawesome/free-solid-svg-icons'
import type { PortfolioIntroPhase } from '../runtime/types'
import { CircularIconButton } from './PortfolioControls'
import { FiveByFive } from './FiveByFive'

export function PortfolioStartupLoader({
  phase,
}: {
  phase: PortfolioIntroPhase
}) {
  if (phase === 'ready') return null

  return (
    <div
      data-portfolio-startup-loader
      className="fixed inset-0 z-[var(--portfolio-layer-loading)] grid place-items-center"
      role={phase === 'error' ? 'alert' : 'status'}
      aria-label={phase === 'loading' ? 'Preparing portfolio' : undefined}
    >
      {phase === 'error' ? (
        <div className="flex max-w-md flex-col items-center gap-5 px-8 text-center">
          <p className="font-normal text-portfolio-text-dimmed">
            Portfolio media didn&apos;t finish loading.
          </p>
          <CircularIconButton
            icon={faRotateRight}
            iconClassName="size-6"
            ring
            className="portfolio-theme-surface relative size-[var(--portfolio-control-size)] text-portfolio-text"
            aria-label="Reload page"
            title="Reload page"
            onClick={() => window.location.reload()}
          />
        </div>
      ) : (
        <FiveByFive
          variant="snake"
          className="text-portfolio-accent-decoration"
        />
      )}
    </div>
  )
}
