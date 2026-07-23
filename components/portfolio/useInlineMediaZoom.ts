'use client';

import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  createTouchDoubleTapRecognizer,
  DOUBLE_TAP_MAX_DELAY_MS,
} from '@/components/portfolio/domain/touchDoubleTap';

const MAX_SCALE = 6;
const ZOOM_EPSILON = 0.001;
const WHEEL_ZOOM_SENSITIVITY = 0.0015;
const KEYBOARD_ZOOM_DELTA_Y = -100;
const ZOOM_STEP_SCALE = Math.exp(
  -KEYBOARD_ZOOM_DELTA_Y * WHEEL_ZOOM_SENSITIVITY
);
const PRESENTATION_EXPANSION_DURATION_MS = 500;

export const INLINE_MEDIA_RESET_EVENT = 'portfolio:reset-inline-media-zoom';
export const INLINE_MEDIA_ZOOM_IN_EVENT = 'portfolio:zoom-inline-media-in';

type TouchPoint = {
  identifier: number;
  clientX: number;
  clientY: number;
};

type TouchPointList = {
  readonly length: number;
  readonly [index: number]: TouchPoint;
};

type InlineMediaGesture =
  | { kind: 'idle' }
  | {
      kind: 'pinch';
      startDistance: number;
      startScale: number;
      contentPoint: { x: number; y: number };
    }
  | {
      kind: 'pan';
      touchId: number;
      startX: number;
      startY: number;
      originX: number;
      originY: number;
    };

type PointerDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  dragging: boolean;
};

function getTouchDistance(touches: TouchPointList) {
  const first = touches[0];
  const second = touches[1];

  return Math.hypot(
    first.clientX - second.clientX,
    first.clientY - second.clientY
  );
}

function getTouchCenter(touches: TouchPointList) {
  const first = touches[0];
  const second = touches[1];

  return {
    x: (first.clientX + second.clientX) / 2,
    y: (first.clientY + second.clientY) / 2,
  };
}

function normalizeScale(scale: number) {
  const clampedScale = Math.min(MAX_SCALE, Math.max(1, scale));

  return clampedScale <= 1 + ZOOM_EPSILON ? 1 : clampedScale;
}

export function useInlineMediaZoom(
  active: boolean,
  onPresentationChange?: (presented: boolean) => void
) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const liveScaleRef = useRef(1);
  const liveOffsetRef = useRef({ x: 0, y: 0 });
  const gestureRef = useRef<InlineMediaGesture>({ kind: 'idle' });
  const pointerDragRef = useRef<PointerDrag>({
    pointerId: 0,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    dragging: false,
  });
  const [touchDoubleTapRecognizer] = useState(
    createTouchDoubleTapRecognizer
  );
  const lastTouchInteractionAtRef = useRef(Number.NEGATIVE_INFINITY);
  const animationFrameRef = useRef<number | null>(null);
  const isZoomedRef = useRef(false);
  const isPresentedRef = useRef(false);
  const presentationEnteredAtRef = useRef(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isPresented, setIsPresented] = useState(false);
  const [isPointerDragging, setIsPointerDragging] = useState(false);

  const updateZoomedState = (zoomed: boolean) => {
    if (isZoomedRef.current === zoomed) {
      return;
    }

    isZoomedRef.current = zoomed;
    setIsZoomed(zoomed);
  };

  const updatePresentedState = (presented: boolean) => {
    if (isPresentedRef.current === presented) {
      return;
    }

    isPresentedRef.current = presented;
    setIsPresented(presented);
    onPresentationChange?.(presented);
  };

  const enterPresentation = () => {
    presentationEnteredAtRef.current = performance.now();
    updatePresentedState(true);
  };

  const setContentTransformTransition = () => {
    const content = contentRef.current;

    if (!content) {
      return;
    }

    content.style.transition = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
      ? 'none'
      : 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)';
  };

  const applyLiveTransform = () => {
    const content = contentRef.current;

    if (!content) {
      return;
    }

    const { x, y } = liveOffsetRef.current;
    content.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${liveScaleRef.current})`;
  };

  const scheduleLiveTransform = () => {
    if (animationFrameRef.current !== null) {
      return;
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = null;
      applyLiveTransform();
    });
  };

  const clampOffset = (offset: { x: number; y: number }, scale: number) => {
    const surface = surfaceRef.current;

    if (!surface || scale <= 1) {
      return { x: 0, y: 0 };
    }

    const maximumX = (surface.clientWidth * (scale - 1)) / 2;
    const maximumY = (surface.clientHeight * (scale - 1)) / 2;

    return {
      x: Math.max(-maximumX, Math.min(maximumX, offset.x)),
      y: Math.max(-maximumY, Math.min(maximumY, offset.y)),
    };
  };

  const setLiveView = (
    nextScale: number,
    nextOffset: { x: number; y: number }
  ) => {
    const normalizedScale = normalizeScale(nextScale);

    liveScaleRef.current = normalizedScale;
    liveOffsetRef.current = clampOffset(nextOffset, normalizedScale);
    updateZoomedState(normalizedScale > 1);

    if (normalizedScale > 1) {
      updatePresentedState(true);
    }

    scheduleLiveTransform();
  };

  const zoomAtPoint = (
    nextScale: number,
    point: { x: number; y: number }
  ) => {
    const currentScale = liveScaleRef.current;
    const offset = liveOffsetRef.current;
    const contentPoint = {
      x: (point.x - offset.x) / currentScale,
      y: (point.y - offset.y) / currentScale,
    };

    setLiveView(nextScale, {
      x: point.x - contentPoint.x * nextScale,
      y: point.y - contentPoint.y * nextScale,
    });
  };

  const resetLiveView = (animate: boolean) => {
    const content = contentRef.current;
    const surface = surfaceRef.current;
    const pointerId = pointerDragRef.current.pointerId;

    if (surface?.hasPointerCapture(pointerId)) {
      surface.releasePointerCapture(pointerId);
    }

    gestureRef.current = { kind: 'idle' };
    pointerDragRef.current.dragging = false;
    liveScaleRef.current = 1;
    liveOffsetRef.current = { x: 0, y: 0 };
    presentationEnteredAtRef.current = 0;
    updateZoomedState(false);
    updatePresentedState(false);
    setIsPointerDragging(false);

    if (content) {
      const shouldAnimate =
        animate &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      content.style.transition = shouldAnimate
        ? 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)'
        : 'none';
    }

    applyLiveTransform();
  };

  const localPoint = (clientX: number, clientY: number) => {
    const surface = surfaceRef.current;

    if (!surface) {
      return { x: clientX, y: clientY };
    }

    const rect = surface.getBoundingClientRect();

    return {
      x: clientX - (rect.left + rect.width / 2),
      y: clientY - (rect.top + rect.height / 2),
    };
  };

  const localTouchCenter = (touches: TouchPointList) => {
    const center = getTouchCenter(touches);

    return localPoint(center.x, center.y);
  };

  const beginPinch = (touches: TouchPointList) => {
    const center = localTouchCenter(touches);
    const scale = liveScaleRef.current;
    const offset = liveOffsetRef.current;

    gestureRef.current = {
      kind: 'pinch',
      startDistance: Math.max(1, getTouchDistance(touches)),
      startScale: scale,
      contentPoint: {
        x: (center.x - offset.x) / scale,
        y: (center.y - offset.y) / scale,
      },
    };
  };

  const beginPan = (touch: TouchPoint) => {
    const offset = liveOffsetRef.current;

    gestureRef.current = {
      kind: 'pan',
      touchId: touch.identifier,
      startX: touch.clientX,
      startY: touch.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  };

  const zoomOneStepAtPoint = (point: { x: number; y: number }) => {
    setContentTransformTransition();
    if (!isPresentedRef.current) {
      enterPresentation();
    }
    zoomAtPoint(liveScaleRef.current * ZOOM_STEP_SCALE, point);
  };

  const resetLiveViewEvent = useEffectEvent(resetLiveView);

  useLayoutEffect(() => {
    if (active) {
      return;
    }

    touchDoubleTapRecognizer.reset();
    const frame = requestAnimationFrame(() => resetLiveViewEvent(false));

    return () => cancelAnimationFrame(frame);
  }, [active, touchDoubleTapRecognizer]);

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    },
    []
  );

  const handleTouchStart = useEffectEvent((event: TouchEvent) => {
    if (!active) {
      return;
    }

    lastTouchInteractionAtRef.current = performance.now();

    if (event.touches.length >= 2) {
      touchDoubleTapRecognizer.reset();
      event.preventDefault();
      event.stopPropagation();
      contentRef.current?.style.setProperty('transition', 'none');
      beginPinch(event.touches);
      return;
    }

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      touchDoubleTapRecognizer.start(touch, performance.now());
    }

    if (event.touches.length === 1 && isZoomedRef.current) {
      event.preventDefault();
      event.stopPropagation();
      contentRef.current?.style.setProperty('transition', 'none');
      beginPan(event.touches[0]);
    }
  });

  const handleTouchMove = useEffectEvent((event: TouchEvent) => {
    touchDoubleTapRecognizer.move(Array.from(event.touches));

    const gesture = gestureRef.current;

    if (!active || gesture.kind === 'idle') {
      return;
    }

    if (gesture.kind === 'pinch' && event.touches.length >= 2) {
      event.preventDefault();
      event.stopPropagation();
      const scale =
        (getTouchDistance(event.touches) / gesture.startDistance) *
        gesture.startScale;
      const center = localTouchCenter(event.touches);

      setLiveView(scale, {
        x: center.x - gesture.contentPoint.x * scale,
        y: center.y - gesture.contentPoint.y * scale,
      });
      return;
    }

    if (gesture.kind === 'pan' && event.touches.length === 1) {
      const touch = Array.from(event.touches).find(
        (candidate) => candidate.identifier === gesture.touchId
      );

      if (!touch) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setLiveView(liveScaleRef.current, {
        x: gesture.originX + touch.clientX - gesture.startX,
        y: gesture.originY + touch.clientY - gesture.startY,
      });
    }
  });

  const handleTouchEnd = useEffectEvent((event: TouchEvent) => {
    lastTouchInteractionAtRef.current = performance.now();
    const doubleTapPoint = touchDoubleTapRecognizer.end(
      Array.from(event.changedTouches),
      performance.now()
    );

    if (doubleTapPoint) {
      event.preventDefault();
      event.stopPropagation();
      zoomOneStepAtPoint(
        localPoint(doubleTapPoint.clientX, doubleTapPoint.clientY)
      );
    }

    const gesture = gestureRef.current;

    if (gesture.kind === 'pinch' && event.touches.length === 1) {
      if (isZoomedRef.current) {
        beginPan(event.touches[0]);
      } else {
        resetLiveView(true);
      }
      return;
    }

    if (event.touches.length === 0) {
      gestureRef.current = { kind: 'idle' };

      if (!isZoomedRef.current) {
        resetLiveView(true);
      }
    }
  });

  const handleTouchCancel = useEffectEvent(() => {
    touchDoubleTapRecognizer.reset();
    gestureRef.current = { kind: 'idle' };

    if (!isZoomedRef.current) {
      resetLiveView(true);
    }
  });

  const handleWheel = useEffectEvent((event: WheelEvent) => {
    if (!active || event.deltaY === 0) {
      return;
    }

    const isZoomingIn = event.deltaY < 0;

    if (!isZoomingIn && !isPresentedRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (isZoomingIn && !isPresentedRef.current) {
      enterPresentation();
      return;
    }

    if (!isZoomingIn && liveScaleRef.current <= 1) {
      resetLiveView(true);
      return;
    }

    if (
      isZoomingIn &&
      performance.now() - presentationEnteredAtRef.current <
        PRESENTATION_EXPANSION_DURATION_MS
    ) {
      return;
    }

    contentRef.current?.style.setProperty('transition', 'none');
    const deltaMultiplier =
      event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? (surfaceRef.current?.clientHeight ?? 1)
          : 1;
    const nextScale = normalizeScale(
      liveScaleRef.current *
        Math.exp(-event.deltaY * deltaMultiplier * WHEEL_ZOOM_SENSITIVITY)
    );

    zoomAtPoint(nextScale, localPoint(event.clientX, event.clientY));
  });

  const handlePointerDown = useEffectEvent((event: PointerEvent) => {
    if (
      !active ||
      event.pointerType === 'touch' ||
      event.button !== 0 ||
      liveScaleRef.current <= 1
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    contentRef.current?.style.setProperty('transition', 'none');
    const offset = liveOffsetRef.current;

    surfaceRef.current?.setPointerCapture(event.pointerId);
    pointerDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
      dragging: true,
    };
    setIsPointerDragging(true);
  });

  const handlePointerMove = useEffectEvent((event: PointerEvent) => {
    const drag = pointerDragRef.current;

    if (!drag.dragging || drag.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setLiveView(liveScaleRef.current, {
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
    });
  });

  const handlePointerEnd = useEffectEvent((event: PointerEvent) => {
    if (pointerDragRef.current.pointerId !== event.pointerId) {
      return;
    }

    pointerDragRef.current.dragging = false;
    setIsPointerDragging(false);

    if (surfaceRef.current?.hasPointerCapture(event.pointerId)) {
      surfaceRef.current.releasePointerCapture(event.pointerId);
    }
  });

  const handleDoubleClick = useEffectEvent((event: MouseEvent) => {
    if (
      !active ||
      performance.now() - lastTouchInteractionAtRef.current <=
        DOUBLE_TAP_MAX_DELAY_MS
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (!isPresentedRef.current) {
      enterPresentation();
    }
  });

  const handleReset = useEffectEvent(() => {
    touchDoubleTapRecognizer.reset();
    resetLiveView(true);
  });

  const handleKeyboardZoomIn = useEffectEvent(() => {
    if (!active) {
      return;
    }

    if (!isPresentedRef.current) {
      enterPresentation();
      return;
    }

    if (
      performance.now() - presentationEnteredAtRef.current <
      PRESENTATION_EXPANSION_DURATION_MS
    ) {
      return;
    }

    contentRef.current?.style.setProperty('transition', 'none');
    const nextScale = normalizeScale(
      liveScaleRef.current * ZOOM_STEP_SCALE
    );

    zoomAtPoint(nextScale, { x: 0, y: 0 });
  });

  useEffect(() => {
    const surface = surfaceRef.current;

    if (!surface) {
      return;
    }

    const listenerOptions: AddEventListenerOptions = { passive: false };

    surface.addEventListener('touchstart', handleTouchStart, listenerOptions);
    surface.addEventListener('touchmove', handleTouchMove, listenerOptions);
    surface.addEventListener('touchend', handleTouchEnd, listenerOptions);
    surface.addEventListener('touchcancel', handleTouchCancel, listenerOptions);
    surface.addEventListener('wheel', handleWheel, listenerOptions);
    surface.addEventListener('dblclick', handleDoubleClick);
    surface.addEventListener('pointerdown', handlePointerDown);
    surface.addEventListener('pointermove', handlePointerMove);
    surface.addEventListener('pointerup', handlePointerEnd);
    surface.addEventListener('pointercancel', handlePointerEnd);
    surface.addEventListener(INLINE_MEDIA_RESET_EVENT, handleReset);
    surface.addEventListener(INLINE_MEDIA_ZOOM_IN_EVENT, handleKeyboardZoomIn);

    return () => {
      surface.removeEventListener('touchstart', handleTouchStart);
      surface.removeEventListener('touchmove', handleTouchMove);
      surface.removeEventListener('touchend', handleTouchEnd);
      surface.removeEventListener('touchcancel', handleTouchCancel);
      surface.removeEventListener('wheel', handleWheel);
      surface.removeEventListener('dblclick', handleDoubleClick);
      surface.removeEventListener('pointerdown', handlePointerDown);
      surface.removeEventListener('pointermove', handlePointerMove);
      surface.removeEventListener('pointerup', handlePointerEnd);
      surface.removeEventListener('pointercancel', handlePointerEnd);
      surface.removeEventListener(INLINE_MEDIA_RESET_EVENT, handleReset);
      surface.removeEventListener(
        INLINE_MEDIA_ZOOM_IN_EVENT,
        handleKeyboardZoomIn
      );
    };
  }, []);

  return {
    contentRef,
    isPresented,
    isZoomed,
    isPointerDragging,
    surfaceRef,
  };
}
