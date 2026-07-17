import { gsap } from 'gsap';
import {
  getAffordanceOpacity,
  getNavigationRingRadius,
  getNavigationScale,
  getSectionArrowRotation,
  type SectionNavigationSide,
} from './navigationGeometry';
import {
  NAVIGATION_DOT_RADIUS,
  NAVIGATION_SVG_CENTER,
} from './navigationTokens';
import type { NavigationRenderState } from './navigationMotion';
import type {
  SectionNavigationAxis,
  SectionNavigationGeometry,
  SectionNavigationItem,
  SectionNavigationView,
} from './sectionNavigationTypes';

type AffordanceOpacityMotion = {
  element: SVGElement;
  setter: ReturnType<typeof gsap.quickTo>;
  target: number;
};

type AffordanceOpacityMotions = {
  arrows: Array<AffordanceOpacityMotion | null>;
  dots: Array<AffordanceOpacityMotion | null>;
};

export type SectionNavigationRenderContext = {
  activeIndex: number;
  geometry: SectionNavigationGeometry;
  hovered: boolean;
  items: SectionNavigationItem[];
  modalPresentationActive: boolean;
  pinnedAxis: SectionNavigationAxis | null;
  pinnedIndex: number | null;
  previewIndex: number | null;
  reducedMotion: boolean;
  sourcePosition: number;
};

export class SectionNavigationRenderer {
  private readonly views: Record<SectionNavigationSide, SectionNavigationView>;
  private readonly getContext: () => SectionNavigationRenderContext;
  private readonly isTooltipVisible: (side: SectionNavigationSide) => boolean;
  private readonly attributeCache = new WeakMap<
    SVGElement,
    Map<string, string>
  >();
  private readonly affordanceMotions: Record<
    SectionNavigationSide,
    AffordanceOpacityMotions
  > = {
    left: { arrows: [], dots: [] },
    right: { arrows: [], dots: [] },
  };
  private latestState: NavigationRenderState | null = null;

  constructor({
    views,
    getContext,
    isTooltipVisible,
  }: {
    views: Record<SectionNavigationSide, SectionNavigationView>;
    getContext: () => SectionNavigationRenderContext;
    isTooltipVisible: (side: SectionNavigationSide) => boolean;
  }) {
    this.views = views;
    this.getContext = getContext;
    this.isTooltipVisible = isTooltipVisible;
  }

  getLatestState() {
    return this.latestState;
  }

  render(state: NavigationRenderState, scrubbed = false) {
    this.latestState = state;

    (['left', 'right'] as const).forEach((side) => {
      const view = this.views[side];
      const ring = view.ring;

      if (ring) {
        const ringPressScale =
          state.pressedIndex !== null ? state.pressScale : 1;
        this.setAttribute(ring, 'cx', String(NAVIGATION_SVG_CENTER));
        this.setAttribute(ring, 'cy', String(state.coordinate));
        this.setAttribute(
          ring,
          'r',
          String(
            getNavigationRingRadius(
              state.ringScale * ringPressScale,
              state.strokeWidth,
            ),
          ),
        );
        this.setAttribute(ring, 'stroke', state.color);
        this.setAttribute(
          ring,
          'stroke-width',
          String(state.strokeWidth),
        );
      }

      if (this.isTooltipVisible(side)) {
        this.syncTooltip(side);
      }
    });

    this.renderAffordances(state, scrubbed);
  }

  renderLatest(scrubbed = false) {
    if (this.latestState) {
      this.renderAffordances(this.latestState, scrubbed);
    }
  }

  syncTooltip(side: SectionNavigationSide) {
    const tooltip = this.views[side].tooltip;

    if (!tooltip || !this.latestState) {
      return;
    }

    tooltip.style.top = `${this.latestState.coordinate}px`;
    tooltip.style.backgroundColor = this.latestState.color;
  }

  destroy() {
    (['left', 'right'] as const).forEach((side) => {
      const motions = this.affordanceMotions[side];

      [...motions.arrows, ...motions.dots].forEach((motion) => {
        if (motion) {
          gsap.killTweensOf(motion.element);
        }
      });
      motions.arrows = [];
      motions.dots = [];
    });
  }

  private getAffordanceLayers(itemIndex: number) {
    const context = this.getContext();
    const { items, sourcePosition } = context;
    const item = items[itemIndex];
    const lowerIndex = Math.max(0, Math.floor(sourcePosition));
    const upperIndex = Math.min(items.length - 1, Math.ceil(sourcePosition));
    const progress = sourcePosition - lowerIndex;
    const directDotTransition =
      lowerIndex !== upperIndex &&
      !items[lowerIndex]?.hasSlides &&
      !items[upperIndex]?.hasSlides;

    if (item?.pending) {
      return { arrowOpacity: 1, dotOpacity: 0 };
    }

    if (
      itemIndex === context.pinnedIndex &&
      context.pinnedAxis === 'vertical'
    ) {
      return { arrowOpacity: 0, dotOpacity: 1 };
    }

    if (
      itemIndex === context.previewIndex &&
      itemIndex !== context.activeIndex
    ) {
      return { arrowOpacity: 0, dotOpacity: 1 };
    }

    if (context.pinnedAxis === 'vertical') {
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
  }

  private renderAffordances(state: NavigationRenderState, scrubbed: boolean) {
    const context = this.getContext();

    (['left', 'right'] as const).forEach((side) => {
      const view = this.views[side];

      context.items.forEach((item, itemIndex) => {
        const itemGroup = view.itemGroups[itemIndex];
        const arrowGroup = view.arrowGroups[itemIndex];
        const dot = view.dots[itemIndex];
        const centerY = context.geometry.centers[itemIndex] ?? 0;
        const activeScale =
          itemIndex === state.activeIndex
            ? getNavigationScale(state.position, state.activeIndex)
            : 1;
        const pressScale =
          state.pressedIndex === itemIndex ? state.pressScale : 1;
        const visualScale = activeScale * pressScale;
        const { arrowOpacity, dotOpacity } =
          this.getAffordanceLayers(itemIndex);
        const rotation = getSectionArrowRotation(
          itemIndex,
          context.sourcePosition,
          side,
          context.items,
        );
        const concealed =
          context.modalPresentationActive &&
          itemIndex !== context.activeIndex;
        const dimmed = !context.hovered && itemIndex !== context.activeIndex;

        this.setAttribute(
          itemGroup,
          'opacity',
          concealed ? '0' : dimmed ? '0.5' : '1',
        );
        this.setAttribute(
          arrowGroup,
          'transform',
          `translate(${NAVIGATION_SVG_CENTER} ${centerY}) rotate(${rotation}) scale(${visualScale}) translate(${-NAVIGATION_SVG_CENTER} ${-centerY})`,
        );
        this.setAffordanceOpacity(
          side,
          'arrows',
          itemIndex,
          arrowOpacity,
          scrubbed,
        );

        if (dot) {
          this.setAttribute(dot, 'cy', String(centerY));
          this.setAttribute(
            dot,
            'r',
            String(NAVIGATION_DOT_RADIUS * visualScale),
          );
          this.setAffordanceOpacity(
            side,
            'dots',
            itemIndex,
            dotOpacity,
            scrubbed,
          );
        }
      });
    });
  }

  private setAffordanceOpacity(
    side: SectionNavigationSide,
    kind: keyof AffordanceOpacityMotions,
    itemIndex: number,
    target: number,
    immediate: boolean,
  ) {
    const context = this.getContext();
    const view = this.views[side];
    const element =
      kind === 'arrows' ? view.arrowGroups[itemIndex] : view.dots[itemIndex];

    if (!element) {
      return;
    }

    const motions = this.affordanceMotions[side][kind];
    let motion = motions[itemIndex];

    if (!motion || motion.element !== element) {
      if (motion) {
        gsap.killTweensOf(motion.element);
      }

      gsap.set(element, { opacity: target });
      motion = {
        element,
        setter: gsap.quickTo(element, 'opacity', {
          duration: context.reducedMotion ? 0 : 0.3,
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
    if (immediate) {
      motion.setter.tween.pause();
      gsap.set(element, { opacity: target });
    } else {
      motion.setter(target);
    }
  }

  private setAttribute(
    element: SVGElement | null,
    name: string,
    value: string,
  ) {
    if (!element) {
      return;
    }

    let cache = this.attributeCache.get(element);

    if (!cache) {
      cache = new Map();
      this.attributeCache.set(element, cache);
    }

    if (cache.get(name) === value) {
      return;
    }

    cache.set(name, value);
    element.setAttribute(name, value);
  }
}
