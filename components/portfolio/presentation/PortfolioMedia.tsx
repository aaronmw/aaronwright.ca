import Image from 'next/image';
import type { CSSProperties, ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';
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
  isBuildingWithAiTextSlide,
  isVideoScreenshot,
  modalMediaKey,
  type ProjectSlide,
} from '@/components/portfolio/domain/slides';
import {
  BuildingWithAiTextPanel,
  ProjectDescription,
} from './PortfolioText';

const CAROUSEL_MEDIA_CLASS =
  'object-contain transition-[filter,padding] [transition-duration:1000ms,500ms] [transition-timing-function:ease-in-out,var(--ease-out)] motion-reduce:transition-none';
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
  presentationActive,
  onPresentationChange,
  children,
}: {
  active: boolean;
  screenshotId: string;
  concealed: boolean;
  className: string;
  expandToViewport: boolean;
  presentationActive: boolean;
  onPresentationChange: (screenshotId: string, presented: boolean) => void;
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

  return (
    <div
      ref={surfaceRef}
      data-portfolio-screenshot-id={screenshotId}
      data-portfolio-inline-zoomed={isLocallyPresented ? 'true' : 'false'}
      className={`relative overflow-hidden border border-transparent bg-black transition-[width,height,right,top,left] duration-500 ease-out motion-reduce:transition-none ${className} ${cursorClass} ${
        concealed ? 'invisible' : ''
      }`}
      style={
        {
          '--portfolio-media-padding': isPresented ? '6rem' : '1.5rem',
          touchAction: isZoomed ? 'none' : 'pan-x pan-y',
          position: isFixedViewportPresentation
            ? 'fixed'
            : expandToViewport
              ? 'absolute'
              : undefined,
          inset: isFixedViewportPresentation ? '0px' : undefined,
          right: isFixedViewportPresentation
            ? '0px'
            : expandToViewport
              ? isPresented
                ? '0px'
                : 'var(--portfolio-control-gutter-width)'
              : undefined,
          top: isFixedViewportPresentation
            ? '0px'
            : expandToViewport
              ? '50%'
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
              ? 'translate3d(0, -50%, 0)'
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
      className="size-7 text-[var(--project-color)] drop-shadow-[1px_1px_0_black]"
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
          className="pointer-events-none grid h-dvh w-[50vw] shrink-0 place-items-center bg-black"
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
      className="pointer-events-none grid h-dvh w-[50vw] shrink-0 snap-start snap-always place-items-center bg-black"
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
  slide,
  carouselIndex,
  carouselEntryKind,
  isWideLayout,
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
  slide: ProjectSlide;
  carouselIndex: number;
  carouselEntryKind: LoopingCarouselEntry<ProjectSlide>['kind'];
  isWideLayout: boolean;
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
  const isTextSlide = isBuildingWithAiTextSlide(project, slide);
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
          ? 'grid-cols-[minmax(var(--portfolio-description-rail-width),1fr)_auto_var(--portfolio-control-gutter-width)]'
          : ''
      }`;

  return (
    <article
      data-portfolio-carousel-panel={carouselEntryKind}
      data-portfolio-carousel-index={carouselIndex}
      className={`grid h-dvh w-screen shrink-0 snap-start snap-always grid-rows-[1fr] bg-black ${
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
            className={`grid aspect-square place-items-center border border-white/15 text-center ${
              isWideLayout
                ? 'col-start-2 h-[var(--portfolio-screenshot-size)] max-h-none w-[var(--portfolio-screenshot-size)] max-w-none self-center justify-self-end'
                : 'max-h-[calc(100dvh-5rem)] w-full max-w-[calc(100dvh-5rem)]'
            }`}
          >
            <span className="px-8 text-5xl font-black uppercase leading-none text-white/12">
              Coming soon
            </span>
          </div>
        ) : isTextSlide ? (
          <BuildingWithAiTextPanel
            project={project}
            projectNumber={projectNumber}
            projectColor={projectColor}
            isWideLayout={isWideLayout}
            setDescriptionRef={setDescriptionRef}
          />
        ) : (
          <ZoomableScreenshot
            active={isActive}
            screenshotId={slide.screenshot.id}
            concealed={concealedScreenshotId === slide.screenshot.id}
            expandToViewport={isWideLayout}
            presentationActive={inlineZoomPresentationActive}
            onPresentationChange={onInlinePresentationChange}
            className={
              isWideLayout
                ? 'col-start-2 aspect-square h-[var(--portfolio-screenshot-size)] max-h-none w-[var(--portfolio-screenshot-size)] max-w-none self-center justify-self-end'
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
    return (
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
        className={`absolute inset-0 h-full w-full select-none [padding:var(--portfolio-media-padding,1.5rem)] ${className}`}
      />
    );
  }

  return (
    <Image
      ref={setMediaRef}
      src={screenshot.src}
      alt={screenshot.alt}
      fill
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
      priority={priority}
      sizes={sizes}
      className={`select-none [padding:var(--portfolio-media-padding,1.5rem)] ${className}`}
    />
  );
}
