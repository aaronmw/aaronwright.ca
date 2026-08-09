import Image from 'next/image';
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faArrowRight,
  faRotateRight,
} from '@fortawesome/free-solid-svg-icons';
import type {
  PortfolioProject,
  PortfolioScreenshot,
} from '@/lib/portfolio';
import {
  MOBILE_SECTION_CONTENT_PADDING_LEFT,
  MOBILE_SECTION_CONTENT_PADDING_RIGHT,
} from '@/components/portfolio/mobileLayout';
import type { PortfolioMediaElement } from '@/components/portfolio/usePortfolioMediaReadiness';
import { useInlineMediaZoom } from '@/components/portfolio/useInlineMediaZoom';
import type { LoopingCarouselEntry } from '@/components/portfolio/domain/carousel';
import {
  carouselMediaKey,
  hasProjectScreenshots,
  isAboutMeTextSlide,
  isVideoScreenshot,
  modalMediaKey,
  type ProjectSlide,
} from '@/components/portfolio/domain/slides';
import {
  AboutMeTextPanel,
  ProjectDescription,
} from './PortfolioText';
import { CircularIconButton } from './PortfolioControls';

const CAROUSEL_MEDIA_CLASS =
  'object-contain transition-[filter,padding] [transition-duration:1000ms,500ms] [transition-timing-function:ease-in-out,var(--ease-out)] motion-reduce:transition-none';
const WIDE_RESTING_MEDIA_CENTER = 'calc(50% - 42px)';
const MOBILE_SECTION_CONTENT_INSETS: CSSProperties = {
  paddingLeft: MOBILE_SECTION_CONTENT_PADDING_LEFT,
  paddingRight: MOBILE_SECTION_CONTENT_PADDING_RIGHT,
};

type ProjectColorStyle = CSSProperties & {
  '--project-color': string;
};

type InlineMediaSurfaceStyle = CSSProperties & {
  '--portfolio-media-padding': string;
};

export function getCarouselMediaClass(shouldBlur: boolean) {
  return `${CAROUSEL_MEDIA_CLASS} ${shouldBlur ? 'blur-[20px]' : 'blur-0'}`;
}

function ZoomableScreenshot({
  active,
  screenshotId,
  concealed,
  className,
  expandToViewport,
  restingMediaPadding,
  presentationActive,
  onPresentationChange,
  restartable,
  children,
}: {
  active: boolean;
  screenshotId: string;
  concealed: boolean;
  className: string;
  expandToViewport: boolean;
  restingMediaPadding: string;
  presentationActive: boolean;
  onPresentationChange: (screenshotId: string, presented: boolean) => void;
  restartable?: boolean;
  children: ReactNode;
}) {
  const {
    contentRef,
    isPointerDragging,
    isPresented: isLocallyPresented,
    isZoomed,
    surfaceRef,
  } = useInlineMediaZoom(active, (presented) =>
    onPresentationChange(screenshotId, presented),
  );
  const cursorClass = isZoomed
    ? isPointerDragging
      ? 'cursor-grabbing'
      : 'cursor-grab'
    : '';
  const isPresented =
    isLocallyPresented ||
    (presentationActive && (expandToViewport || active));
  const isFixedViewportPresentation = isPresented && !expandToViewport;
  const handleRestart = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (event.detail > 1) {
      return;
    }

    const video = surfaceRef.current?.querySelector('video');

    if (!video) {
      return;
    }

    video.currentTime = 0;
    void video.play().catch(() => undefined);
  };

  return (
    <div
      ref={surfaceRef}
      data-portfolio-screenshot-id={screenshotId}
      data-portfolio-inline-zoomed={isLocallyPresented ? 'true' : 'false'}
      className={`group/restart relative overflow-hidden border border-transparent bg-[var(--portfolio-surface)] transition-[width,height,right,top,left,background-color] duration-500 ease-out motion-reduce:transition-none ${className} ${cursorClass} ${
        concealed ? 'invisible' : ''
      }`}
      style={
        {
          '--portfolio-media-padding': isPresented
            ? '6rem'
            : restingMediaPadding,
          touchAction: isZoomed ? 'none' : 'pan-x pan-y',
          position: isFixedViewportPresentation
            ? 'fixed'
            : expandToViewport
              ? 'absolute'
              : undefined,
          inset: isFixedViewportPresentation ? '0px' : undefined,
          right: isFixedViewportPresentation ? '0px' : undefined,
          left: isFixedViewportPresentation
            ? '0px'
            : expandToViewport
              ? isPresented
                ? '50%'
                : 'calc(50vw + var(--portfolio-description-rail-half-width) - 3rem)'
              : undefined,
          top: isFixedViewportPresentation
            ? '0px'
            : expandToViewport
              ? isPresented
                ? '50%'
                : WIDE_RESTING_MEDIA_CENTER
              : undefined,
          width: isFixedViewportPresentation
            ? '100vw'
            : expandToViewport
              ? isPresented
                ? '100vw'
                : 'var(--portfolio-screenshot-size)'
              : undefined,
          height: isFixedViewportPresentation
            ? '100dvh'
            : expandToViewport
              ? isPresented
                ? '100dvh'
                : 'var(--portfolio-screenshot-size)'
              : undefined,
          transform: isFixedViewportPresentation
            ? 'none'
            : expandToViewport
              ? 'translate3d(-50%, -50%, 0)'
              : undefined,
          zIndex: isFixedViewportPresentation ? 30 : undefined,
          willChange: isPresented
            ? 'width, height, right, top, left'
            : undefined,
        } as InlineMediaSurfaceStyle
      }
    >
      <div
        ref={contentRef}
        data-portfolio-inline-zoom-content
        className="pointer-events-none absolute inset-0 origin-center select-none"
        style={{ willChange: isZoomed ? 'transform' : 'auto' }}
      >
        {children}
      </div>
      {active && restartable ? (
        <CircularIconButton
          icon={faRotateRight}
          iconClassName="size-14"
          aria-label="Restart animation"
          title="Restart animation"
          onClick={handleRestart}
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 size-[88px] -translate-x-1/2 -translate-y-1/2 scale-[0.96] bg-white/10 text-black/50 opacity-0 backdrop-blur transition-[opacity,scale,color] duration-150 ease-out hover:text-black focus-visible:pointer-events-auto focus-visible:scale-100 focus-visible:text-black focus-visible:opacity-100 [@media(hover:hover)]:group-hover/restart:pointer-events-auto [@media(hover:hover)]:group-hover/restart:scale-100 [@media(hover:hover)]:group-hover/restart:opacity-100 motion-reduce:scale-100 motion-reduce:transition-none"
        />
      ) : null}
    </div>
  );
}

export function CarouselPullBoundary({
  edge,
  projectColor,
}: {
  edge: 'before' | 'after';
  projectColor: string;
}) {
  const icon = (
    <FontAwesomeIcon
      icon={edge === 'before' ? faArrowRight : faArrowLeft}
      className="portfolio-icon-shadow size-7 text-[var(--project-color)]"
    />
  );

  if (edge === 'after') {
    return (
      <>
        <div
          data-portfolio-carousel-boundary={edge}
          className="pointer-events-none -ml-[50vw] h-dvh w-[50vw] shrink-0 snap-start snap-always"
          aria-hidden="true"
        />
        <div
          data-portfolio-carousel-boundary-visual={edge}
          className="portfolio-theme-surface pointer-events-none grid h-dvh w-[50vw] shrink-0 place-items-center"
          style={{ '--project-color': projectColor } as ProjectColorStyle}
          aria-hidden="true"
        >
          {icon}
        </div>
      </>
    );
  }

  return (
    <div
      data-portfolio-carousel-boundary={edge}
      className="portfolio-theme-surface pointer-events-none grid h-dvh w-[50vw] shrink-0 snap-start snap-always place-items-center"
      style={{ '--project-color': projectColor } as ProjectColorStyle}
      aria-hidden="true"
    >
      {icon}
    </div>
  );
}

export function ProjectPanel({
  project,
  projectNumber,
  projectColor,
  projectBodyColor,
  projectContentColor,
  slide,
  carouselIndex,
  carouselEntryKind,
  isWideLayout,
  restingMediaPadding,
  reserveSectionNavigationGutter,
  isActive,
  inlineZoomPresentationActive,
  shouldBlurMedia,
  concealedScreenshotId,
  registerMediaElement,
  setDescriptionRef,
  onInlinePresentationChange,
}: {
  project: PortfolioProject;
  projectNumber: string;
  projectColor: string;
  projectBodyColor: string;
  projectContentColor: string;
  slide: ProjectSlide;
  carouselIndex: number;
  carouselEntryKind: LoopingCarouselEntry<ProjectSlide>['kind'];
  isWideLayout: boolean;
  restingMediaPadding: string;
  reserveSectionNavigationGutter: boolean;
  isActive: boolean;
  inlineZoomPresentationActive: boolean;
  shouldBlurMedia: boolean;
  concealedScreenshotId?: string;
  registerMediaElement: (
    key: string,
    element: PortfolioMediaElement | null,
  ) => void;
  setDescriptionRef: (node: HTMLDivElement | null) => void;
  onInlinePresentationChange: (
    screenshotId: string,
    presented: boolean,
  ) => void;
}) {
  const isTextSlide = isAboutMeTextSlide(project, slide);
  const shouldShowDescriptionPlaceholder =
    isWideLayout &&
    slide.kind === 'description' &&
    !hasProjectScreenshots(project);
  const panelContentClass = isTextSlide
    ? isWideLayout
      ? 'px-0 py-0'
      : ''
    : `place-items-center ${
        isWideLayout
          ? 'grid-cols-[var(--portfolio-description-rail-width)_minmax(0,1fr)_var(--portfolio-control-gutter-width)]'
          : ''
      }`;

  return (
    <article
      data-portfolio-carousel-panel={carouselEntryKind}
      data-portfolio-carousel-index={carouselIndex}
      className={`portfolio-theme-surface grid h-dvh w-screen shrink-0 snap-start snap-always grid-rows-[1fr] ${
        isWideLayout ? 'px-0 py-0' : 'portfolio-safe-inline pb-24 pt-8'
      }`}
      aria-hidden={!isActive}
      style={
        {
          '--project-color': projectColor,
          ...(reserveSectionNavigationGutter
            ? MOBILE_SECTION_CONTENT_INSETS
            : {}),
        } as ProjectColorStyle
      }
    >
      <ProjectDescription
        project={project}
        projectNumber={projectNumber}
        projectColor={projectColor}
        projectBodyColor={projectBodyColor}
        projectContentColor={projectContentColor}
        setDescriptionRef={setDescriptionRef}
        isWideLayout={isWideLayout}
        className={
          !isWideLayout && slide.kind === 'description' ? '' : 'hidden'
        }
      />

      <div
        className={`relative grid min-h-0 ${panelContentClass} ${
          slide.kind === 'description' && !shouldShowDescriptionPlaceholder
            ? 'hidden'
            : ''
        }`}
      >
        {slide.kind === 'description' ? (
          <div
            className={`grid aspect-square place-items-center border border-[var(--portfolio-hairline)] text-center ${
              isWideLayout
                ? 'col-start-2 h-[var(--portfolio-screenshot-size)] max-h-none w-[var(--portfolio-screenshot-size)] max-w-none self-center justify-self-center'
                : 'max-h-[calc(100dvh-5rem)] w-full max-w-[calc(100dvh-5rem)]'
            }`}
          >
            <span className="px-8 text-5xl font-black uppercase leading-none text-[color-mix(in_srgb,var(--portfolio-ink)_12%,transparent)]">
              Coming soon
            </span>
          </div>
        ) : isTextSlide ? (
          <AboutMeTextPanel
            project={project}
            projectNumber={projectNumber}
            projectColor={projectColor}
            projectBodyColor={projectBodyColor}
            projectContentColor={projectContentColor}
            isWideLayout={isWideLayout}
            setDescriptionRef={setDescriptionRef}
          />
        ) : (
          <ZoomableScreenshot
            active={isActive}
            screenshotId={slide.screenshot.id}
            concealed={concealedScreenshotId === slide.screenshot.id}
            expandToViewport={isWideLayout}
            restingMediaPadding={restingMediaPadding}
            presentationActive={inlineZoomPresentationActive}
            onPresentationChange={onInlinePresentationChange}
            restartable={slide.screenshot.restartable}
            className={
              isWideLayout
                ? 'col-span-full aspect-square h-[var(--portfolio-screenshot-size)] max-h-none w-[var(--portfolio-screenshot-size)] max-w-none self-center justify-self-center'
                : 'h-full min-h-0 w-full'
            }
          >
            <ScreenshotMedia
              screenshot={slide.screenshot}
              mediaKey={carouselMediaKey(slide.screenshot)}
              registerMediaElement={registerMediaElement}
              priority={isActive}
              sizes={
                isWideLayout
                  ? '(min-aspect-ratio: 5/4) calc(100dvh - 8rem), 100vw'
                  : '100vw'
              }
              className={getCarouselMediaClass(shouldBlurMedia)}
            />
          </ZoomableScreenshot>
        )}
      </div>
    </article>
  );
}

export function ScreenshotMedia({
  screenshot,
  mediaKey,
  registerMediaElement,
  priority,
  sizes,
  className,
}: {
  screenshot: PortfolioScreenshot;
  mediaKey: string;
  registerMediaElement: (
    key: string,
    element: PortfolioMediaElement | null,
  ) => void;
  priority?: boolean;
  sizes: string;
  className: string;
}) {
  const setMediaRef = (element: PortfolioMediaElement | null) => {
    registerMediaElement(mediaKey, element);

    if (mediaKey.startsWith('carousel:')) {
      registerMediaElement(modalMediaKey(screenshot), element);
    }
  };

  if (isVideoScreenshot(screenshot)) {
    const video = (
      <video
        ref={setMediaRef}
        src={screenshot.src}
        aria-label={screenshot.alt}
        autoPlay
        draggable={false}
        loop
        muted
        onDragStart={(event) => event.preventDefault()}
        playsInline
        preload={priority ? 'auto' : 'metadata'}
        className={
          screenshot.clipToPhoneFrame
            ? 'block h-auto w-auto max-h-full max-w-full select-none'
            : `absolute inset-0 h-full w-full select-none [padding:var(--portfolio-media-padding,1.5rem)] ${className}`
        }
        style={
          screenshot.clipToPhoneFrame
            ? {
                clipPath:
                  'inset(0 1% round 18% 18% 20% 20% / 9% 9% 10% 10%)',
              }
            : undefined
        }
      />
    );

    return screenshot.clipToPhoneFrame ? (
      <div
        className={`absolute inset-0 flex items-center justify-center [padding:var(--portfolio-media-padding,1.5rem)] ${className}`}
      >
        {video}
      </div>
    ) : (
      video
    );
  }

  return (
    <Image
      ref={setMediaRef}
      src={screenshot.src}
      alt={screenshot.alt}
      fill
      draggable={false}
      unoptimized
      onDragStart={(event) => event.preventDefault()}
      priority={priority}
      sizes={sizes}
      className={`select-none [padding:var(--portfolio-media-padding,1.5rem)] ${className}`}
    />
  );
}
