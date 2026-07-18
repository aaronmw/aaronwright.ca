'use client';

import {
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { gsap } from 'gsap';
import {
  TrackedNavigationController,
} from './navigationMotion';
import {
  getCenteredSectionCenters,
  getTitleLinkedSectionCenters,
  type SectionNavigationSide,
} from './navigationGeometry';
import {
  SectionNavigationRail,
  type SectionNavigationRailActions,
} from './SectionNavigationRail';
import { SectionNavigationRenderer } from './SectionNavigationRenderer';
import { NAVIGATION_RING_DIAMETER } from './navigationTokens';
import type {
  SectionNavigationAxis,
  SectionNavigationGeometryMode,
  SectionNavigationHandle,
  SectionNavigationItem,
  SectionNavigationProps,
  SectionNavigationView,
} from './sectionNavigationTypes';

export type {
  SectionNavigationGeometryMode,
  SectionNavigationHandle,
  SectionNavigationItem,
} from './sectionNavigationTypes';

type TooltipIntent = {
  itemIndex: number;
  side: SectionNavigationSide;
  title: string;
};

const TOOLTIP_DURATION = 0.15;
const TOOLTIP_ITEM_RADIUS = NAVIGATION_RING_DIAMETER / 2;
const POINTER_FOCUS_WINDOW_MS = 1000;

function syncNavigationSourcePosition(
  source: HTMLDivElement | null,
  controller: TrackedNavigationController | null,
  renderer: SectionNavigationRenderer | null,
  sourcePositionRef: MutableRefObject<number>,
  sourceUpdateRef: MutableRefObject<boolean>,
) {
  if (!source || !controller) {
    return;
  }

  const position = source.scrollTop / Math.max(source.clientHeight, 1);
  sourcePositionRef.current = position;
  sourceUpdateRef.current = true;
  const rendered = controller.setSourcePosition(position, true);
  sourceUpdateRef.current = false;

  if (!rendered) {
    renderer?.renderLatest(true);
  }
}

export function SectionNavigation({
  controllerRef,
  sourceRef,
  menuTitleRefs,
  items,
  activeIndex,
  hovered,
  geometryMode,
  hideRightRail,
  modalLayerActive,
  modalPresentationActive,
  canMoveHorizontally,
  previousSlideTitle,
  nextSlideTitle,
  onHoveredChange,
  onHorizontalNavigate,
  onVerticalNavigate,
}: SectionNavigationProps) {
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
  const rendererRef = useRef<SectionNavigationRenderer | null>(null);
  const reducedMotionRef = useRef(false);
  const sourcePositionRef = useRef(activeIndex);
  const pointerOwnerRef = useRef<SectionNavigationSide | null>(null);
  const previewIndexRef = useRef<number | null>(null);
  const pinnedAxisRef = useRef<SectionNavigationAxis | null>(null);
  const pinnedIndexRef = useRef<number | null>(null);
  const tooltipsSuppressedRef = useRef(false);
  const pointerTooltipIntentRef = useRef<TooltipIntent | null>(null);
  const focusTooltipIntentRef = useRef<TooltipIntent | null>(null);
  const pointerFocusIntentRef = useRef<{
    createdAt: number;
    itemIndex: number;
    side: SectionNavigationSide;
  } | null>(null);
  const tooltipVisibleRef = useRef<Record<SectionNavigationSide, boolean>>({
    left: false,
    right: false,
  });
  const pointerFrameRef = useRef<number | null>(null);
  const pendingPointerYRef = useRef<number | null>(null);
  const scrollEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const sourceUpdateRef = useRef(false);
  const geometryRef = useRef(geometry);
  const activeIndexRef = useRef(activeIndex);
  const hoveredRef = useRef(hovered);
  const modalPresentationActiveRef = useRef(modalPresentationActive);
  const itemsRef = useRef(items);

  useLayoutEffect(() => {
    activeIndexRef.current = activeIndex;
    geometryRef.current = geometry;
    hoveredRef.current = hovered;
    modalPresentationActiveRef.current = modalPresentationActive;
    itemsRef.current = items;
  }, [activeIndex, geometry, hovered, items, modalPresentationActive]);

  const setTooltipVisibility = (
    side: SectionNavigationSide,
    visible: boolean,
  ) => {
    const tooltip = viewsRef.current[side].tooltip;

    if (!tooltip) {
      return;
    }

    if (tooltipVisibleRef.current[side] === visible) {
      return;
    }

    tooltipVisibleRef.current[side] = visible;
    gsap.killTweensOf(tooltip);

    if (visible) {
      gsap.set(tooltip, { visibility: 'visible' });
    }

    gsap.to(tooltip, {
      opacity: visible ? 1 : 0,
      x: visible ? 0 : side === 'left' ? -4 : 4,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : TOOLTIP_DURATION,
      ease: 'power2.out',
      overwrite: true,
      onComplete: () => {
        if (!tooltipVisibleRef.current[side]) {
          gsap.set(tooltip, { visibility: 'hidden' });
        }
      },
    });
  };

  const hideTooltips = () => {
    setTooltipVisibility('left', false);
    setTooltipVisibility('right', false);
  };

  const setTooltipCoordinate = (
    side: SectionNavigationSide,
    coordinate: number,
  ) => {
    const tooltip = viewsRef.current[side].tooltip;

    if (tooltip) {
      tooltip.style.top = `${coordinate}px`;
    }
  };

  const showTooltip = (
    side: SectionNavigationSide,
    title: string,
    pointerCoordinate?: number,
  ) => {
    const tooltipText = viewsRef.current[side].tooltipText;

    if (tooltipText) {
      tooltipText.textContent = title;
    }

    if (tooltipsSuppressedRef.current) {
      return;
    }

    setTooltipVisibility(side === 'left' ? 'right' : 'left', false);
    rendererRef.current?.syncTooltip(side);
    if (pointerCoordinate !== undefined) {
      setTooltipCoordinate(side, pointerCoordinate);
    }
    setTooltipVisibility(side, true);
  };

  const restoreTooltip = () => {
    if (tooltipsSuppressedRef.current) {
      return;
    }

    const intent = pointerOwnerRef.current
      ? pointerTooltipIntentRef.current
      : focusTooltipIntentRef.current;

    if (!intent) {
      hideTooltips();
      return;
    }

    const pointerCoordinate =
      intent === pointerTooltipIntentRef.current
        ? navigationControllerRef.current?.getPointerCoordinate()
        : null;
    showTooltip(
      intent.side,
      intent.title,
      pointerCoordinate ?? undefined,
    );
  };

  const suppressTooltips = () => {
    tooltipsSuppressedRef.current = true;
    hideTooltips();
  };

  const releaseTooltipSuppression = () => {
    tooltipsSuppressedRef.current = false;
    restoreTooltip();
  };

  useLayoutEffect(() => {
    const source = sourceRef.current;
    const titles = menuTitleRefs.current.filter(
      (title): title is HTMLSpanElement => Boolean(title),
    );

    if (!source || (geometryMode !== 'centered' && titles.length === 0)) {
      return;
    }

    const measure = () => {
      const height = source.clientHeight;

      if (geometryMode === 'centered') {
        setGeometry({
          centers: getCenteredSectionCenters(items.length, height),
          height,
        });
        return;
      }

      const titleCenters = titles.map((title) => {
        const rect = title.getBoundingClientRect();

        return rect.top + source.scrollTop + rect.height / 2;
      });
      setGeometry({
        centers: getTitleLinkedSectionCenters(titleCenters),
        height,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(source);
    titles.forEach((title) => observer.observe(title));

    return () => observer.disconnect();
  }, [geometryMode, items.length, menuTitleRefs, sourceRef]);

  useLayoutEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const renderer = new SectionNavigationRenderer({
      views: viewsRef.current,
      getContext: () => ({
        activeIndex: activeIndexRef.current,
        geometry: geometryRef.current,
        hovered: hoveredRef.current,
        items: itemsRef.current,
        modalPresentationActive: modalPresentationActiveRef.current,
        pinnedAxis: pinnedAxisRef.current,
        pinnedIndex: pinnedIndexRef.current,
        previewIndex: previewIndexRef.current,
        reducedMotion: reducedMotionRef.current,
        sourcePosition: sourcePositionRef.current,
      }),
      getTooltipCoordinate: (side) =>
        pointerOwnerRef.current === side &&
        pointerTooltipIntentRef.current?.side === side
          ? pendingPointerYRef.current
          : null,
      isTooltipVisible: (side) => tooltipVisibleRef.current[side],
    });
    rendererRef.current = renderer;
    const controller = new TrackedNavigationController({
      geometry: {
        centers: geometryRef.current.centers,
        colors: itemsRef.current.map((item) => item.color),
      },
      activeIndex: activeIndexRef.current,
      sourcePosition: sourcePositionRef.current,
      reducedMotion: reducedMotionRef.current,
      onRender: (state) => renderer.render(state, sourceUpdateRef.current),
    });
    navigationControllerRef.current = controller;

    return () => {
      controller.destroy();
      renderer.destroy();
      navigationControllerRef.current = null;
      rendererRef.current = null;
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
    syncNavigationSourcePosition(
      sourceRef.current,
      navigationControllerRef.current,
      rendererRef.current,
      sourcePositionRef,
      sourceUpdateRef,
    );
  };

  const hideTooltipsEvent = useEffectEvent(hideTooltips);
  const releaseTooltipSuppressionEvent = useEffectEvent(
    releaseTooltipSuppression,
  );
  const restoreTooltipEvent = useEffectEvent(restoreTooltip);

  useEffect(() => {
    const source = sourceRef.current;
    const controller = navigationControllerRef.current;

    if (!source || !controller) {
      return;
    }

    const syncSource = () =>
      syncNavigationSourcePosition(
        source,
        controller,
        rendererRef.current,
        sourcePositionRef,
        sourceUpdateRef,
      );

    const settle = () => {
      controller.setSnappingEnabled(true);
      const pinnedIndex = pinnedIndexRef.current;

      if (
        pinnedIndex !== null &&
        pinnedAxisRef.current === 'vertical' &&
        Math.abs(source.scrollTop - source.clientHeight * pinnedIndex) <= 1
      ) {
        pinnedIndexRef.current = null;
        pinnedAxisRef.current = null;
        controller.completePin(pinnedIndex);
        releaseTooltipSuppressionEvent();
      }

      const pointerCoordinate = controller.getPointerCoordinate();

      if (controller.isPointerArmed() && pointerCoordinate !== null) {
        controller.trackPointer(pointerCoordinate, true);
      }

      restoreTooltipEvent();
    };
    const handleScroll = () => {
      controller.setSnappingEnabled(false);
      hideTooltipsEvent();
      if (!source.hasAttribute('data-portfolio-programmatic-scroll')) {
        syncSource();
      }

      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
      }
      scrollEndTimeoutRef.current = setTimeout(settle, 120);
    };

    syncSource();
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
        releaseTooltipSuppression();
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
        suppressTooltips();
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

        pinnedIndexRef.current = null;
        pinnedAxisRef.current = null;
        navigationControllerRef.current?.completePin(pinnedIndex);
        releaseTooltipSuppression();
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
        const side = pointerOwnerRef.current;

        if (side && !tooltipsSuppressedRef.current) {
          setTooltipCoordinate(side, pointerY);
        }
      }
    });
  };

  const syncPointerTooltip = (
    side: SectionNavigationSide,
    clientY: number,
  ) => {
    const centers = geometryRef.current.centers;
    let nearestItemIndex = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;

    centers.forEach((center, itemIndex) => {
      const distance = Math.abs(center - clientY);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestItemIndex = itemIndex;
      }
    });

    if (
      nearestItemIndex < 0 ||
      nearestDistance > TOOLTIP_ITEM_RADIUS
    ) {
      pointerTooltipIntentRef.current = null;
      hideTooltips();
      return;
    }

    const isActive = nearestItemIndex === activeIndexRef.current;
    const title =
      isActive && canMoveHorizontally
        ? side === 'left'
          ? previousSlideTitle
          : nextSlideTitle
        : itemsRef.current[nearestItemIndex]?.title;

    if (!title) {
      pointerTooltipIntentRef.current = null;
      hideTooltips();
      return;
    }

    pointerTooltipIntentRef.current = {
      itemIndex: nearestItemIndex,
      side,
      title,
    };
    showTooltip(side, title, clientY);
  };

  const releasePointer = (side: SectionNavigationSide) => {
    if (pointerOwnerRef.current !== side) {
      return;
    }

    pointerOwnerRef.current = null;
    pendingPointerYRef.current = null;
    previewIndexRef.current = null;
    if (pointerTooltipIntentRef.current?.side === side) {
      pointerTooltipIntentRef.current = null;
    }
    onHoveredChange(false);
    hideTooltips();
    navigationControllerRef.current?.releasePointer(true);
    restoreTooltip();
  };

  const handlePointerRelease = (
    event: ReactPointerEvent<HTMLButtonElement>,
    index: number,
  ) => {
    navigationControllerRef.current?.release(index);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const restoreKeyboardFocus = (
    side: SectionNavigationSide,
    itemIndex: number,
  ) => {
    requestAnimationFrame(() => {
      viewsRef.current[side].buttons[itemIndex]?.focus({ preventScroll: true });
    });
  };

  const railActions: SectionNavigationRailActions = {
    onItemGroupRef: (side, itemIndex, node) => {
      viewsRef.current[side].itemGroups[itemIndex] = node;
    },
    onArrowGroupRef: (side, itemIndex, node) => {
      viewsRef.current[side].arrowGroups[itemIndex] = node;
    },
    onDotRef: (side, itemIndex, node) => {
      viewsRef.current[side].dots[itemIndex] = node;
    },
    onRingRef: (side, node) => {
      viewsRef.current[side].ring = node;
    },
    onButtonRef: (side, itemIndex, node) => {
      viewsRef.current[side].buttons[itemIndex] = node;
    },
    onZonePointerMove: (side, event) => {
      if (
        event.pointerType !== 'touch' &&
        pointerOwnerRef.current === side
      ) {
        schedulePointer(event.clientY);
        syncPointerTooltip(side, event.clientY);
      }
    },
    onZonePointerLeave: (side, event) => {
      if (event.pointerType !== 'touch') {
        releasePointer(side);
      }
    },
    onZonePointerEnter: (_side, event) => {
      if (event.pointerType !== 'touch') {
        onHoveredChange(true);
      }
    },
    onItemPointerEnter: (side, itemIndex, _tooltipTitle, event) => {
      if (event.pointerType === 'touch') {
        return;
      }

      previewIndexRef.current = itemIndex;
      engagePointer(side, event.clientY);
      syncPointerTooltip(side, event.clientY);
    },
    onItemPointerDown: (
      side,
      itemIndex,
      hasHorizontalAction,
      event,
    ) => {
      pointerFocusIntentRef.current = {
        createdAt: performance.now(),
        itemIndex,
        side,
      };
      focusTooltipIntentRef.current = null;
      pointerTooltipIntentRef.current = null;

      if (event.pointerType === 'touch') {
        pointerOwnerRef.current = null;
        pendingPointerYRef.current = null;
        previewIndexRef.current = null;
        pointerTooltipIntentRef.current = null;
        onHoveredChange(false);
        hideTooltips();
        navigationControllerRef.current?.releasePointer(false);
      }

      event.currentTarget.setPointerCapture?.(event.pointerId);
      navigationControllerRef.current?.press(itemIndex);
      pinnedIndexRef.current = itemIndex;
      pinnedAxisRef.current = hasHorizontalAction
        ? 'horizontal'
        : 'vertical';
      suppressTooltips();
      navigationControllerRef.current?.pin(itemIndex);
    },
    onItemPointerRelease: (itemIndex, event) => {
      handlePointerRelease(event, itemIndex);
    },
    onFocus: (side, itemIndex, tooltipTitle, event) => {
      const pointerFocusIntent = pointerFocusIntentRef.current;
      const isRecentPointerFocus = Boolean(
        pointerFocusIntent &&
          performance.now() - pointerFocusIntent.createdAt <=
            POINTER_FOCUS_WINDOW_MS,
      );

      if (
        pointerOwnerRef.current !== null ||
        (isRecentPointerFocus &&
          pointerFocusIntent?.side === side &&
          pointerFocusIntent.itemIndex === itemIndex)
      ) {
        pointerFocusIntentRef.current = null;
        focusTooltipIntentRef.current = null;
        return;
      }

      if (!event.currentTarget.matches(':focus-visible')) {
        focusTooltipIntentRef.current = null;
        return;
      }

      previewIndexRef.current = itemIndex;
      focusTooltipIntentRef.current = {
        itemIndex,
        side,
        title: tooltipTitle,
      };
      onHoveredChange(true);
      navigationControllerRef.current?.focus(itemIndex);
      showTooltip(side, tooltipTitle);
    },
    onBlur: (side, itemIndex) => {
      previewIndexRef.current = null;
      if (
        focusTooltipIntentRef.current?.side === side &&
        focusTooltipIntentRef.current.itemIndex === itemIndex
      ) {
        focusTooltipIntentRef.current = null;
      }
      if (pointerOwnerRef.current === null) {
        onHoveredChange(false);
      }
      navigationControllerRef.current?.blur(itemIndex);
      hideTooltips();
      restoreTooltip();
    },
    onClick: (side, itemIndex, event) => {
      const isActive = itemIndex === activeIndex;
      const hasHorizontalAction = isActive && canMoveHorizontally;

      if (event.detail === 0) {
        navigationControllerRef.current?.triggerPress(itemIndex);
      }

      if (hasHorizontalAction) {
        const sourceLinked = event.detail === 0;
        pinnedIndexRef.current = itemIndex;
        pinnedAxisRef.current = 'horizontal';
        navigationControllerRef.current?.pin(itemIndex);
        onHorizontalNavigate(side);
        if (sourceLinked) {
          restoreKeyboardFocus(side, itemIndex);
        }
        return;
      }

      if (!isActive) {
        const sourceLinked = event.detail === 0;
        pinnedIndexRef.current = itemIndex;
        pinnedAxisRef.current = 'vertical';
        navigationControllerRef.current?.pin(itemIndex, sourceLinked);
        onVerticalNavigate(itemIndex, sourceLinked);
        if (sourceLinked) {
          restoreKeyboardFocus(side, itemIndex);
        }
      } else {
        pinnedIndexRef.current = null;
        pinnedAxisRef.current = null;
        releaseTooltipSuppression();
        navigationControllerRef.current?.completePin(itemIndex);
      }
    },
    onTooltipRef: (side, node) => {
      viewsRef.current[side].tooltip = node;

      if (!node) {
        tooltipVisibleRef.current[side] = false;
      }
    },
    onTooltipTextRef: (side, node) => {
      viewsRef.current[side].tooltipText = node;
    },
  };

  const renderRail = (side: SectionNavigationSide) => {
    if (side === 'right' && hideRightRail) {
      return null;
    }

    return (
      <SectionNavigationRail
        key={side}
        actions={railActions}
        model={{
          activeIndex,
          canMoveHorizontally,
          geometry,
          items,
          latestColor: items[activeIndex]?.color,
          modalLayerActive,
          modalPresentationActive,
          nextSlideTitle,
          previousSlideTitle,
          side,
        }}
      />
    );
  };

  return (
    <>
      {renderRail('left')}
      {renderRail('right')}
    </>
  );
}
