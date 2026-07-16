'use client';

import {
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { gsap } from 'gsap';
import { faArrowDown } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  NAVIGATION_DOT_RADIUS,
  NAVIGATION_RING_STROKE,
  NavigationRenderState,
  TrackedNavigationController,
  getNavigationRingRadius,
  getNavigationScale,
} from './navigationMotion';

type SectionNavigationSide = 'left' | 'right';
type SectionNavigationAxis = 'horizontal' | 'vertical';

export type SectionNavigationItem = {
  id: string;
  title: string;
  color: string;
  hasSlides: boolean;
  pending: boolean;
};

export type SectionNavigationHandle = {
  cancel: () => void;
  click: (index: number, side?: SectionNavigationSide) => boolean;
  getPinnedIndex: () => number | null;
  pin: (
    index: number,
    axis: SectionNavigationAxis,
    sourceLinked?: boolean,
  ) => void;
  preview: (index: number, previewed: boolean) => void;
  settle: (axis: SectionNavigationAxis) => void;
  syncSourcePosition: () => void;
};

type SectionNavigationView = {
  ring: SVGCircleElement | null;
  itemGroups: Array<SVGGElement | null>;
  arrowGroups: Array<SVGGElement | null>;
  dots: Array<SVGCircleElement | null>;
  buttons: Array<HTMLButtonElement | null>;
  tooltip: HTMLDivElement | null;
  tooltipText: HTMLSpanElement | null;
};

type AffordanceOpacityMotion = {
  element: SVGElement;
  setter: ReturnType<typeof gsap.quickTo>;
  target: number;
};

type AffordanceOpacityMotions = {
  arrows: Array<AffordanceOpacityMotion | null>;
  dots: Array<AffordanceOpacityMotion | null>;
};

const SVG_WIDTH = 52;
const SVG_CENTER_X = SVG_WIDTH / 2;
const ARROW_SIZE = 16;
const AFFORDANCE_CROSSFADE_DURATION = 0.3;
const TOOLTIP_DURATION = 0.15;

function getIconPaths(icon: IconDefinition) {
  const [width, height, , , pathData] = icon.icon;

  return {
    height,
    paths: Array.isArray(pathData) ? pathData : [pathData],
    width,
  };
}

function SvgIcon({
  icon,
  centerX,
  centerY,
  size,
}: {
  icon: IconDefinition;
  centerX: number;
  centerY: number;
  size: number;
}) {
  const { width, height, paths } = getIconPaths(icon);
  const scale = size / Math.max(width, height);
  const renderedWidth = width * scale;
  const renderedHeight = height * scale;

  return (
    <g
      transform={`translate(${centerX - renderedWidth / 2} ${
        centerY - renderedHeight / 2
      }) scale(${scale})`}
    >
      {paths.map((path, index) => (
        <path key={index} d={path} fill="currentColor" />
      ))}
    </g>
  );
}

function getArrowRotationAtIndex(
  itemIndex: number,
  activeIndex: number,
  side: SectionNavigationSide,
  hasSlides: boolean,
) {
  const direction = side === 'left' ? 1 : -1;

  if (itemIndex < activeIndex) {
    return 180 * direction;
  }

  if (itemIndex > activeIndex) {
    return 0;
  }

  return hasSlides ? 90 * direction : 0;
}

function getArrowRotation(
  itemIndex: number,
  sourcePosition: number,
  side: SectionNavigationSide,
  items: SectionNavigationItem[],
) {
  const lowerIndex = Math.max(0, Math.floor(sourcePosition));
  const upperIndex = Math.min(items.length - 1, Math.ceil(sourcePosition));
  const progress = sourcePosition - lowerIndex;
  const lowerRotation = getArrowRotationAtIndex(
    itemIndex,
    lowerIndex,
    side,
    items[lowerIndex]?.hasSlides ?? false,
  );
  const upperRotation = getArrowRotationAtIndex(
    itemIndex,
    upperIndex,
    side,
    items[upperIndex]?.hasSlides ?? false,
  );

  return gsap.utils.interpolate(lowerRotation, upperRotation, progress);
}

function getAffordanceOpacity(activation: number) {
  const clampedActivation = Math.max(0, Math.min(1, activation));

  return {
    arrowOpacity: 1 - clampedActivation,
    dotOpacity: clampedActivation,
  };
}

function getItemBounds(centers: number[], height: number, index: number) {
  const top = index === 0 ? 0 : (centers[index - 1] + centers[index]) / 2;
  const bottom =
    index === centers.length - 1
      ? height
      : (centers[index] + centers[index + 1]) / 2;

  return { top, height: Math.max(0, bottom - top) };
}

export function SectionNavigation({
  controllerRef,
  sourceRef,
  menuTitleRefs,
  items,
  activeIndex,
  hovered,
  hideRightRail,
  modalLayerActive,
  modalPresentationActive,
  canMoveHorizontally,
  previousSlideTitle,
  nextSlideTitle,
  onHoveredChange,
  onHorizontalNavigate,
  onVerticalNavigate,
}: {
  controllerRef: MutableRefObject<SectionNavigationHandle | null>;
  sourceRef: MutableRefObject<HTMLDivElement | null>;
  menuTitleRefs: MutableRefObject<Array<HTMLSpanElement | null>>;
  items: SectionNavigationItem[];
  activeIndex: number;
  hovered: boolean;
  hideRightRail: boolean;
  modalLayerActive: boolean;
  modalPresentationActive: boolean;
  canMoveHorizontally: boolean;
  previousSlideTitle: string;
  nextSlideTitle: string;
  onHoveredChange: (hovered: boolean) => void;
  onHorizontalNavigate: (side: SectionNavigationSide) => void;
  onVerticalNavigate: (itemIndex: number, sourceLinked: boolean) => void;
}) {
  const [geometry, setGeometry] = useState({
    centers: items.map((_, index) => 120 + index * 60),
    height: 1,
  });
  const viewsRef = useRef<Record<SectionNavigationSide, SectionNavigationView>>(
    {
      left: {
        ring: null,
        itemGroups: [],
        arrowGroups: [],
        dots: [],
        buttons: [],
        tooltip: null,
        tooltipText: null,
      },
      right: {
        ring: null,
        itemGroups: [],
        arrowGroups: [],
        dots: [],
        buttons: [],
        tooltip: null,
        tooltipText: null,
      },
    },
  );
  const navigationControllerRef = useRef<TrackedNavigationController | null>(
    null,
  );
  const affordanceOpacityMotionsRef = useRef<
    Record<SectionNavigationSide, AffordanceOpacityMotions>
  >({
    left: { arrows: [], dots: [] },
    right: { arrows: [], dots: [] },
  });
  const reducedMotionRef = useRef(false);
  const sourcePositionRef = useRef(activeIndex);
  const pointerOwnerRef = useRef<SectionNavigationSide | null>(null);
  const previewIndexRef = useRef<number | null>(null);
  const pinnedAxisRef = useRef<SectionNavigationAxis | null>(null);
  const pinnedIndexRef = useRef<number | null>(null);
  const tooltipsSuppressedRef = useRef(false);
  const pointerFrameRef = useRef<number | null>(null);
  const pendingPointerYRef = useRef<number | null>(null);
  const scrollEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const latestRenderRef = useRef<NavigationRenderState | null>(null);
  const geometryRef = useRef(geometry);
  const activeIndexRef = useRef(activeIndex);
  const hoveredRef = useRef(hovered);
  const modalPresentationActiveRef = useRef(modalPresentationActive);
  const itemsRef = useRef(items);

  activeIndexRef.current = activeIndex;
  geometryRef.current = geometry;
  hoveredRef.current = hovered;
  modalPresentationActiveRef.current = modalPresentationActive;
  itemsRef.current = items;

  const setAffordanceOpacity = (
    side: SectionNavigationSide,
    kind: keyof AffordanceOpacityMotions,
    itemIndex: number,
    target: number,
  ) => {
    const view = viewsRef.current[side];
    const element =
      kind === 'arrows' ? view.arrowGroups[itemIndex] : view.dots[itemIndex];

    if (!element) {
      return;
    }

    const motions = affordanceOpacityMotionsRef.current[side][kind];
    let motion = motions[itemIndex];

    if (!motion || motion.element !== element) {
      if (motion) {
        gsap.killTweensOf(motion.element);
      }

      gsap.set(element, { opacity: target });
      motion = {
        element,
        setter: gsap.quickTo(element, 'opacity', {
          duration: reducedMotionRef.current
            ? 0
            : AFFORDANCE_CROSSFADE_DURATION,
          ease: 'power1.out',
        }),
        target,
      };
      motions[itemIndex] = motion;
      return;
    }

    if (Math.abs(motion.target - target) < 0.001) {
      return;
    }

    motion.target = target;
    motion.setter(target);
  };

  const setTooltipVisibility = (
    side: SectionNavigationSide,
    visible: boolean,
  ) => {
    const tooltip = viewsRef.current[side].tooltip;

    if (!tooltip) {
      return;
    }

    gsap.to(tooltip, {
      autoAlpha: visible ? 1 : 0,
      x: visible ? 0 : side === 'left' ? -4 : 4,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : TOOLTIP_DURATION,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  };

  const hideTooltips = () => {
    setTooltipVisibility('left', false);
    setTooltipVisibility('right', false);
  };

  const getAffordanceLayers = (itemIndex: number) => {
    const sourcePosition = sourcePositionRef.current;
    const currentItems = itemsRef.current;
    const item = currentItems[itemIndex];
    const lowerIndex = Math.max(0, Math.floor(sourcePosition));
    const upperIndex = Math.min(
      currentItems.length - 1,
      Math.ceil(sourcePosition),
    );
    const progress = sourcePosition - lowerIndex;
    const directDotTransition =
      lowerIndex !== upperIndex &&
      !currentItems[lowerIndex]?.hasSlides &&
      !currentItems[upperIndex]?.hasSlides;

    if (item?.pending) {
      return { arrowOpacity: 1, dotOpacity: 0 };
    }

    if (
      itemIndex === pinnedIndexRef.current &&
      pinnedAxisRef.current === 'vertical'
    ) {
      return { arrowOpacity: 0, dotOpacity: 1 };
    }

    if (
      itemIndex === previewIndexRef.current &&
      itemIndex !== activeIndexRef.current
    ) {
      return { arrowOpacity: 0, dotOpacity: 1 };
    }

    if (pinnedAxisRef.current === 'vertical') {
      return { arrowOpacity: 1, dotOpacity: 0 };
    }

    if (!item?.hasSlides) {
      if (
        directDotTransition &&
        (itemIndex === lowerIndex || itemIndex === upperIndex)
      ) {
        return {
          arrowOpacity: 0,
          dotOpacity: itemIndex === lowerIndex ? 1 - progress : progress,
        };
      }

      return getAffordanceOpacity(
        Math.max(0, 1 - Math.abs(sourcePosition - itemIndex)),
      );
    }

    return { arrowOpacity: 1, dotOpacity: 0 };
  };

  const renderNavigation = (state: NavigationRenderState) => {
    latestRenderRef.current = state;
    const currentItems = itemsRef.current;
    const currentGeometry = geometryRef.current;

    (['left', 'right'] as const).forEach((side) => {
      const view = viewsRef.current[side];
      const ring = view.ring;

      if (ring) {
        const ringPressScale =
          state.pressedIndex !== null ? state.pressScale : 1;
        ring.setAttribute('cx', String(SVG_CENTER_X));
        ring.setAttribute('cy', String(state.coordinate));
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
        ring.dataset.navigationMode = state.mode;
        ring.dataset.navigationPosition = String(state.position);
      }

      currentItems.forEach((item, itemIndex) => {
        const itemGroup = view.itemGroups[itemIndex];
        const arrowGroup = view.arrowGroups[itemIndex];
        const dot = view.dots[itemIndex];
        const centerY = currentGeometry.centers[itemIndex] ?? 0;
        const activeScale =
          itemIndex === state.activeIndex
            ? getNavigationScale(state.position, state.activeIndex)
            : 1;
        const pressScale =
          state.pressedIndex === itemIndex ? state.pressScale : 1;
        const visualScale = activeScale * pressScale;
        const { arrowOpacity, dotOpacity } = getAffordanceLayers(itemIndex);
        const rotation = getArrowRotation(
          itemIndex,
          sourcePositionRef.current,
          side,
          currentItems,
        );
        const concealed =
          modalPresentationActiveRef.current &&
          itemIndex !== activeIndexRef.current;
        const dimmed =
          !hoveredRef.current && itemIndex !== activeIndexRef.current;

        itemGroup?.setAttribute(
          'opacity',
          concealed ? '0' : dimmed ? '0.5' : '1',
        );
        arrowGroup?.setAttribute(
          'transform',
          `translate(${SVG_CENTER_X} ${centerY}) rotate(${rotation}) scale(${visualScale}) translate(${-SVG_CENTER_X} ${-centerY})`,
        );
        setAffordanceOpacity(side, 'arrows', itemIndex, arrowOpacity);

        if (dot) {
          dot.setAttribute('cy', String(centerY));
          dot.setAttribute('r', String(NAVIGATION_DOT_RADIUS * visualScale));
          setAffordanceOpacity(side, 'dots', itemIndex, dotOpacity);
        }
      });

      if (view.tooltip) {
        view.tooltip.style.top = `${state.coordinate}px`;
        view.tooltip.style.backgroundColor = state.color;
      }
    });
  };

  useLayoutEffect(() => {
    const source = sourceRef.current;
    const titles = menuTitleRefs.current.filter(
      (title): title is HTMLSpanElement => Boolean(title),
    );

    if (!source || titles.length === 0) {
      return;
    }

    const measure = () => {
      const titleCenters = titles.map((title) => {
        const rect = title.getBoundingClientRect();

        return rect.top + source.scrollTop + rect.height / 2;
      });
      const fallbackStep = 60;
      const step =
        titleCenters.length > 1
          ? (titleCenters[titleCenters.length - 1] - titleCenters[0]) /
            (titleCenters.length - 1)
          : fallbackStep;
      const centers = [titleCenters[0] - step, ...titleCenters];

      setGeometry({ centers, height: source.clientHeight });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(source);
    titles.forEach((title) => observer.observe(title));

    return () => observer.disconnect();
  }, [menuTitleRefs, sourceRef]);

  useLayoutEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const controller = new TrackedNavigationController({
      geometry: {
        centers: geometry.centers,
        colors: items.map((item) => item.color),
      },
      activeIndex,
      sourcePosition: activeIndex,
      reducedMotion: reducedMotionRef.current,
      onRender: renderNavigation,
    });
    navigationControllerRef.current = controller;

    return () => {
      controller.destroy();
      navigationControllerRef.current = null;
      (['left', 'right'] as const).forEach((side) => {
        const motions = affordanceOpacityMotionsRef.current[side];

        [...motions.arrows, ...motions.dots].forEach((motion) => {
          if (motion) {
            gsap.killTweensOf(motion.element);
          }
        });
        motions.arrows = [];
        motions.dots = [];
      });
    };
  }, []);

  useLayoutEffect(() => {
    const controller = navigationControllerRef.current;

    if (!controller) {
      return;
    }

    controller.updateGeometry(
      { centers: geometry.centers, colors: items.map((item) => item.color) },
      true,
    );
    controller.setActiveIndex(activeIndex);
  }, [activeIndex, geometry, hovered, items, modalPresentationActive]);

  const syncSourcePosition = () => {
    const source = sourceRef.current;
    const controller = navigationControllerRef.current;

    if (!source || !controller) {
      return;
    }

    const position = source.scrollTop / Math.max(source.clientHeight, 1);
    sourcePositionRef.current = position;
    controller.setSourcePosition(position, true);
  };

  useEffect(() => {
    const source = sourceRef.current;
    const controller = navigationControllerRef.current;

    if (!source || !controller) {
      return;
    }

    const settle = () => {
      controller.setSnappingEnabled(true);
      const pinnedIndex = pinnedIndexRef.current;

      if (
        pinnedIndex !== null &&
        pinnedAxisRef.current === 'vertical' &&
        Math.abs(source.scrollTop - source.clientHeight * pinnedIndex) <= 1
      ) {
        controller.completePin(pinnedIndex);
        pinnedIndexRef.current = null;
        pinnedAxisRef.current = null;
        tooltipsSuppressedRef.current = false;
      }

      const pointerCoordinate = controller.getPointerCoordinate();

      if (controller.isPointerArmed() && pointerCoordinate !== null) {
        controller.trackPointer(pointerCoordinate, true);
      }
    };
    const handleScroll = () => {
      controller.setSnappingEnabled(false);
      hideTooltips();
      syncSourcePosition();

      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
      }
      scrollEndTimeoutRef.current = setTimeout(settle, 120);
    };

    syncSourcePosition();
    source.addEventListener('scroll', handleScroll, { passive: true });
    source.addEventListener('scrollend', settle);

    return () => {
      source.removeEventListener('scroll', handleScroll);
      source.removeEventListener('scrollend', settle);
      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
      }
    };
  }, [sourceRef]);

  useLayoutEffect(() => {
    const handle: SectionNavigationHandle = {
      cancel: () => {
        pinnedIndexRef.current = null;
        pinnedAxisRef.current = null;
        tooltipsSuppressedRef.current = false;
        navigationControllerRef.current?.cancelPin();
      },
      click: (index, side = 'left') => {
        const button = viewsRef.current[side].buttons[index];

        if (!button) {
          return false;
        }

        button.click();
        return true;
      },
      getPinnedIndex: () => pinnedIndexRef.current,
      pin: (index, axis, sourceLinked = false) => {
        pinnedIndexRef.current = index;
        pinnedAxisRef.current = axis;
        tooltipsSuppressedRef.current = true;
        hideTooltips();
        navigationControllerRef.current?.pin(index, sourceLinked);
      },
      preview: (index, previewed) => {
        if (pinnedIndexRef.current !== null) {
          return;
        }

        previewIndexRef.current = previewed ? index : null;
        if (previewed) {
          navigationControllerRef.current?.preview(index);
        } else {
          navigationControllerRef.current?.clearPreview(index, true);
        }
      },
      settle: (axis) => {
        const pinnedIndex = pinnedIndexRef.current;

        if (pinnedIndex === null || pinnedAxisRef.current !== axis) {
          return;
        }

        if (axis === 'vertical') {
          const source = sourceRef.current;

          if (
            !source ||
            Math.abs(source.scrollTop - source.clientHeight * pinnedIndex) > 1
          ) {
            return;
          }
        }

        navigationControllerRef.current?.completePin(pinnedIndex);
        pinnedIndexRef.current = null;
        pinnedAxisRef.current = null;
        tooltipsSuppressedRef.current = false;
      },
      syncSourcePosition,
    };
    controllerRef.current = handle;

    return () => {
      if (controllerRef.current === handle) {
        controllerRef.current = null;
      }
    };
  });

  const engagePointer = (side: SectionNavigationSide, clientY: number) => {
    pointerOwnerRef.current = side;
    onHoveredChange(true);
    hideTooltips();
    navigationControllerRef.current?.engagePointer(clientY);
  };

  const schedulePointer = (clientY: number) => {
    pendingPointerYRef.current = clientY;

    if (pointerFrameRef.current !== null) {
      return;
    }

    pointerFrameRef.current = requestAnimationFrame(() => {
      pointerFrameRef.current = null;
      const pointerY = pendingPointerYRef.current;

      if (pointerY !== null) {
        navigationControllerRef.current?.trackPointer(pointerY);
      }
    });
  };

  const releasePointer = (side: SectionNavigationSide) => {
    if (pointerOwnerRef.current !== side) {
      return;
    }

    pointerOwnerRef.current = null;
    pendingPointerYRef.current = null;
    previewIndexRef.current = null;
    onHoveredChange(false);
    hideTooltips();
    navigationControllerRef.current?.releasePointer(true);
  };

  const handlePointerRelease = (
    event: ReactPointerEvent<HTMLButtonElement>,
    index: number,
  ) => {
    navigationControllerRef.current?.release(index);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const renderRail = (side: SectionNavigationSide) => {
    const isHidden = side === 'right' && hideRightRail;
    const safeAreaMargin =
      side === 'left'
        ? { marginLeft: 'env(safe-area-inset-left)' }
        : { marginRight: 'env(safe-area-inset-right)' };
    const svgPosition = side === 'left' ? { left: 0 } : { right: 0 };

    return (
      <div
        key={side}
        data-portfolio-section-nav-zone={side}
        data-interactive-pop="off"
        className={`isolate ${
          isHidden ? 'invisible pointer-events-none' : ''
        }`}
        style={{
          ...safeAreaMargin,
          position: 'absolute',
          top: 0,
          [side === 'left' ? 'left' : 'right']: '1.5rem',
          width: '4.5rem',
          height: geometry.height,
          overflow: 'visible',
          zIndex: modalLayerActive ? 60 : 40,
        }}
        aria-hidden={isHidden ? true : undefined}
        inert={isHidden ? true : undefined}
        onPointerMove={(event) => {
          if (pointerOwnerRef.current === side) {
            schedulePointer(event.clientY);
          }
        }}
        onPointerLeave={() => releasePointer(side)}
        onPointerEnter={() => onHoveredChange(true)}
      >
        <svg
          className="pointer-events-none absolute top-0 overflow-visible"
          width={SVG_WIDTH}
          height={geometry.height}
          viewBox={`0 0 ${SVG_WIDTH} ${geometry.height}`}
          style={svgPosition}
          aria-hidden="true"
        >
          {items.map((item, itemIndex) => {
            const centerY = geometry.centers[itemIndex] ?? 0;
            return (
              <g
                key={item.id}
                data-portfolio-section-nav-visual-index={itemIndex}
                ref={(node) => {
                  viewsRef.current[side].itemGroups[itemIndex] = node;
                }}
                color={item.color}
              >
                <g
                  ref={(node) => {
                    viewsRef.current[side].arrowGroups[itemIndex] = node;
                  }}
                  style={{ filter: 'drop-shadow(1px 1px 0 black)' }}
                >
                  {item.pending ? (
                    <circle
                      cx={SVG_CENTER_X}
                      cy={centerY}
                      r={9}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      strokeDasharray="30 27"
                    >
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from={`0 ${SVG_CENTER_X} ${centerY}`}
                        to={`360 ${SVG_CENTER_X} ${centerY}`}
                        dur="0.8s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  ) : (
                    <SvgIcon
                      icon={faArrowDown}
                      centerX={SVG_CENTER_X}
                      centerY={centerY}
                      size={ARROW_SIZE}
                    />
                  )}
                </g>
                <circle
                  ref={(node) => {
                    viewsRef.current[side].dots[itemIndex] = node;
                  }}
                  cx={SVG_CENTER_X}
                  cy={centerY}
                  r={NAVIGATION_DOT_RADIUS}
                  fill="currentColor"
                  opacity={0}
                />
              </g>
            );
          })}
          <circle
            ref={(node) => {
              viewsRef.current[side].ring = node;
            }}
            data-portfolio-section-nav-ring={side}
            cx={SVG_CENTER_X}
            cy={geometry.centers[activeIndex] ?? 0}
            r={getNavigationRingRadius(1, NAVIGATION_RING_STROKE)}
            fill="none"
            stroke={items[activeIndex]?.color ?? 'white'}
            strokeWidth={NAVIGATION_RING_STROKE}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {items.map((item, itemIndex) => {
          const bounds = getItemBounds(
            geometry.centers,
            geometry.height,
            itemIndex,
          );
          const isActive = itemIndex === activeIndex;
          const hasHorizontalAction = isActive && canMoveHorizontally;
          const tooltipTitle = hasHorizontalAction
            ? side === 'left'
              ? previousSlideTitle
              : nextSlideTitle
            : item.title;
          const label = hasHorizontalAction
            ? side === 'left'
              ? 'Previous screen'
              : 'Next screen'
            : isActive
              ? `Current section: ${item.title}`
              : `Show ${item.title}`;
          const concealed = modalPresentationActive && !isActive;

          return (
            <button
              key={item.id}
              ref={(node) => {
                viewsRef.current[side].buttons[itemIndex] = node;
              }}
              type="button"
              className="absolute inset-x-0 cursor-pointer outline-none"
              style={{ top: bounds.top, height: bounds.height }}
              aria-label={label}
              aria-describedby={`portfolio-${side}-section-nav-tooltip`}
              aria-current={isActive ? 'page' : undefined}
              aria-busy={item.pending ? true : undefined}
              aria-hidden={concealed ? true : undefined}
              tabIndex={concealed ? -1 : undefined}
              data-portfolio-section-nav-index={itemIndex}
              data-portfolio-section-nav-side={side}
              onPointerEnter={(event) => {
                previewIndexRef.current = itemIndex;
                engagePointer(side, event.clientY);
                const tooltipText = viewsRef.current[side].tooltipText;

                if (tooltipText) {
                  tooltipText.textContent = tooltipTitle;
                }
                if (!tooltipsSuppressedRef.current) {
                  setTooltipVisibility(side, true);
                }
              }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture?.(event.pointerId);
                navigationControllerRef.current?.press(itemIndex);
                pinnedIndexRef.current = itemIndex;
                pinnedAxisRef.current = hasHorizontalAction
                  ? 'horizontal'
                  : 'vertical';
                tooltipsSuppressedRef.current = true;
                hideTooltips();
                navigationControllerRef.current?.pin(itemIndex);
              }}
              onPointerUp={(event) => handlePointerRelease(event, itemIndex)}
              onPointerCancel={(event) =>
                handlePointerRelease(event, itemIndex)
              }
              onFocus={() => {
                previewIndexRef.current = itemIndex;
                navigationControllerRef.current?.focus(itemIndex);
              }}
              onBlur={() => {
                previewIndexRef.current = null;
                navigationControllerRef.current?.blur(itemIndex);
                hideTooltips();
              }}
              onClick={(event) => {
                if (event.detail === 0) {
                  navigationControllerRef.current?.triggerPress(itemIndex);
                }

                if (hasHorizontalAction) {
                  pinnedIndexRef.current = itemIndex;
                  pinnedAxisRef.current = 'horizontal';
                  navigationControllerRef.current?.pin(itemIndex);
                  onHorizontalNavigate(side);
                  return;
                }

                if (!isActive) {
                  const sourceLinked = event.detail === 0;
                  pinnedIndexRef.current = itemIndex;
                  pinnedAxisRef.current = 'vertical';
                  navigationControllerRef.current?.pin(itemIndex, sourceLinked);
                  onVerticalNavigate(itemIndex, sourceLinked);
                } else {
                  pinnedIndexRef.current = null;
                  pinnedAxisRef.current = null;
                  tooltipsSuppressedRef.current = false;
                  navigationControllerRef.current?.completePin(itemIndex);
                }
              }}
            />
          );
        })}
        <div
          ref={(node) => {
            viewsRef.current[side].tooltip = node;
          }}
          id={`portfolio-${side}-section-nav-tooltip`}
          role="tooltip"
          className={`invisible pointer-events-none absolute z-30 -translate-y-1/2 whitespace-nowrap px-3 py-2 text-[0.6875rem] font-black uppercase leading-none tracking-[0.24em] opacity-0 ${
            side === 'left' ? 'left-[4rem]' : 'right-[4rem]'
          }`}
          style={{
            top: geometry.centers[activeIndex] ?? 0,
            backgroundColor:
              latestRenderRef.current?.color ?? items[activeIndex]?.color,
          }}
        >
          <span
            ref={(node) => {
              viewsRef.current[side].tooltipText = node;
            }}
            className="text-black"
          />
        </div>
      </div>
    );
  };

  return (
    <>
      {renderRail('left')}
      {renderRail('right')}
    </>
  );
}
