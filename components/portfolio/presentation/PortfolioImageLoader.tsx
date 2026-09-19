import type { ImagePreloadProgress } from '../usePortfolioMediaReadiness'
import { FiveByFive, FIVE_BY_FIVE_CELL_COUNT } from './FiveByFive'

export function PortfolioImageLoader({
  progress,
  revealOrder,
}: {
  progress: ImagePreloadProgress
  revealOrder: readonly number[]
}) {
  const { loaded, failed, total } = progress
  const visibleCellCount =
    total > 0
      ? Math.min(
          FIVE_BY_FIVE_CELL_COUNT,
          Math.floor((loaded * FIVE_BY_FIVE_CELL_COUNT) / total),
        )
      : 0
  const description =
    total > 0
      ? `${loaded} of ${total} images ready${failed ? `; ${failed} could not load` : ''}`
      : 'Preparing portfolio images'

  return (
    <div
      data-portfolio-image-loader
      data-filled-cells={visibleCellCount}
      role="progressbar"
      aria-label="Loading portfolio images"
      aria-valuemin={0}
      aria-valuemax={total || 100}
      aria-valuenow={total > 0 ? loaded : undefined}
      aria-valuetext={description}
    >
      <FiveByFive
        variant="fill"
        visibleCellCount={visibleCellCount}
        revealOrder={revealOrder}
        unrevealedClassName="bg-portfolio-shaded"
        className="text-portfolio-accent-decoration"
      />
    </div>
  )
}
