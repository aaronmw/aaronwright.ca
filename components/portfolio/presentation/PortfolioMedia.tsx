import Image from 'next/image'
import type { CSSProperties, ReactNode } from 'react'
import { useCallback, useId, useRef, useState } from 'react'
import type { PortfolioScreenshot } from '@/lib/portfolio'
import { portfolioAccentColor } from '@/lib/portfolioPalette'
import type { PortfolioMediaElement } from '@/components/portfolio/usePortfolioMediaReadiness'
import {
  carouselMediaKey,
  isVideoScreenshot,
  viewerMediaKey,
  type ProjectSlide,
} from '@/components/portfolio/domain/slides'
import { CircularIconButton } from './PortfolioControls'
import { FiveByFive } from './FiveByFive'
import { PortfolioViewerOpenSurface } from './PortfolioViewerOpenSurface'
import type { ViewerOpenIntent } from '../domain/viewer'

const CAROUSEL_MEDIA_CLASS =
  'object-contain transition-[filter,padding] [transition-duration:var(--portfolio-motion-media-filter),var(--portfolio-motion-media-padding)] [transition-timing-function:ease-in-out,var(--ease-out)] motion-reduce:transition-none'
const MEDIA_FRAME_INSET = 'calc(var(--portfolio-media-frame-width) * 2)'
const MISSING_MEDIA_SRC = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000"><rect width="1000" height="1000" fill="${portfolioAccentColor}"/></svg>`,
)}`
const PHONE_FRAME_PATH =
  'M141 1H739C812 1 871 60 871 133V1637C871 1711 811 1771 737 1771H143C69 1771 9 1711 9 1637V133C9 60 68 1 141 1Z'
const PHONE_FRAME_PATH_SCALE = 'scale(0.001136363636 0.000564334086)'

type MediaFrameStyle = CSSProperties & {
  '--portfolio-media-aspect-ratio'?: number
}

type VideoScrubberStyle = CSSProperties & {
  '--portfolio-video-progress': `${number}%`
}

function getMediaAspectRatio(element: PortfolioMediaElement) {
  const width =
    element instanceof HTMLImageElement
      ? element.naturalWidth
      : element.videoWidth
  const height =
    element instanceof HTMLImageElement
      ? element.naturalHeight
      : element.videoHeight

  return width && height ? width / height : null
}

function getCarouselMediaClass(shouldBlur: boolean) {
  return `${CAROUSEL_MEDIA_CLASS} ${shouldBlur ? 'blur-[20px]' : 'blur-0'}`
}

function restartVideo(video: HTMLVideoElement) {
  video.currentTime = 0
  void video.play().catch(() => undefined)
}

function PhoneFrameBackdrop({ clipPathId }: { clipPathId: string }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute [inset:var(--portfolio-media-frame-width)]"
    >
      <svg
        viewBox="0 0 880 1772"
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
  )
}

function VideoScrubber({
  currentTime,
  duration,
  label,
  onScrub,
}: {
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
      data-portfolio-carousel-drag-lock
      className="pointer-events-auto absolute left-[var(--portfolio-media-frame-width)] right-[var(--portfolio-media-frame-width)] z-[var(--portfolio-layer-media-controls)] h-[calc(var(--portfolio-logo-size)+var(--portfolio-media-frame-width)/2)] opacity-0 transition-opacity duration-[var(--portfolio-motion-feedback)] ease-out [top:calc(100%_-_var(--portfolio-media-frame-width))] focus-within:opacity-100 hover:opacity-100 [@media(hover:hover)]:peer-hover/video:opacity-100 motion-reduce:transition-none"
      style={
        {
          '--portfolio-video-progress': `${progress}%`,
        } as VideoScrubberStyle
      }
    >
      <div className="absolute inset-x-0 bottom-0 h-[var(--portfolio-logo-size)] bg-portfolio-accent">
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
          onDoubleClick={event => event.stopPropagation()}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-portfolio-white"
        >
          <span className="absolute left-[calc(var(--logo-stroke-width)*2)] right-[calc(var(--logo-stroke-width)*2)] top-[calc(var(--logo-stroke-width)*2)] h-[var(--logo-stroke-width)] bg-portfolio-black/30">
            <span className="absolute inset-y-0 left-[calc(var(--portfolio-logo-size)/2_-_var(--logo-stroke-width)*2)] right-[calc(var(--portfolio-logo-size)/2_-_var(--logo-stroke-width)*2)]">
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

function ViewerScreenshot({
  active,
  screenshotId,
  concealed,
  className,
  restingMediaPadding,
  onOpenViewer,
  children,
}: {
  active: boolean
  screenshotId: string
  concealed: boolean
  className: string
  restingMediaPadding: string
  onOpenViewer: (intent: ViewerOpenIntent) => void
  children: ReactNode
}) {
  return (
    <PortfolioViewerOpenSurface
      active={active}
      screenshotId={screenshotId}
      concealed={concealed}
      className={className}
      onOpen={onOpenViewer}
      style={
        {
          '--portfolio-media-padding': restingMediaPadding,
          'backgroundColor': 'transparent',
        } as CSSProperties
      }
    >
      {children}
    </PortfolioViewerOpenSurface>
  )
}

export function ProjectPanel({
  slide,
  restingMediaPadding,
  reserveNavigationSpace = true,
  isActive,
  concealedScreenshotId,
  registerMediaElement,
  onOpenViewer,
}: {
  slide: Extract<ProjectSlide, { kind: 'screenshot' }>
  restingMediaPadding: string
  reserveNavigationSpace?: boolean
  isActive: boolean
  concealedScreenshotId?: string
  registerMediaElement: (
    key: string,
    element: PortfolioMediaElement | null,
  ) => void
  onOpenViewer: (intent: ViewerOpenIntent) => void
}) {
  return (
    <div
      className={`relative grid h-full min-h-0 min-w-0 place-items-center overflow-hidden [--portfolio-media-bottom-padding:0px] ${reserveNavigationSpace ? 'pb-[var(--portfolio-slide-navigation-reserved-height)]' : ''}`}
    >
      <ViewerScreenshot
        active={isActive}
        screenshotId={slide.screenshot.id}
        concealed={concealedScreenshotId === slide.screenshot.id}
        restingMediaPadding={restingMediaPadding}
        onOpenViewer={onOpenViewer}
        className="relative h-full min-h-0 w-full min-w-0"
      >
        <ScreenshotMedia
          screenshot={slide.screenshot}
          mediaKey={carouselMediaKey(slide.screenshot)}
          registerMediaElement={registerMediaElement}
          priority={isActive}
          showReplayControl={isActive}
          sizes="(min-aspect-ratio: 5/4) 70vw, 100vw"
          className={getCarouselMediaClass(false)}
        />
      </ViewerScreenshot>
    </div>
  )
}

export function ScreenshotMedia({
  screenshot,
  initialAspectRatio,
  mediaKey,
  registerMediaElement,
  priority,
  showReplayControl = false,
  sizes,
  className,
}: {
  screenshot: PortfolioScreenshot
  initialAspectRatio?: number
  mediaKey: string
  registerMediaElement: (
    key: string,
    element: PortfolioMediaElement | null,
  ) => void
  priority?: boolean
  showReplayControl?: boolean
  sizes: string
  className: string
}) {
  const [aspectRatio, setAspectRatio] = useState<number | null>(
    initialAspectRatio ?? null,
  )
  const [failedMediaSrc, setFailedMediaSrc] = useState<string | null>(null)
  const [replayHoverSuppressed, setReplayHoverSuppressed] = useState(false)
  const [videoCurrentTime, setVideoCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const mediaElementRef = useRef<PortfolioMediaElement | null>(null)
  const generatedClipPathId = useId()
  const phoneFrameClipPathId = `phone-frame-${generatedClipPathId.replaceAll(':', '')}`
  const mediaLoadFailed = failedMediaSrc === screenshot.src
  const usesPhoneFrame = screenshot.clipToPhoneFrame && !mediaLoadFailed
  const hasReplayControl =
    showReplayControl && screenshot.restartable && !mediaLoadFailed
  const hasVideoScrubber = isVideoScreenshot(screenshot) && !mediaLoadFailed
  const renderedAlt = mediaLoadFailed
    ? `Missing portfolio media: ${screenshot.alt}`
    : screenshot.alt

  const updateAspectRatio = (element: PortfolioMediaElement) => {
    const nextAspectRatio = getMediaAspectRatio(element)
    if (!nextAspectRatio) return
    setAspectRatio(current =>
      current === nextAspectRatio ? current : nextAspectRatio,
    )
  }

  // A stable callback ref can safely read cached media dimensions without
  // detaching and reattaching after the resulting aspect-ratio render.
  // react-doctor-disable-next-line react-doctor/react-compiler-no-manual-memoization
  const setMediaRef = useCallback(
    (element: PortfolioMediaElement | null) => {
      mediaElementRef.current = element
      registerMediaElement(mediaKey, element)
      if (mediaKey.startsWith('carousel:'))
        registerMediaElement(viewerMediaKey(screenshot), element)

      if (!element) return
      if (element instanceof HTMLVideoElement) {
        setVideoDuration(
          Number.isFinite(element.duration) ? element.duration : 0,
        )
        setVideoCurrentTime(element.currentTime)
      }
      const nextAspectRatio = getMediaAspectRatio(element)
      if (!nextAspectRatio) return
      setAspectRatio(current =>
        current === nextAspectRatio ? current : nextAspectRatio,
      )
    },
    [mediaKey, registerMediaElement, screenshot],
  )

  const updateVideoDuration = (video: HTMLVideoElement) => {
    setVideoDuration(Number.isFinite(video.duration) ? video.duration : 0)
  }

  const handleMediaError = () => {
    setAspectRatio(1)
    setFailedMediaSrc(screenshot.src)
  }

  const handleScrub = (time: number) => {
    const video = mediaElementRef.current
    if (!(video instanceof HTMLVideoElement)) return
    video.currentTime = time
    setVideoCurrentTime(time)
  }

  const progressBarOverhang = hasVideoScrubber
    ? 'calc(var(--portfolio-logo-size) - var(--portfolio-media-frame-width) / 2)'
    : '0px'

  const frameStyle: MediaFrameStyle = aspectRatio
    ? {
        '--portfolio-media-aspect-ratio': aspectRatio,
        'width': `min(100cqw, calc((100cqh - ${MEDIA_FRAME_INSET} - ${progressBarOverhang}) * var(--portfolio-media-aspect-ratio) + ${MEDIA_FRAME_INSET}))`,
        'height': `min(calc(100cqh - ${progressBarOverhang}), calc((100cqw - ${MEDIA_FRAME_INSET}) / var(--portfolio-media-aspect-ratio) + ${MEDIA_FRAME_INSET}))`,
      }
    : { width: '100%', height: '100%' }

  const frameClassName = usesPhoneFrame
    ? `relative [padding:var(--portfolio-media-frame-width)] ${aspectRatio ? '' : 'invisible'}`
    : 'relative bg-portfolio-shaded [padding:var(--portfolio-media-frame-width)]'

  const phoneFrameBackdrop = usesPhoneFrame ? (
    <PhoneFrameBackdrop clipPathId={phoneFrameClipPathId} />
  ) : null

  const mediaFrameStyle: CSSProperties | undefined = usesPhoneFrame
    ? { clipPath: `url(#${phoneFrameClipPathId})` }
    : undefined
  const mediaFrameClassName = usesPhoneFrame
    ? 'relative h-full w-full'
    : 'relative h-full w-full bg-[var(--portfolio-surface)]'

  if (isVideoScreenshot(screenshot)) {
    return (
      <div className="absolute inset-0 grid place-items-center [container-type:size] [padding:var(--portfolio-media-padding,var(--portfolio-default-spacing))] [padding-top:var(--portfolio-media-top-padding,calc(var(--portfolio-media-padding,var(--portfolio-default-spacing))+var(--logo-stroke-width)))] [padding-bottom:var(--portfolio-media-bottom-padding,var(--portfolio-media-padding,var(--portfolio-default-spacing)))]">
        <div
          data-portfolio-media-frame
          className={frameClassName}
          style={frameStyle}
        >
          {phoneFrameBackdrop}
          <div
            className={`${mediaFrameClassName} peer/video ${hasReplayControl && !replayHoverSuppressed ? 'group/restart' : ''}`}
            style={mediaFrameStyle}
            onMouseLeave={
              hasReplayControl
                ? () => setReplayHoverSuppressed(false)
                : undefined
            }
          >
            {mediaLoadFailed ? (
              <Image
                ref={setMediaRef}
                src={MISSING_MEDIA_SRC}
                alt={renderedAlt}
                fill
                draggable={false}
                unoptimized
                onDragStart={event => event.preventDefault()}
                onLoad={event => updateAspectRatio(event.currentTarget)}
                priority={priority}
                sizes={sizes}
                className={`select-none object-contain ${className}`}
              />
            ) : (
              <video
                ref={setMediaRef}
                src={screenshot.src}
                aria-label={renderedAlt}
                autoPlay
                draggable={false}
                loop
                muted
                onClick={event => {
                  if (!screenshot.restartable || event.detail > 1) return
                  restartVideo(event.currentTarget)
                  setVideoCurrentTime(0)
                  if (hasReplayControl) setReplayHoverSuppressed(true)
                }}
                onCanPlay={event => updateVideoDuration(event.currentTarget)}
                onDragStart={event => event.preventDefault()}
                onDurationChange={event =>
                  updateVideoDuration(event.currentTarget)
                }
                onError={handleMediaError}
                onLoadedMetadata={event => {
                  updateAspectRatio(event.currentTarget)
                  updateVideoDuration(event.currentTarget)
                  setVideoCurrentTime(event.currentTarget.currentTime)
                }}
                onTimeUpdate={event => {
                  updateVideoDuration(event.currentTarget)
                  setVideoCurrentTime(event.currentTarget.currentTime)
                }}
                playsInline
                preload={priority ? 'auto' : 'metadata'}
                className={`absolute inset-0 h-full w-full select-none object-contain ${screenshot.restartable ? 'pointer-events-auto cursor-pointer' : ''} ${className}`}
              />
            )}
            {hasReplayControl ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-[var(--portfolio-layer-content)] bg-portfolio-overlay opacity-0 transition-opacity duration-[var(--portfolio-motion-feedback)] ease-out [@media(hover:hover)]:group-hover/restart:opacity-100 motion-reduce:transition-none"
              />
            ) : null}
            {hasReplayControl ? (
              <CircularIconButton
                visual={
                  <FiveByFive
                    variant="left"
                    className="text-portfolio-accent"
                  />
                }
                iconClassName=""
                aria-label="Restart animation"
                title="Restart animation"
                onClick={event => {
                  if (event.detail > 1) return
                  const video =
                    event.currentTarget.parentElement?.querySelector('video')
                  if (video) restartVideo(video)
                  setVideoCurrentTime(0)
                  setReplayHoverSuppressed(true)
                }}
                className="pointer-events-none absolute left-1/2 top-1/2 z-[var(--portfolio-layer-overlay)] size-[var(--portfolio-control-size)] -translate-x-1/2 -translate-y-1/2 scale-[0.96] bg-transparent p-0 opacity-0 transition-[opacity,scale] duration-[var(--portfolio-motion-feedback)] ease-out focus-visible:pointer-events-auto focus-visible:scale-100 focus-visible:opacity-100 [@media(hover:hover)]:group-hover/restart:pointer-events-auto [@media(hover:hover)]:group-hover/restart:scale-100 [@media(hover:hover)]:group-hover/restart:opacity-100 motion-reduce:scale-100 motion-reduce:transition-none"
              />
            ) : null}
          </div>
          <VideoScrubber
            currentTime={videoCurrentTime}
            duration={videoDuration}
            label={`Seek through ${screenshot.alt}`}
            onScrub={handleScrub}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 grid place-items-center [container-type:size] [padding:var(--portfolio-media-padding,var(--portfolio-default-spacing))] [padding-top:var(--portfolio-media-top-padding,calc(var(--portfolio-media-padding,var(--portfolio-default-spacing))+var(--logo-stroke-width)))] [padding-bottom:var(--portfolio-media-bottom-padding,var(--portfolio-media-padding,var(--portfolio-default-spacing)))]">
      <div
        data-portfolio-media-frame
        className={frameClassName}
        style={frameStyle}
      >
        {phoneFrameBackdrop}
        <div
          className={mediaFrameClassName}
          style={mediaFrameStyle}
        >
          <Image
            ref={setMediaRef}
            src={mediaLoadFailed ? MISSING_MEDIA_SRC : screenshot.src}
            alt={renderedAlt}
            fill
            draggable={false}
            unoptimized
            onDragStart={event => event.preventDefault()}
            onError={mediaLoadFailed ? undefined : handleMediaError}
            onLoad={event => updateAspectRatio(event.currentTarget)}
            priority={priority}
            sizes={sizes}
            className={`select-none object-contain ${className}`}
          />
        </div>
      </div>
    </div>
  )
}
