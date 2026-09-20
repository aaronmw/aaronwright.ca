'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { ImagePreloadProgress } from '../usePortfolioMediaReadiness'

const ImageProgressContext = createContext<ImagePreloadProgress>({
  loaded: 0,
  failed: 0,
  total: 0,
})

export function PortfolioImageProgressProvider({
  progress,
  children,
}: {
  progress: ImagePreloadProgress
  children: ReactNode
}) {
  // React context keeps portaled contact-dialog bars in sync with the page.
  return (
    <ImageProgressContext value={progress}>{children}</ImageProgressContext>
  )
}

export function PortfolioFrameProgress() {
  const { loaded, failed, total } = useContext(ImageProgressContext)
  const fraction = total > 0 ? Math.min(1, Math.max(0, loaded / total)) : 0

  return (
    <div
      data-portfolio-image-progress
      className="pointer-events-none fixed inset-0 z-[var(--portfolio-layer-frame)]"
      role="progressbar"
      aria-label="Loading portfolio images"
      aria-valuemin={0}
      aria-valuemax={total || 100}
      aria-valuenow={total > 0 ? loaded : undefined}
      aria-valuetext={
        total > 0
          ? `${loaded} of ${total} images ready${failed ? `; ${failed} could not load` : ''}`
          : 'Preparing portfolio images'
      }
    >
      {(['top', 'bottom'] as const).map(edge => (
        <span
          key={edge}
          data-portfolio-top-rule={edge === 'top' ? true : undefined}
          data-portfolio-bottom-rule={edge === 'bottom' ? true : undefined}
          className={`absolute inset-x-0 h-[var(--portfolio-frame-rule-size)] overflow-hidden bg-portfolio-shaded ${edge === 'top' ? 'top-0' : 'bottom-0'}`}
          aria-hidden="true"
        >
          <span
            data-portfolio-progress-fill
            className="absolute inset-0 origin-left bg-portfolio-accent-decoration"
            style={{ transform: `scaleX(${fraction})` }}
          />
        </span>
      ))}
    </div>
  )
}
