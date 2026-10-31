import type { CSSProperties } from 'react'
import { FiveByFive } from './FiveByFive'
import type { BufferedRange } from './videoBuffer'

type VideoScrubberStyle = CSSProperties & {
  '--portfolio-video-progress': `${number}%`
}

export function VideoScrubber({
  buffered = [],
  className,
  currentTime,
  duration,
  label,
  onScrub,
}: {
  buffered?: BufferedRange[]
  className?: string
  currentTime: number
  duration: number
  label: string
  onScrub: (time: number) => void
}) {
  const progress =
    duration > 0
      ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
      : 0

  return (
    <div
      data-portfolio-media-layer="controls"
      data-portfolio-carousel-drag-lock
      className={
        className ??
        'pointer-events-auto absolute left-[var(--portfolio-media-frame-width)] right-[var(--portfolio-media-frame-width)] z-[var(--portfolio-layer-media-controls)] h-[calc(var(--portfolio-logo-size)+var(--portfolio-media-frame-width)/2)] opacity-0 transition-opacity duration-[var(--portfolio-motion-feedback)] ease-out [top:calc(100%_-_var(--portfolio-media-frame-width))] focus-within:opacity-100 hover:opacity-100 [@media(hover:hover)]:group-hover/video:opacity-100 motion-reduce:transition-none'
      }
      style={
        {
          '--portfolio-video-progress': `${progress}%`,
        } as VideoScrubberStyle
      }
    >
      <div className="absolute inset-x-0 bottom-0 h-[var(--portfolio-logo-size)] bg-portfolio-accent-decoration">
        <input
          type="range"
          min={0}
          max={duration > 0 ? duration : 1}
          step="0.01"
          value={duration > 0 ? Math.min(currentTime, duration) : 0}
          disabled={duration <= 0}
          aria-label={label}
          className="portfolio-video-scrubber-input peer absolute inset-y-0 left-0 right-0 z-[var(--portfolio-layer-overlay)] m-0 w-auto cursor-ew-resize appearance-none bg-transparent p-0 opacity-0 disabled:cursor-default"
          onChange={event => onScrub(Number(event.currentTarget.value))}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-portfolio-text"
        >
          <span className="absolute left-[calc(var(--logo-stroke-width)*2)] right-[calc(var(--logo-stroke-width)*2)] top-[calc(var(--logo-stroke-width)*2)] h-[var(--logo-stroke-width)] bg-portfolio-black/30">
            <span className="absolute inset-y-0 left-[calc(var(--portfolio-logo-size)/2_-_var(--logo-stroke-width)*2)] right-[calc(var(--portfolio-logo-size)/2_-_var(--logo-stroke-width)*2)]">
              {buffered.map(range => (
                <span
                  key={`${range.start}-${range.end}`}
                  data-video-buffered
                  className="absolute inset-y-0 bg-portfolio-black/20"
                  style={{
                    left: `${range.start}%`,
                    width: `${range.end - range.start}%`,
                  }}
                />
              ))}
              <span className="absolute inset-y-0 left-[calc(var(--logo-stroke-width)*2_-_var(--portfolio-logo-size)/2)] [right:calc(100%_-_var(--portfolio-video-progress))] bg-portfolio-black" />
              <FiveByFive
                variant="center"
                className="absolute top-[calc(var(--logo-stroke-width)*-2)] left-[var(--portfolio-video-progress)] -translate-x-1/2 text-portfolio-white"
              />
            </span>
          </span>
        </span>
      </div>
    </div>
  )
}
