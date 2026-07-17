import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { gsap } from 'gsap';
import {
  NAVIGATION_TRAVEL_EASE,
  getCanonicalRenderedCarouselIndex,
  getNavigationTravelDuration,
  isCarouselBoundaryJump,
} from '@/components/portfolio/domain/carousel';
import type { SlideIndicatorMotionController } from '@/components/portfolio/navigation/SlideNavigation';

export type ModalTransitionRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const MODAL_CAROUSEL_GAP_PX = 40;

function getTouchDistance(event: ReactTouchEvent<HTMLDialogElement>) {
  const [first, second] = Array.from(event.touches);

  return Math.hypot(
    first.clientX - second.clientX,
    first.clientY - second.clientY,
  );
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      'input, textarea, select, button, a, [contenteditable="true"]',
    ),
  );
}

function getModalFrameRect(): ModalTransitionRect {
  return {
    left: 0,
    top: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export function useImageModalMotion({
  activeScreenshotIndex,
  carouselCount,
  screenshotId,
  transitionRect,
  isClosing,
  indicatorMotionControllerRef,
  onExited,
}: {
  activeScreenshotIndex: number;
  carouselCount: number;
  screenshotId: string;
  transitionRect: ModalTransitionRect | null;
  isClosing: boolean;
  indicatorMotionControllerRef: {
    current: SlideIndicatorMotionController | null;
  };
  onExited: () => void;
}) {
  const boundedActiveScreenshotIndex = Math.max(
    0,
    Math.min(carouselCount - 1, activeScreenshotIndex),
  );
  const renderedCarouselIndex = getCanonicalRenderedCarouselIndex(
    boundedActiveScreenshotIndex,
    carouselCount,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(
    Boolean(transitionRect),
  );
  const [isBoundaryBlurTransition, setIsBoundaryBlurTransition] =
    useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const imageFrameRef = useRef<HTMLDivElement>(null);
  const carouselTrackRef = useRef<HTMLDivElement>(null);
  const liveOffsetRef = useRef({ x: 0, y: 0 });
  const liveScaleRef = useRef(1);
  const isZoomedRef = useRef(false);
  const dragRef = useRef({
    pointerId: 0,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    dragging: false,
  });
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const presentationTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const carouselTweenRef = useRef<gsap.core.Tween | null>(null);
  const hasInitializedPresentationRef = useRef(false);
  const previousCarouselStateRef = useRef<{
    activeIndex: number;
    itemCount: number;
  } | null>(null);
  const onExitedEvent = useEffectEvent(onExited);
  const clampScale = useCallback((nextScale: number) => {
    return Math.min(6, Math.max(1, nextScale));
  }, []);
  const prefersReducedMotion = useCallback(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const transformFor = useCallback(
    (nextOffset: { x: number; y: number }, nextScale: number) =>
      `translate3d(${nextOffset.x}px, ${nextOffset.y}px, 0) scale(${nextScale})`,
    [],
  );
  const applyLiveTransform = useCallback(() => {
    const imageFrame = imageFrameRef.current;

    if (!imageFrame) {
      return;
    }

    imageFrame.style.transform = transformFor(
      liveOffsetRef.current,
      liveScaleRef.current,
    );
  }, [transformFor]);
  const scheduleLiveTransform = useCallback(() => {
    if (animationFrameRef.current !== null) {
      return;
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = null;
      applyLiveTransform();
    });
  }, [applyLiveTransform]);
  const updateZoomedState = useCallback((zoomed: boolean) => {
    if (isZoomedRef.current === zoomed) {
      return;
    }

    isZoomedRef.current = zoomed;
    setIsZoomed(zoomed);
  }, []);
  const resetLiveView = useCallback(
    (applyTransform = true) => {
      liveOffsetRef.current = { x: 0, y: 0 };
      liveScaleRef.current = 1;
      updateZoomedState(false);

      if (applyTransform) {
        applyLiveTransform();
      }
    },
    [applyLiveTransform, updateZoomedState],
  );
  const setLiveScale = useCallback(
    (nextScale: number) => {
      liveScaleRef.current = clampScale(nextScale);
      updateZoomedState(liveScaleRef.current > 1);
      scheduleLiveTransform();
    },
    [clampScale, scheduleLiveTransform, updateZoomedState],
  );

  useLayoutEffect(() => {
    resetLiveView(!isTransitioning);
  }, [isTransitioning, resetLiveView, screenshotId]);

  useLayoutEffect(() => {
    const backdrop = backdropRef.current;
    const closeButton = closeButtonRef.current;
    const imageFrame = imageFrameRef.current;

    if (!backdrop || !closeButton || !imageFrame) {
      return;
    }

    const expandedRect = getModalFrameRect();
    const collapseRect = transitionRect ?? expandedRect;
    const isReducedMotion = prefersReducedMotion();
    const isFirstPresentation = !hasInitializedPresentationRef.current;

    hasInitializedPresentationRef.current = true;
    presentationTimelineRef.current?.kill();
    gsap.killTweensOf([backdrop, closeButton, imageFrame]);
    imageFrame.style.transition = 'none';

    if (isFirstPresentation) {
      const initialRect = transitionRect ?? expandedRect;

      gsap.set(imageFrame, {
        left: initialRect.left,
        top: initialRect.top,
        width: initialRect.width,
        height: initialRect.height,
        x: 0,
        y: 0,
        scale: 1,
        opacity: transitionRect ? 0.96 : 1,
        transformOrigin: 'center center',
      });
      gsap.set(backdrop, { opacity: 0 });
      gsap.set(closeButton, { x: 0, y: -64, rotation: 90, opacity: 0 });
    }

    if (isClosing) {
      dragRef.current.dragging = false;
      pinchRef.current = null;
    }

    setIsTransitioning(true);
    const frameTarget = isClosing ? collapseRect : expandedRect;
    const frameDuration = isReducedMotion ? 0.001 : isClosing ? 0.34 : 0.42;
    const accessoryDuration = isReducedMotion ? 0.001 : 0.3;
    const timeline = gsap.timeline({
      defaults: { overwrite: 'auto' },
      onComplete: () => {
        if (presentationTimelineRef.current !== timeline) {
          return;
        }

        presentationTimelineRef.current = null;

        if (isClosing) {
          onExitedEvent();
          return;
        }

        gsap.set(imageFrame, {
          clearProps: 'left,top,width,height,opacity,willChange',
        });
        imageFrame.style.transition = 'transform 160ms ease-out';
        resetLiveView();
        setIsTransitioning(false);
      },
    });

    presentationTimelineRef.current = timeline;
    timeline
      .to(
        imageFrame,
        {
          left: frameTarget.left,
          top: frameTarget.top,
          width: frameTarget.width,
          height: frameTarget.height,
          x: 0,
          y: 0,
          scale: 1,
          opacity: isClosing ? 0.96 : 1,
          duration: frameDuration,
          ease: isClosing ? 'power2.in' : 'expo.out',
          willChange: 'left, top, width, height, transform',
        },
        0,
      )
      .to(
        backdrop,
        {
          opacity: isClosing ? 0 : 1,
          duration: frameDuration,
          ease: isClosing ? 'power2.in' : 'power2.out',
        },
        0,
      )
      .to(
        closeButton,
        {
          x: 0,
          y: isClosing ? -64 : 0,
          rotation: isClosing ? 90 : 0,
          opacity: isClosing ? 0 : 1,
          duration: accessoryDuration,
          ease: isClosing ? 'power2.in' : 'expo.out',
        },
        0,
      );

    return () => {
      if (presentationTimelineRef.current === timeline) {
        presentationTimelineRef.current = null;
      }
      timeline.kill();
    };
  }, [
    applyLiveTransform,
    dragRef,
    isClosing,
    pinchRef,
    prefersReducedMotion,
    resetLiveView,
    transitionRect,
  ]);

  useLayoutEffect(() => {
    const carouselTrack = carouselTrackRef.current;

    if (!carouselTrack) {
      return;
    }

    const previousState = previousCarouselStateRef.current;
    const isFirstPosition = previousState === null;
    const didCarouselChange = previousState?.itemCount !== carouselCount;
    const isBoundary = previousState
      ? isCarouselBoundaryJump(
          previousState.activeIndex,
          boundedActiveScreenshotIndex,
          carouselCount,
        )
      : false;

    previousCarouselStateRef.current = {
      activeIndex: boundedActiveScreenshotIndex,
      itemCount: carouselCount,
    };
    carouselTweenRef.current?.kill();
    const targetX =
      -renderedCarouselIndex * (window.innerWidth + MODAL_CAROUSEL_GAP_PX);
    const carouselStride = window.innerWidth + MODAL_CAROUSEL_GAP_PX;

    if (isFirstPosition || didCarouselChange) {
      setIsBoundaryBlurTransition(false);
      gsap.set(carouselTrack, { x: targetX, xPercent: 0 });
      indicatorMotionControllerRef.current?.update(
        boundedActiveScreenshotIndex,
      );
      return;
    }

    setIsBoundaryBlurTransition(isBoundary && carouselCount > 2);
    gsap.set(carouselTrack, { willChange: 'transform' });
    const currentX = Number(gsap.getProperty(carouselTrack, 'x')) || 0;
    const distanceInSlides = Math.abs(targetX - currentX) / carouselStride;
    const tween = gsap.to(carouselTrack, {
      x: targetX,
      xPercent: 0,
      duration: prefersReducedMotion()
        ? 0
        : getNavigationTravelDuration(distanceInSlides),
      ease: NAVIGATION_TRAVEL_EASE,
      overwrite: 'auto',
      onUpdate: () => {
        const liveX = Number(gsap.getProperty(carouselTrack, 'x')) || 0;
        indicatorMotionControllerRef.current?.update(
          -liveX / carouselStride - 1,
        );
      },
      onComplete: () => {
        if (carouselTweenRef.current === tween) {
          carouselTweenRef.current = null;
        }
        setIsBoundaryBlurTransition(false);
        gsap.set(carouselTrack, { clearProps: 'willChange' });
        indicatorMotionControllerRef.current?.update(
          boundedActiveScreenshotIndex,
        );
        indicatorMotionControllerRef.current?.complete(
          boundedActiveScreenshotIndex,
        );
      },
      onInterrupt: () => {
        if (carouselTweenRef.current === tween) {
          carouselTweenRef.current = null;
          setIsBoundaryBlurTransition(false);
        }
      },
    });
    carouselTweenRef.current = tween;

    return () => {
      if (carouselTweenRef.current === tween) {
        carouselTweenRef.current = null;
      }
      tween.kill();
      gsap.set(carouselTrack, { clearProps: 'willChange' });
    };
  }, [
    boundedActiveScreenshotIndex,
    carouselCount,
    indicatorMotionControllerRef,
    prefersReducedMotion,
    renderedCarouselIndex,
  ]);

  useEffect(() => {
    const syncCarouselWidth = () => {
      const carouselTrack = carouselTrackRef.current;

      if (!carouselTrack) {
        return;
      }

      carouselTweenRef.current?.kill();
      gsap.set(carouselTrack, {
        x: -renderedCarouselIndex * (window.innerWidth + MODAL_CAROUSEL_GAP_PX),
        xPercent: 0,
      });
    };

    window.addEventListener('resize', syncCarouselWidth);
    return () => window.removeEventListener('resize', syncCarouselWidth);
  }, [renderedCarouselIndex]);

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      presentationTimelineRef.current?.kill();
      carouselTweenRef.current?.kill();
    },
    [],
  );

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLDialogElement>) => {
      event.preventDefault();

      if (isTransitioning || isClosing) {
        return;
      }

      setLiveScale(liveScaleRef.current + event.deltaY * -0.002);
    },
    [isClosing, isTransitioning, setLiveScale],
  );

  const handleDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLDialogElement>) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();

      if (isTransitioning || isClosing) {
        return;
      }

      dragRef.current.dragging = false;
      pinchRef.current = null;
      resetLiveView();
      setIsDragging(false);
    },
    [dragRef, isClosing, isTransitioning, pinchRef, resetLiveView],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDialogElement>) => {
      if (
        isTransitioning ||
        isClosing ||
        liveScaleRef.current <= 1 ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      if (imageFrameRef.current) {
        imageFrameRef.current.style.transition = 'none';
      }
      setIsDragging(true);
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic pointer events in tests do not always have an active pointer.
      }
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: liveOffsetRef.current.x,
        originY: liveOffsetRef.current.y,
        dragging: true,
      };
    },
    [dragRef, isClosing, isTransitioning],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDialogElement>) => {
      const drag = dragRef.current;

      if (!drag.dragging || drag.pointerId !== event.pointerId) {
        return;
      }

      liveOffsetRef.current = {
        x: drag.originX + event.clientX - drag.startX,
        y: drag.originY + event.clientY - drag.startY,
      };
      scheduleLiveTransform();
    },
    [dragRef, scheduleLiveTransform],
  );

  const stopPointerDrag = useCallback(
    (event: ReactPointerEvent<HTMLDialogElement>) => {
      if (dragRef.current.pointerId === event.pointerId) {
        dragRef.current.dragging = false;
        if (imageFrameRef.current) {
          imageFrameRef.current.style.transition = 'transform 160ms ease-out';
        }
        setIsDragging(false);
      }
    },
    [dragRef],
  );

  const handleTouchStart = useCallback(
    (event: ReactTouchEvent<HTMLDialogElement>) => {
      if (isTransitioning || isClosing) {
        return;
      }

      if (event.touches.length === 2) {
        pinchRef.current = {
          distance: getTouchDistance(event),
          scale: liveScaleRef.current,
        };
      }
    },
    [isClosing, isTransitioning, pinchRef],
  );

  const handleTouchMove = useCallback(
    (event: ReactTouchEvent<HTMLDialogElement>) => {
      if (
        isTransitioning ||
        isClosing ||
        event.touches.length !== 2 ||
        !pinchRef.current
      ) {
        return;
      }

      event.preventDefault();
      const nextDistance = getTouchDistance(event);
      setLiveScale(
        (nextDistance / pinchRef.current.distance) * pinchRef.current.scale,
      );
    },
    [isClosing, isTransitioning, pinchRef, setLiveScale],
  );

  const handleTouchEnd = useCallback(() => {
    pinchRef.current = null;
  }, [pinchRef]);

  const panCursorClass =
    isZoomed && !isTransitioning && !isClosing
      ? isDragging
        ? 'cursor-grabbing'
        : 'cursor-grab'
      : '';

  return {
    backdropRef,
    boundedActiveScreenshotIndex,
    carouselTrackRef,
    closeButtonRef,
    gapPx: MODAL_CAROUSEL_GAP_PX,
    handleDoubleClick,
    handlePointerDown,
    handlePointerMove,
    handleTouchEnd,
    handleTouchMove,
    handleTouchStart,
    handleWheel,
    imageFrameRef,
    isBoundaryBlurTransition,
    panCursorClass,
    showTransitionMedia: isTransitioning || isClosing,
    stopPointerDrag,
  };
}
