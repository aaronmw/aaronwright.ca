import { useId, type ComponentProps, type CSSProperties } from 'react'
import type { PortfolioMediaClip } from '@/lib/portfolio'
import {
  PHONE_FRAME_PATH,
  PHONE_FRAME_PATH_SCALE,
  PHONE_FRAME_SIZE,
} from '@/lib/phoneFrame'

type PortfolioMediaSurfaceProps = Pick<
  ComponentProps<'div'>,
  'children' | 'className' | 'onMouseLeave'
> & {
  clip?: PortfolioMediaClip
}

// Keep the border and clipped content as separate animation layers. Controls
// such as the video scrubber belong outside this surface so they stay unclipped.
// Clipped media stays transparent so fractional video edges reveal the frame,
// rather than a contrasting surface-colored seam.
export function PortfolioMediaSurface({
  clip,
  children,
  className = '',
  onMouseLeave,
}: PortfolioMediaSurfaceProps) {
  const generatedId = useId()
  const clipPathId = `media-clip-${generatedId.replaceAll(':', '')}`
  const usesPhoneFrame = clip?.kind === 'phone'
  const style: CSSProperties | undefined = usesPhoneFrame
    ? { clipPath: `url(#${clipPathId})` }
    : clip?.kind === 'rounded'
      ? { borderRadius: `${clip.radiusX * 100}% / ${clip.radiusY * 100}%` }
      : undefined
  // Resolve the recorded radius against the inner dimensions, then add the
  // frame thickness so the outer and inner curves remain concentric.
  const borderStyle: CSSProperties | undefined =
    clip?.kind === 'rounded'
      ? {
          borderRadius: `calc((100% - var(--portfolio-media-frame-width) * 2) * ${clip.radiusX} + var(--portfolio-media-frame-width)) / calc((100% - var(--portfolio-media-frame-width) * 2) * ${clip.radiusY} + var(--portfolio-media-frame-width))`,
        }
      : undefined

  return (
    <>
      {usesPhoneFrame ? (
        <span
          data-portfolio-media-layer="border"
          data-portfolio-media-layer-resize
          aria-hidden="true"
          className="pointer-events-none absolute [inset:var(--portfolio-media-frame-width)]"
        >
          <svg
            viewBox={`0 0 ${PHONE_FRAME_SIZE.width} ${PHONE_FRAME_SIZE.height}`}
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible text-portfolio-shaded"
          >
            <defs>
              <clipPath
                id={clipPathId}
                clipPathUnits="objectBoundingBox"
              >
                <path
                  d={PHONE_FRAME_PATH}
                  transform={PHONE_FRAME_PATH_SCALE}
                />
              </clipPath>
            </defs>
            <path
              d={PHONE_FRAME_PATH}
              fill="currentColor"
              stroke="currentColor"
              vectorEffect="non-scaling-stroke"
              style={{
                strokeWidth: 'calc(var(--portfolio-media-frame-width) * 2)',
              }}
            />
          </svg>
        </span>
      ) : (
        <span
          data-portfolio-media-layer="border"
          data-portfolio-media-layer-resize={clip?.kind === 'rounded' ? '' : undefined}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-portfolio-shaded"
          style={borderStyle}
        />
      )}
      <div
        data-portfolio-media-layer="content"
        data-portfolio-media-clip={clip?.kind}
        className={`relative h-full w-full ${clip ? 'overflow-hidden' : 'bg-[var(--portfolio-surface)]'} ${className}`}
        style={style}
        onMouseLeave={onMouseLeave}
      >
        {children}
      </div>
    </>
  )
}
