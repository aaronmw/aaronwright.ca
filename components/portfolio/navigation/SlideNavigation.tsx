'use client';

import {
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { gsap } from 'gsap';
import {
  NAVIGATION_DOT_RADIUS,
  NAVIGATION_RETURN_DELAY,
  NAVIGATION_RING_STROKE,
  NAVIGATION_SLIDE_STEP,
  NavigationRenderState,
  TrackedNavigationController,
  getNavigationRingRadius,
  getNavigationScale,
} from './navigationMotion';

const INDICATOR_PAIR_STAGGER_MS = 90;
const INDICATOR_SIDE_LEAD_MS = 30;
const INDICATOR_TRANSITION_MS = 500;
const SVG_HEIGHT = 52;
const SVG_CENTER_Y = SVG_HEIGHT / 2;

export type SlideIndicatorMotionController = {
  begin: (targetIndex: number) => void;
  update: (position: number) => void;
  complete: (targetIndex: number) => void;
  cancel: () => void;
};

export type SlideNavigationItem = {
  id: string;
  label: string;
};

type IndicatorTransitionState = {
  previousCount: number;
  targetCount: number;
  phase: 'idle' | 'preparing' | 'fading' | 'settling';
};

type MotionTargetState = {
  index: number;
  itemsIdentity: string;
  sourceIndex: number;
};

function getIndicatorSlotIds(count: number) {
  return Array.from({ length: count }, (_, index) => {
    if (index === 0) {
      return 0;
    }

    return index % 2 === 1 ? Math.ceil(index / 2) : -(index / 2);
  }).sort((a, b) => a - b);
}

function getOutsideInDelay(index: number, count: number) {
  const distanceFromLeft = index;
  const distanceFromRight = count - index - 1;
  const pairIndex = Math.min(distanceFromLeft, distanceFromRight);
  const leftSideDelay =
    distanceFromLeft < distanceFromRight ? INDICATOR_SIDE_LEAD_MS : 0;

  return pairIndex * INDICATOR_PAIR_STAGGER_MS + leftSideDelay;
}

function getLongestDelay(
  count: number,
  getDelay: (index: number, count: number) => number,
) {
  return Math.max(
    0,
    ...Array.from({ length: count }, (_, index) => getDelay(index, count)),
  );
}

function getSlotCoordinate(
  slotId: number,
  count: number,
  surfaceWidth: number,
) {
  return (
    getLatticeCoordinate(count, surfaceWidth) + slotId * NAVIGATION_SLIDE_STEP
  );
}

function getLatticeCoordinate(count: number, surfaceWidth: number) {
  const parityOffset =
    count > 0 && count % 2 === 0 ? -NAVIGATION_SLIDE_STEP / 2 : 0;

  return surfaceWidth / 2 + parityOffset;
}

function getCenters(count: number, surfaceWidth: number) {
  return getIndicatorSlotIds(count).map((slotId) =>
    getSlotCoordinate(slotId, count, surfaceWidth),
  );
}

export function SlideNavigation({
  controllerRef,
  items,
  activeIndex,
  pendingIndex,
  color,
  onSelect,
}: {
  controllerRef: MutableRefObject<SlideIndicatorMotionController | null>;
  items: SlideNavigationItem[];
  activeIndex: number;
  pendingIndex: number | null;
  color: string;
  onSelect: (index: number) => void;
}) {
  const visibleItems = items.length > 1 ? items : [];
  const targetCount = visibleItems.length;
  const boundedActiveIndex = Math.max(
    0,
    Math.min(activeIndex, Math.max(targetCount - 1, 0)),
  );
  const itemsIdentity = visibleItems.map((item) => item.id).join('|');
  const previousCountRef = useRef(targetCount);
  const transitionFrameRef = useRef<number | null>(null);
  const transitionStartFrameRef = useRef<number | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const svgRef = useRef<SVGSVGElement | null>(null);
  const ringRef = useRef<SVGCircleElement | null>(null);
  const latticeRef = useRef<SVGGElement | null>(null);
  const dotRefs = useRef(new Map<number, SVGCircleElement>());
  const slotRefs = useRef(new Map<number, SVGGElement>());
  const pointerFrameRef = useRef<number | null>(null);
  const pendingPointerXRef = useRef<number | null>(null);
  const pointerPinnedIndexRef = useRef<number | null>(null);
  const controllerInstanceRef = useRef<TrackedNavigationController | null>(
    null,
  );
  const targetCountRef = useRef(targetCount);
  const boundedActiveIndexRef = useRef(boundedActiveIndex);
  const itemsIdentityRef = useRef(itemsIdentity);
  const [motionTarget, setMotionTarget] = useState<MotionTargetState | null>(
    null,
  );
  const [transitionState, setTransitionState] =
    useState<IndicatorTransitionState>({
      previousCount: targetCount,
      targetCount,
      phase: 'idle',
    });
  const surfaceCount =
    transitionState.phase === 'idle'
      ? transitionState.targetCount
      : Math.max(transitionState.previousCount, transitionState.targetCount);
  const surfaceWidth = Math.max(surfaceCount, 1) * NAVIGATION_SLIDE_STEP;
  const targetWidth = Math.max(targetCount, 1) * NAVIGATION_SLIDE_STEP;
  const surfaceLeft = (targetWidth - surfaceWidth) / 2;
  const previousSlotIds = getIndicatorSlotIds(
    transitionState.phase === 'idle'
      ? transitionState.targetCount
      : transitionState.previousCount,
  );
  const targetSlotIds = getIndicatorSlotIds(transitionState.targetCount);
  const renderedSlotIds =
    transitionState.phase === 'idle'
      ? targetSlotIds
      : Array.from(new Set([...previousSlotIds, ...targetSlotIds])).sort(
          (a, b) => a - b,
        );
  const geometryCount =
    transitionState.phase === 'preparing'
      ? transitionState.previousCount
      : transitionState.targetCount;
  const centers = useMemo(
    () => getCenters(geometryCount, surfaceWidth),
    [geometryCount, surfaceWidth],
  );
  const visualActiveIndex =
    motionTarget?.itemsIdentity === itemsIdentity &&
    motionTarget.sourceIndex === boundedActiveIndex
      ? motionTarget.index
      : boundedActiveIndex;
  targetCountRef.current = targetCount;

  useLayoutEffect(() => {
    boundedActiveIndexRef.current = boundedActiveIndex;
    itemsIdentityRef.current = itemsIdentity;
  }, [boundedActiveIndex, itemsIdentity]);

  const renderNavigation = (state: NavigationRenderState) => {
    const ring = ringRef.current;

    if (ring) {
      const ringPressScale = state.pressedIndex !== null ? state.pressScale : 1;
      ring.setAttribute('cx', String(state.coordinate));
      ring.setAttribute('cy', String(SVG_CENTER_Y));
      ring.setAttribute(
        'r',
        String(
          getNavigationRingRadius(
            state.ringScale * ringPressScale,
            state.strokeWidth,
          ),
        ),
      );
      ring.setAttribute('stroke', state.color);
      ring.setAttribute('stroke-width', String(state.strokeWidth));
      ring.setAttribute('opacity', targetCountRef.current > 0 ? '1' : '0');
      ring.dataset.navigationMode = state.mode;
      ring.dataset.navigationPosition = String(state.position);
    }

    dotRefs.current.forEach((dot, itemIndex) => {
      const activeScale =
        itemIndex === state.activeIndex
          ? getNavigationScale(state.position, state.activeIndex)
          : 1;
      const pressScale =
        state.pressedIndex === itemIndex ? state.pressScale : 1;

      dot.setAttribute(
        'r',
        String(NAVIGATION_DOT_RADIUS * activeScale * pressScale),
      );
    });
  };

  useLayoutEffect(() => {
    const controller = new TrackedNavigationController({
      geometry: { centers, colors: Array(targetCount).fill(color) },
      activeIndex: boundedActiveIndex,
      sourcePosition: boundedActiveIndex,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)')
        .matches,
      returnDelay: NAVIGATION_RETURN_DELAY,
      onRender: renderNavigation,
    });
    controllerInstanceRef.current = controller;

    const motionController: SlideIndicatorMotionController = {
      begin: (targetIndex) => {
        setMotionTarget({
          index: targetIndex,
          itemsIdentity: itemsIdentityRef.current,
          sourceIndex: boundedActiveIndexRef.current,
        });
        if (pointerPinnedIndexRef.current !== targetIndex) {
          controller.pin(targetIndex, true);
        }
      },
      update: (position) => controller.setSourcePosition(position, true),
      complete: (targetIndex) => {
        pointerPinnedIndexRef.current = null;
        controller.completePin(targetIndex);
      },
      cancel: () => {
        setMotionTarget(null);
        pointerPinnedIndexRef.current = null;
        controller.cancelPin();
      },
    };
    controllerRef.current = motionController;

    return () => {
      if (controllerRef.current === motionController) {
        controllerRef.current = null;
      }
      controller.destroy();
      controllerInstanceRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const controller = controllerInstanceRef.current;

    if (!controller) {
      return;
    }

    controller.updateGeometry(
      { centers, colors: Array(targetCount).fill(color) },
      transitionState.phase !== 'fading',
      INDICATOR_TRANSITION_MS / 1000,
    );
    controller.setActiveIndex(boundedActiveIndex);
    controller.setSourcePosition(boundedActiveIndex, false);
  }, [boundedActiveIndex, centers, color, targetCount, transitionState.phase]);

  useEffect(() => {
    const controller = controllerInstanceRef.current;

    if (!controller) {
      return;
    }

    controller.releasePointer(false);
    pointerPinnedIndexRef.current = null;
  }, [itemsIdentity]);

  useLayoutEffect(() => {
    const previousCount = previousCountRef.current;

    if (previousCount === targetCount) {
      return;
    }

    if (transitionFrameRef.current !== null) {
      cancelAnimationFrame(transitionFrameRef.current);
    }
    if (transitionStartFrameRef.current !== null) {
      cancelAnimationFrame(transitionStartFrameRef.current);
    }
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    previousCountRef.current = targetCount;
    setTransitionState({ previousCount, targetCount, phase: 'preparing' });
    transitionFrameRef.current = requestAnimationFrame(() => {
      transitionStartFrameRef.current = requestAnimationFrame(() => {
        transitionFrameRef.current = null;
        transitionStartFrameRef.current = null;
        setTransitionState({ previousCount, targetCount, phase: 'fading' });

        const longestStagger = Math.max(
          getLongestDelay(previousCount, getOutsideInDelay),
          getLongestDelay(targetCount, getOutsideInDelay),
        );

        transitionTimeoutRef.current = setTimeout(() => {
          setTransitionState({ previousCount, targetCount, phase: 'settling' });
          transitionTimeoutRef.current = setTimeout(() => {
            transitionTimeoutRef.current = null;
            setTransitionState({
              previousCount: targetCount,
              targetCount,
              phase: 'idle',
            });
          }, INDICATOR_TRANSITION_MS);
        }, INDICATOR_TRANSITION_MS + longestStagger);
      });
    });
  }, [targetCount]);

  useLayoutEffect(() => {
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const lattice = latticeRef.current;
    const previousLatticeCoordinate = getLatticeCoordinate(
      transitionState.previousCount,
      surfaceWidth,
    );
    const targetLatticeCoordinate = getLatticeCoordinate(
      transitionState.targetCount,
      surfaceWidth,
    );

    if (lattice) {
      if (transitionState.phase === 'preparing') {
        gsap.set(lattice, {
          attr: {
            transform: `translate(${previousLatticeCoordinate} 0)`,
          },
        });
      } else if (transitionState.phase === 'fading') {
        gsap.to(lattice, {
          attr: { transform: `translate(${targetLatticeCoordinate} 0)` },
          duration: reducedMotion ? 0 : INDICATOR_TRANSITION_MS / 1000,
          ease: 'expo.out',
          overwrite: 'auto',
        });
      } else if (transitionState.phase === 'idle') {
        gsap.set(lattice, {
          attr: { transform: `translate(${targetLatticeCoordinate} 0)` },
        });
      }
    }

    renderedSlotIds.forEach((slotId) => {
      const group = slotRefs.current.get(slotId);
      const previousIndex = previousSlotIds.indexOf(slotId);
      const targetIndex = targetSlotIds.indexOf(slotId);
      const isEntering = previousIndex < 0 && targetIndex >= 0;
      const isExiting = previousIndex >= 0 && targetIndex < 0;

      if (!group) {
        return;
      }

      if (transitionState.phase === 'preparing') {
        gsap.set(group, {
          opacity: previousIndex >= 0 ? 1 : 0,
        });
        return;
      }

      if (transitionState.phase === 'fading') {
        const delay =
          (isEntering
            ? getOutsideInDelay(targetIndex, transitionState.targetCount)
            : isExiting
              ? getOutsideInDelay(previousIndex, transitionState.previousCount)
              : 0) / 1000;

        gsap.to(group, {
          opacity: targetIndex >= 0 ? 1 : 0,
          delay: reducedMotion ? 0 : delay,
          duration: reducedMotion ? 0 : INDICATOR_TRANSITION_MS / 1000,
          ease: 'expo.out',
          overwrite: 'auto',
        });
        return;
      }

      if (transitionState.phase === 'idle') {
        gsap.set(group, {
          opacity: 1,
        });
      }
    });
  }, [
    previousSlotIds,
    renderedSlotIds,
    surfaceWidth,
    targetSlotIds,
    transitionState,
  ]);

  useEffect(
    () => () => {
      if (transitionFrameRef.current !== null) {
        cancelAnimationFrame(transitionFrameRef.current);
      }
      if (transitionStartFrameRef.current !== null) {
        cancelAnimationFrame(transitionStartFrameRef.current);
      }
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      if (pointerFrameRef.current !== null) {
        cancelAnimationFrame(pointerFrameRef.current);
      }
    },
    [],
  );

  const getLocalPointerX = (clientX: number) => {
    const svg = svgRef.current;

    return svg ? clientX - svg.getBoundingClientRect().left : clientX;
  };

  const schedulePointerTracking = (clientX: number) => {
    pendingPointerXRef.current = clientX;

    if (pointerFrameRef.current !== null) {
      return;
    }

    pointerFrameRef.current = requestAnimationFrame(() => {
      pointerFrameRef.current = null;
      const pointerX = pendingPointerXRef.current;

      if (pointerX !== null) {
        controllerInstanceRef.current?.trackPointer(getLocalPointerX(pointerX));
      }
    });
  };

  const handlePointerRelease = (
    event: ReactPointerEvent<HTMLButtonElement>,
    index: number,
  ) => {
    controllerInstanceRef.current?.release(index);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return (
    <div
      data-portfolio-slide-indicators
      data-interactive-pop="off"
      className="group/slide-nav pointer-events-auto relative h-[52px] overflow-visible"
      style={{ width: `${targetWidth}px` }}
      onPointerMove={(event) => {
        if (event.pointerType !== 'touch') {
          schedulePointerTracking(event.clientX);
        }
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'touch') {
          controllerInstanceRef.current?.releasePointer(true);
        }
      }}
    >
      <svg
        ref={svgRef}
        className="pointer-events-none absolute top-0 overflow-visible"
        width={surfaceWidth}
        height={SVG_HEIGHT}
        viewBox={`0 0 ${surfaceWidth} ${SVG_HEIGHT}`}
        style={{ left: `${surfaceLeft}px` }}
        aria-hidden="true"
      >
        <g ref={latticeRef}>
          {renderedSlotIds.map((slotId) => {
            const targetIndex = targetSlotIds.indexOf(slotId);

            return (
              <g
                key={slotId}
                ref={(node) => {
                  if (node) {
                    slotRefs.current.set(slotId, node);
                  } else {
                    slotRefs.current.delete(slotId);
                  }
                }}
                data-portfolio-slide-indicator-slot={slotId}
                transform={`translate(${slotId * NAVIGATION_SLIDE_STEP} 0)`}
              >
                <circle
                  ref={(node) => {
                    if (node && targetIndex >= 0) {
                      dotRefs.current.set(targetIndex, node);
                    } else if (targetIndex >= 0) {
                      dotRefs.current.delete(targetIndex);
                    }
                  }}
                  data-portfolio-slide-indicator-visual={
                    targetIndex >= 0 ? targetIndex : undefined
                  }
                  cx={0}
                  cy={SVG_CENTER_Y}
                  r={NAVIGATION_DOT_RADIUS}
                  fill="white"
                  className={`transition-opacity duration-200 ease-out motion-reduce:transition-none ${
                    targetIndex < 0 || targetIndex === visualActiveIndex
                      ? 'opacity-100'
                      : 'opacity-50 group-hover/slide-nav:opacity-100 group-focus-within/slide-nav:opacity-100'
                  }`}
                />
                {targetIndex >= 0 && pendingIndex === targetIndex ? (
                  <circle
                    cx={0}
                    cy={SVG_CENTER_Y}
                    r={7}
                    fill="none"
                    stroke="white"
                    strokeWidth={2}
                    strokeDasharray="20 24"
                    className="origin-center animate-spin"
                  />
                ) : null}
              </g>
            );
          })}
        </g>
        {/* The controller exclusively owns geometry and color during travel. */}
        <circle
          ref={ringRef}
          data-portfolio-slide-indicator-marker="true"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {visibleItems.map((item, index) => (
        <button
          key={item.id}
          type="button"
          className="pointer-events-auto absolute inset-y-0 cursor-pointer outline-none"
          style={{
            left: `${index * NAVIGATION_SLIDE_STEP}px`,
            width: `${NAVIGATION_SLIDE_STEP}px`,
          }}
          aria-label={item.label}
          aria-current={boundedActiveIndex === index ? 'true' : undefined}
          aria-busy={pendingIndex === index ? true : undefined}
          data-portfolio-slide-indicator-index={index}
          onPointerEnter={(event) => {
            if (event.pointerType === 'touch') {
              return;
            }

            const localX = getLocalPointerX(event.clientX);
            const controller = controllerInstanceRef.current;

            if (controller?.isPointerArmed()) {
              controller.trackPointer(localX);
            } else {
              controller?.engagePointer(localX);
            }
          }}
          onPointerDown={(event) => {
            if (event.pointerType === 'touch') {
              controllerInstanceRef.current?.releasePointer(false);
            }

            event.currentTarget.setPointerCapture?.(event.pointerId);
            pointerPinnedIndexRef.current = index;
            controllerInstanceRef.current?.pin(index);
            controllerInstanceRef.current?.press(index);
          }}
          onPointerUp={(event) => handlePointerRelease(event, index)}
          onPointerCancel={(event) => handlePointerRelease(event, index)}
          onKeyDown={(event) => {
            if (
              !event.repeat &&
              (event.key === 'Enter' || event.code === 'Space')
            ) {
              controllerInstanceRef.current?.press(index);
            }
          }}
          onKeyUp={(event) => {
            if (event.key === 'Enter' || event.code === 'Space') {
              controllerInstanceRef.current?.release(index);
            }
          }}
          onFocus={() => controllerInstanceRef.current?.focus(index)}
          onBlur={() => controllerInstanceRef.current?.blur(index)}
          onClick={(event) => {
            if (event.detail === 0) {
              controllerInstanceRef.current?.triggerPress(index);
            }
            onSelect(index);
          }}
        />
      ))}
    </div>
  );
}
