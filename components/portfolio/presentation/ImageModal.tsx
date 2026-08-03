import type { CSSProperties } from 'react';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import type {
  PortfolioProject,
  PortfolioScreenshot,
} from '@/lib/portfolio';
import { getLoopingCarouselEntries } from '@/components/portfolio/domain/carousel';
import { modalMediaKey } from '@/components/portfolio/domain/slides';
import type { SlideIndicatorMotionController } from '@/components/portfolio/navigation/SlideNavigation';
import type { PortfolioMediaElement } from '@/components/portfolio/usePortfolioMediaReadiness';
import { CircularIconButton } from './PortfolioControls';
import { getCarouselMediaClass, ScreenshotMedia } from './PortfolioMedia';
import {
  type ModalTransitionRect,
  useImageModalMotion,
} from './useImageModalMotion';

type ProjectColorStyle = CSSProperties & {
  '--project-color': string;
};

export type { ModalTransitionRect } from './useImageModalMotion';

export function ImageModal({
  indicatorMotionControllerRef,
  project,
  projectColor,
  screenshot,
  screenshots,
  activeScreenshotIndex,
  transitionRect,
  isClosing,
  registerMediaElement,
  onClose,
  onExited,
}: {
  indicatorMotionControllerRef: {
    current: SlideIndicatorMotionController | null;
  };
  project: PortfolioProject;
  projectColor: string;
  screenshot: PortfolioScreenshot;
  screenshots: PortfolioScreenshot[];
  activeScreenshotIndex: number;
  transitionRect: ModalTransitionRect | null;
  isClosing: boolean;
  registerMediaElement: (
    key: string,
    element: PortfolioMediaElement | null,
  ) => void;
  onClose: () => void;
  onExited: () => void;
}) {
  const carouselScreenshots =
    screenshots.length > 0 ? screenshots : [screenshot];
  const carouselCount = carouselScreenshots.length;
  const renderedCarouselScreenshots =
    getLoopingCarouselEntries(carouselScreenshots);
  const motion = useImageModalMotion({
    activeScreenshotIndex,
    carouselCount,
    screenshotId: screenshot.id,
    transitionRect,
    isClosing,
    indicatorMotionControllerRef,
    onExited,
  });

  return (
    <>
      <dialog
        open
        data-portfolio-modal-root
        className={`fixed inset-0 z-50 m-0 h-dvh max-h-none w-screen max-w-none touch-none overflow-hidden border-0 bg-transparent p-0 ${motion.panCursorClass}`}
        aria-label={`${project.title}: ${screenshot.alt}`}
        onDoubleClick={motion.handleDoubleClick}
        onWheel={motion.handleWheel}
        onPointerDown={motion.handlePointerDown}
        onPointerMove={motion.handlePointerMove}
        onPointerUp={motion.stopPointerDrag}
        onPointerCancel={motion.stopPointerDrag}
        onTouchStart={motion.handleTouchStart}
        onTouchMove={motion.handleTouchMove}
        onTouchEnd={motion.handleTouchEnd}
      >
        <div
          ref={motion.backdropRef}
          className="portfolio-theme-surface fixed inset-0"
          aria-hidden="true"
        />
        <div
          ref={motion.imageFrameRef}
          data-portfolio-modal-image-frame
          className={`fixed left-0 top-0 z-10 h-dvh w-screen origin-center ${motion.panCursorClass}`}
        >
          <div
            className={`absolute inset-0 overflow-hidden ${
              motion.showTransitionMedia ? 'invisible' : 'visible'
            }`}
            aria-hidden={motion.showTransitionMedia}
          >
            <div
              ref={motion.carouselTrackRef}
              data-portfolio-modal-carousel-track
              className="flex h-full w-screen"
              style={{ gap: `${motion.gapPx}px` }}
            >
              {renderedCarouselScreenshots.map(
                ({ item: carouselScreenshot, key }) => (
                  <div key={key} className="relative h-full w-screen shrink-0">
                    <ScreenshotMedia
                      screenshot={carouselScreenshot}
                      mediaKey={modalMediaKey(carouselScreenshot)}
                      registerMediaElement={registerMediaElement}
                      priority={carouselScreenshot.id === screenshot.id}
                      sizes="100vw"
                      className={getCarouselMediaClass(
                        carouselCount > 2 &&
                          motion.isBoundaryBlurTransition,
                      )}
                    />
                  </div>
                ),
              )}
            </div>
          </div>
          <div
            className={`absolute inset-0 overflow-hidden ${
              motion.showTransitionMedia ? 'visible' : 'invisible'
            }`}
            aria-hidden={!motion.showTransitionMedia}
          >
            <ScreenshotMedia
              screenshot={screenshot}
              mediaKey={modalMediaKey(screenshot)}
              registerMediaElement={registerMediaElement}
              priority
              sizes="100vw"
              className="object-contain"
            />
          </div>
        </div>
      </dialog>
      <CircularIconButton
        icon={faXmark}
        buttonRef={(node) => {
          motion.closeButtonRef.current = node;
        }}
        iconClassName="size-7"
        ring
        data-portfolio-modal-close
        className={`portfolio-theme-surface fixed right-5 top-5 z-[70] isolate size-11 text-[var(--project-color)] ${
          isClosing ? 'pointer-events-none' : ''
        }`}
        style={
          {
            '--project-color': projectColor,
            top: 'max(1.25rem, env(safe-area-inset-top, 0px))',
            right: 'max(1.25rem, env(safe-area-inset-right, 0px))',
          } as ProjectColorStyle
        }
        aria-label="Close enlarged image"
        title="Close"
        onClick={onClose}
      />
    </>
  );
}
