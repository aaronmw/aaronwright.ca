import type {
  MutableRefObject,
  PointerEvent,
} from 'react';
import { NAVIGATION_SLIDE_STEP, NAVIGATION_SVG_CENTER, NAVIGATION_SVG_SIZE } from './navigationTokens';
import { NavigationDot, NavigationRing } from './NavigationSvg';
import type { SlideNavigationItem } from './slideNavigationTypes';

export type SlideNavigationViewRefs = {
  dotRefs: MutableRefObject<Map<number, SVGCircleElement>>;
  latticeRef: MutableRefObject<SVGGElement | null>;
  ringRef: MutableRefObject<SVGEllipseElement | null>;
  slotRefs: MutableRefObject<Map<number, SVGGElement>>;
  svgRef: MutableRefObject<SVGSVGElement | null>;
};

export type SlideNavigationViewActions = {
  onBlur: (index: number) => void;
  onClick: (index: number, detail: number) => void;
  onFocus: (index: number) => void;
  onKeyDown: (index: number, key: string, code: string, repeat: boolean) => void;
  onKeyUp: (index: number, key: string, code: string) => void;
  onPointerDown: (index: number, event: PointerEvent<HTMLButtonElement>) => void;
  onPointerEnter: (index: number, event: PointerEvent<HTMLButtonElement>) => void;
  onPointerLeave: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerRelease: (
    index: number,
    event: PointerEvent<HTMLButtonElement>,
  ) => void;
};

export type SlideNavigationViewModel = {
  activeIndex: number;
  items: SlideNavigationItem[];
  pendingIndex: number | null;
  renderedSlotIds: number[];
  surfaceLeft: number;
  surfaceWidth: number;
  targetSlotIds: number[];
  targetWidth: number;
  visualActiveIndex: number;
};

export function SlideNavigationView({
  actions,
  model,
  refs,
}: {
  actions: SlideNavigationViewActions;
  model: SlideNavigationViewModel;
  refs: SlideNavigationViewRefs;
}) {
  return (
    <div
      data-portfolio-slide-indicators
      data-interactive-pop="off"
      className="group/slide-nav pointer-events-auto relative h-[52px] overflow-visible"
      style={{ width: `${model.targetWidth}px` }}
      onPointerMove={actions.onPointerMove}
      onPointerLeave={actions.onPointerLeave}
    >
      <svg
        ref={refs.svgRef}
        className="pointer-events-none absolute top-0 overflow-visible"
        width={model.surfaceWidth}
        height={NAVIGATION_SVG_SIZE}
        viewBox={`0 0 ${model.surfaceWidth} ${NAVIGATION_SVG_SIZE}`}
        style={{ left: `${model.surfaceLeft}px` }}
        aria-hidden="true"
      >
        <g ref={refs.latticeRef}>
          {model.renderedSlotIds.map((slotId) => {
            const targetIndex = model.targetSlotIds.indexOf(slotId);

            return (
              <g
                key={slotId}
                ref={(node) => {
                  if (node) {
                    refs.slotRefs.current.set(slotId, node);
                  } else {
                    refs.slotRefs.current.delete(slotId);
                  }
                }}
                data-portfolio-slide-indicator-slot={slotId}
                transform={`translate(${slotId * NAVIGATION_SLIDE_STEP} 0)`}
              >
                <NavigationDot
                  ref={(node) => {
                    if (node && targetIndex >= 0) {
                      refs.dotRefs.current.set(targetIndex, node);
                    } else if (targetIndex >= 0) {
                      refs.dotRefs.current.delete(targetIndex);
                    }
                  }}
                  data-portfolio-slide-indicator-visual={
                    targetIndex >= 0 ? targetIndex : undefined
                  }
                  cx={0}
                  cy={NAVIGATION_SVG_CENTER}
                  fill="white"
                  className={`transition-opacity duration-200 ease-out motion-reduce:transition-none ${
                    targetIndex < 0 || targetIndex === model.visualActiveIndex
                      ? 'opacity-100'
                      : 'opacity-50 group-hover/slide-nav:opacity-100 group-focus-within/slide-nav:opacity-100'
                  }`}
                />
                {targetIndex >= 0 && model.pendingIndex === targetIndex ? (
                  <circle
                    cx={0}
                    cy={NAVIGATION_SVG_CENTER}
                    r={7}
                    fill="none"
                    stroke="white"
                    strokeWidth={2}
                    strokeDasharray="20 24"
                    className="portfolio-pending-ring"
                  />
                ) : null}
              </g>
            );
          })}
        </g>
        <NavigationRing
          ref={refs.ringRef}
          data-portfolio-slide-indicator-marker="true"
        />
      </svg>
      {model.items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          className="pointer-events-auto absolute inset-y-0 cursor-pointer outline-none"
          style={{
            left: `${index * NAVIGATION_SLIDE_STEP}px`,
            width: `${NAVIGATION_SLIDE_STEP}px`,
          }}
          aria-label={item.label}
          aria-current={model.activeIndex === index ? 'true' : undefined}
          aria-busy={model.pendingIndex === index ? true : undefined}
          data-portfolio-slide-indicator-index={index}
          onPointerEnter={(event) => actions.onPointerEnter(index, event)}
          onPointerDown={(event) => actions.onPointerDown(index, event)}
          onPointerUp={(event) => actions.onPointerRelease(index, event)}
          onPointerCancel={(event) => actions.onPointerRelease(index, event)}
          onKeyDown={(event) =>
            actions.onKeyDown(
              index,
              event.key,
              event.code,
              event.repeat,
            )
          }
          onKeyUp={(event) =>
            actions.onKeyUp(index, event.key, event.code)
          }
          onFocus={() => actions.onFocus(index)}
          onBlur={() => actions.onBlur(index)}
          onClick={(event) => actions.onClick(index, event.detail)}
        />
      ))}
    </div>
  );
}
