import Image from 'next/image'
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from 'react'
import { useState } from 'react'
import { faRotateRight } from '@fortawesome/free-solid-svg-icons'
import type { PortfolioScreenshot } from '@/lib/portfolio'
import type { PortfolioMediaElement } from '@/components/portfolio/usePortfolioMediaReadiness'
import {
  carouselMediaKey,
  isVideoScreenshot,
  viewerMediaKey,
  type ProjectSlide,
} from '@/components/portfolio/domain/slides'
import { CircularIconButton } from './PortfolioControls'
import { PortfolioViewerOpenSurface } from './PortfolioViewerOpenSurface'
import type { ViewerOpenIntent } from '../domain/viewer'

const CAROUSEL_MEDIA_CLASS =
  'object-contain transition-[filter,padding] [transition-duration:1000ms,500ms] [transition-timing-function:ease-in-out,var(--ease-out)] motion-reduce:transition-none'
const MEDIA_FRAME_INSET = 'calc(var(--portfolio-default-spacing) * 2)'

type MediaFrameStyle = CSSProperties & {
  '--portfolio-media-aspect-ratio'?: number
}

export function getCarouselMediaClass(shouldBlur: boolean) {
  return `${CAROUSEL_MEDIA_CLASS} ${shouldBlur ? 'blur-[20px]' : 'blur-0'}`
}

function ViewerScreenshot({
  active,
  screenshotId,
  concealed,
  className,
  restingMediaPadding,
  onOpenViewer,
  restartable,
  children,
}: {
  active: boolean
  screenshotId: string
  concealed: boolean
  className: string
  restingMediaPadding: string
  onOpenViewer: (intent: ViewerOpenIntent) => void
  restartable?: boolean
  children: ReactNode
}) {
  const handleRestart = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (event.detail > 1) return
    const video = event.currentTarget.parentElement?.querySelector('video')
    if (!video) return
    video.currentTime = 0
    void video.play().catch(() => undefined)
  }

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
      restartControl={
        active && restartable ? (
          <CircularIconButton
            icon={faRotateRight}
            iconClassName="size-6"
            aria-label="Restart animation"
            title="Restart animation"
            onClick={handleRestart}
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 size-11 -translate-x-1/2 -translate-y-1/2 scale-[0.96] bg-transparent text-black/50 opacity-0 transition-[opacity,scale,color] duration-150 ease-out before:absolute before:size-[calc(var(--logo-stroke-width)*5)] before:bg-white/10 before:backdrop-blur hover:text-black focus-visible:pointer-events-auto focus-visible:scale-100 focus-visible:text-black focus-visible:opacity-100 [@media(hover:hover)]:group-hover/restart:pointer-events-auto [@media(hover:hover)]:group-hover/restart:scale-100 [@media(hover:hover)]:group-hover/restart:opacity-100 motion-reduce:scale-100 motion-reduce:transition-none"
          />
        ) : null
      }
    >
      {children}
    </PortfolioViewerOpenSurface>
  )
}

export function ProjectPanel({
  slide,
  restingMediaPadding,
  isActive,
  concealedScreenshotId,
  registerMediaElement,
  onOpenViewer,
}: {
  slide: Extract<ProjectSlide, { kind: 'screenshot' }>
  restingMediaPadding: string
  isActive: boolean
  concealedScreenshotId?: string
  registerMediaElement: (
    key: string,
    element: PortfolioMediaElement | null,
  ) => void
  onOpenViewer: (intent: ViewerOpenIntent) => void
}) {
  return (
    <div className="relative grid h-full min-h-0 min-w-0 place-items-center overflow-hidden pb-[var(--portfolio-slide-navigation-reserved-height)]">
      <ViewerScreenshot
        active={isActive}
        screenshotId={slide.screenshot.id}
        concealed={concealedScreenshotId === slide.screenshot.id}
        restingMediaPadding={restingMediaPadding}
        onOpenViewer={onOpenViewer}
        restartable={slide.screenshot.restartable}
        className="relative h-full min-h-0 w-full min-w-0"
      >
        <ScreenshotMedia
          screenshot={slide.screenshot}
          mediaKey={carouselMediaKey(slide.screenshot)}
          registerMediaElement={registerMediaElement}
          priority={isActive}
          sizes="(min-aspect-ratio: 5/4) 70vw, 100vw"
          className={getCarouselMediaClass(false)}
        />
      </ViewerScreenshot>
    </div>
  )
}

export function ScreenshotMedia({
  screenshot,
  mediaKey,
  registerMediaElement,
  priority,
  sizes,
  className,
}: {
  screenshot: PortfolioScreenshot
  mediaKey: string
  registerMediaElement: (
    key: string,
    element: PortfolioMediaElement | null,
  ) => void
  priority?: boolean
  sizes: string
  className: string
}) {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null)

  const updateAspectRatio = (element: PortfolioMediaElement) => {
    const width =
      element instanceof HTMLImageElement
        ? element.naturalWidth
        : element.videoWidth
    const height =
      element instanceof HTMLImageElement
        ? element.naturalHeight
        : element.videoHeight
    if (!width || !height) return
    const nextAspectRatio = width / height
    setAspectRatio(current =>
      current === nextAspectRatio ? current : nextAspectRatio,
    )
  }

  const setMediaRef = (element: PortfolioMediaElement | null) => {
    registerMediaElement(mediaKey, element)
    if (mediaKey.startsWith('carousel:'))
      registerMediaElement(viewerMediaKey(screenshot), element)
    if (element) updateAspectRatio(element)
  }

  const frameStyle: MediaFrameStyle = aspectRatio
    ? {
        '--portfolio-media-aspect-ratio': aspectRatio,
        'width': `min(100cqw, calc((100cqh - ${MEDIA_FRAME_INSET}) * var(--portfolio-media-aspect-ratio) + ${MEDIA_FRAME_INSET}))`,
        'height': `min(100cqh, calc((100cqw - ${MEDIA_FRAME_INSET}) / var(--portfolio-media-aspect-ratio) + ${MEDIA_FRAME_INSET}))`,
      }
    : { width: '100%', height: '100%' }

  const frameClassName =
    'relative bg-[color-mix(in_srgb,var(--portfolio-ink)_5%,transparent)] [padding:var(--portfolio-default-spacing)]'

  if (isVideoScreenshot(screenshot)) {
    return (
      <div className="absolute inset-0 grid place-items-center [container-type:size] [padding:var(--portfolio-media-padding,var(--portfolio-default-spacing))] [padding-top:var(--portfolio-media-top-padding,calc(var(--portfolio-media-padding,var(--portfolio-default-spacing))+var(--logo-stroke-width)))]">
        <div
          data-portfolio-media-frame
          className={frameClassName}
          style={frameStyle}
        >
          <div className="relative h-full w-full">
            <video
              ref={setMediaRef}
              src={screenshot.src}
              aria-label={screenshot.alt}
              autoPlay
              draggable={false}
              loop
              muted
              onDragStart={event => event.preventDefault()}
              onLoadedMetadata={event => updateAspectRatio(event.currentTarget)}
              playsInline
              preload={priority ? 'auto' : 'metadata'}
              className={`absolute inset-0 h-full w-full select-none object-contain ${className}`}
              style={
                screenshot.clipToPhoneFrame
                  ? {
                      clipPath:
                        'inset(0 1% round 18% 18% 20% 20% / 9% 9% 10% 10%)',
                    }
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 grid place-items-center [container-type:size] [padding:var(--portfolio-media-padding,var(--portfolio-default-spacing))] [padding-top:var(--portfolio-media-top-padding,calc(var(--portfolio-media-padding,var(--portfolio-default-spacing))+var(--logo-stroke-width)))]">
      <div
        data-portfolio-media-frame
        className={frameClassName}
        style={frameStyle}
      >
        <div className="relative h-full w-full">
          <Image
            ref={setMediaRef}
            src={screenshot.src}
            alt={screenshot.alt}
            fill
            draggable={false}
            unoptimized
            onDragStart={event => event.preventDefault()}
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
