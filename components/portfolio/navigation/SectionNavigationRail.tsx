import type {
  FocusEvent,
  MouseEvent,
  PointerEvent,
} from 'react';
import { faArrowDown } from '@fortawesome/free-solid-svg-icons';
import {
  getSectionItemBounds,
  type SectionNavigationSide,
} from './navigationGeometry';
import {
  NAVIGATION_SVG_CENTER,
  NAVIGATION_SVG_SIZE,
  SECTION_NAVIGATION_ARROW_SIZE,
} from './navigationTokens';
import {
  NavigationDot,
  NavigationRing,
  NavigationSvgIcon,
} from './NavigationSvg';
import type {
  SectionNavigationGeometry,
  SectionNavigationItem,
} from './sectionNavigationTypes';

export type SectionNavigationRailModel = {
  activeIndex: number;
  canMoveHorizontally: boolean;
  geometry: SectionNavigationGeometry;
  items: SectionNavigationItem[];
  latestColor: string;
  modalLayerActive: boolean;
  modalPresentationActive: boolean;
  nextSlideTitle: string;
  previousSlideTitle: string;
  side: SectionNavigationSide;
  singleRail: boolean;
};

export type SectionNavigationRailActions = {
  onArrowGroupRef: (
    side: SectionNavigationSide,
    itemIndex: number,
    node: SVGGElement | null,
  ) => void;
  onButtonRef: (
    side: SectionNavigationSide,
    itemIndex: number,
    node: HTMLButtonElement | null,
  ) => void;
  onBlur: (
    side: SectionNavigationSide,
    itemIndex: number,
    event: FocusEvent<HTMLButtonElement>,
  ) => void;
  onClick: (
    side: SectionNavigationSide,
    itemIndex: number,
    event: MouseEvent<HTMLButtonElement>,
  ) => void;
  onFocus: (
    side: SectionNavigationSide,
    itemIndex: number,
    tooltipTitle: string,
    event: FocusEvent<HTMLButtonElement>,
  ) => void;
  onItemPointerDown: (
    side: SectionNavigationSide,
    itemIndex: number,
    hasHorizontalAction: boolean,
    event: PointerEvent<HTMLButtonElement>,
  ) => void;
  onItemPointerEnter: (
    side: SectionNavigationSide,
    itemIndex: number,
    tooltipTitle: string,
    event: PointerEvent<HTMLButtonElement>,
  ) => void;
  onItemPointerRelease: (
    itemIndex: number,
    event: PointerEvent<HTMLButtonElement>,
  ) => void;
  onItemGroupRef: (
    side: SectionNavigationSide,
    itemIndex: number,
    node: SVGGElement | null,
  ) => void;
  onDotRef: (
    side: SectionNavigationSide,
    itemIndex: number,
    node: SVGCircleElement | null,
  ) => void;
  onRingRef: (
    side: SectionNavigationSide,
    node: SVGCircleElement | null,
  ) => void;
  onTooltipRef: (
    side: SectionNavigationSide,
    node: HTMLDivElement | null,
  ) => void;
  onTooltipTextRef: (
    side: SectionNavigationSide,
    node: HTMLSpanElement | null,
  ) => void;
  onZonePointerEnter: (
    side: SectionNavigationSide,
    event: PointerEvent<HTMLDivElement>,
  ) => void;
  onZonePointerLeave: (
    side: SectionNavigationSide,
    event: PointerEvent<HTMLDivElement>,
  ) => void;
  onZonePointerMove: (
    side: SectionNavigationSide,
    event: PointerEvent<HTMLDivElement>,
  ) => void;
};

function getItemPresentation(
  item: SectionNavigationItem,
  itemIndex: number,
  model: SectionNavigationRailModel,
) {
  const isActive = itemIndex === model.activeIndex;
  const hasHorizontalAction = isActive && model.canMoveHorizontally;
  const tooltipTitle = hasHorizontalAction
    ? model.side === 'left'
      ? model.previousSlideTitle
      : model.nextSlideTitle
    : item.title;
  const label = hasHorizontalAction
    ? model.side === 'left'
      ? 'Previous screen'
      : 'Next screen'
    : isActive
      ? `Current section: ${item.title}`
      : `Show ${item.title}`;

  return { hasHorizontalAction, isActive, label, tooltipTitle };
}

export function SectionNavigationRail({
  actions,
  model,
}: {
  actions: SectionNavigationRailActions;
  model: SectionNavigationRailModel;
}) {
  const { geometry, items, side } = model;
  const safeAreaMargin =
    side === 'left'
      ? { marginLeft: 'env(safe-area-inset-left)' }
      : { marginRight: 'env(safe-area-inset-right)' };

  return (
    <div
      data-portfolio-section-nav-zone={side}
      data-interactive-pop="off"
      className="isolate"
      style={{
        ...safeAreaMargin,
        position: 'absolute',
        top: 0,
        [side]: model.singleRail ? '1rem' : '1.5rem',
        width: '4.5rem',
        height: geometry.height,
        overflow: 'visible',
        zIndex: model.modalLayerActive ? 60 : 40,
      }}
      onPointerMove={(event) => actions.onZonePointerMove(side, event)}
      onPointerLeave={(event) => actions.onZonePointerLeave(side, event)}
      onPointerEnter={(event) => actions.onZonePointerEnter(side, event)}
    >
      <svg
        className="pointer-events-none absolute top-0 overflow-visible"
        width={NAVIGATION_SVG_SIZE}
        height={geometry.height}
        viewBox={`0 0 ${NAVIGATION_SVG_SIZE} ${geometry.height}`}
        style={side === 'left' ? { left: 0 } : { right: 0 }}
        aria-hidden="true"
      >
        {items.map((item, itemIndex) => {
          const centerY = geometry.centers[itemIndex] ?? 0;

          return (
            <g
              key={item.id}
              data-portfolio-section-nav-visual-index={itemIndex}
              ref={(node) => actions.onItemGroupRef(side, itemIndex, node)}
              className="transition-opacity duration-200 ease-out motion-reduce:transition-none"
              color={item.color}
            >
              <g
                ref={(node) => actions.onArrowGroupRef(side, itemIndex, node)}
                data-portfolio-section-nav-arrow={itemIndex}
                style={{ filter: 'drop-shadow(1px 1px 0 black)' }}
              >
                {item.pending ? (
                  <circle
                    cx={NAVIGATION_SVG_CENTER}
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
                      from={`0 ${NAVIGATION_SVG_CENTER} ${centerY}`}
                      to={`360 ${NAVIGATION_SVG_CENTER} ${centerY}`}
                      dur="0.8s"
                      repeatCount="indefinite"
                    />
                  </circle>
                ) : (
                  <NavigationSvgIcon
                    icon={faArrowDown}
                    centerX={NAVIGATION_SVG_CENTER}
                    centerY={centerY}
                    size={SECTION_NAVIGATION_ARROW_SIZE}
                  />
                )}
              </g>
              <NavigationDot
                ref={(node) => actions.onDotRef(side, itemIndex, node)}
                data-portfolio-section-nav-dot={itemIndex}
                cx={NAVIGATION_SVG_CENTER}
                cy={centerY}
                opacity={0}
              />
            </g>
          );
        })}
        <NavigationRing
          ref={(node) => actions.onRingRef(side, node)}
          data-portfolio-section-nav-ring={side}
        />
      </svg>
      {items.map((item, itemIndex) => {
        const bounds = getSectionItemBounds(
          geometry.centers,
          geometry.height,
          itemIndex,
        );
        const { hasHorizontalAction, isActive, label, tooltipTitle } =
          getItemPresentation(item, itemIndex, model);
        const concealed = model.modalPresentationActive && !isActive;

        return (
          <button
            key={item.id}
            ref={(node) => actions.onButtonRef(side, itemIndex, node)}
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
            onPointerEnter={(event) =>
              actions.onItemPointerEnter(
                side,
                itemIndex,
                tooltipTitle,
                event,
              )
            }
            onPointerDown={(event) =>
              actions.onItemPointerDown(
                side,
                itemIndex,
                hasHorizontalAction,
                event,
              )
            }
            onPointerUp={(event) =>
              actions.onItemPointerRelease(itemIndex, event)
            }
            onPointerCancel={(event) =>
              actions.onItemPointerRelease(itemIndex, event)
            }
            onFocus={(event) =>
              actions.onFocus(side, itemIndex, tooltipTitle, event)
            }
            onBlur={(event) => actions.onBlur(side, itemIndex, event)}
            onClick={(event) => actions.onClick(side, itemIndex, event)}
          />
        );
      })}
      <div
        ref={(node) => actions.onTooltipRef(side, node)}
        id={`portfolio-${side}-section-nav-tooltip`}
        role="tooltip"
        className={`invisible pointer-events-none absolute z-30 -translate-y-1/2 whitespace-nowrap px-3 py-2 text-[0.6875rem] font-black uppercase leading-none tracking-[0.24em] opacity-0 ${
          side === 'left' ? 'left-[4rem]' : 'right-[4rem]'
        }`}
        style={{
          top: geometry.centers[model.activeIndex] ?? 0,
          backgroundColor: model.latestColor,
        }}
      >
        <span
          ref={(node) => actions.onTooltipTextRef(side, node)}
          className="text-black"
        />
      </div>
    </div>
  );
}
