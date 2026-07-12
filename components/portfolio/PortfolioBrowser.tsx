'use client';

import {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  TouchEvent as ReactTouchEvent,
  WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import {
  faArrowDown,
  faArrowUp,
  faFilePdf,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import {
  PortfolioProject,
  PortfolioScreenshot,
  portfolioSlides,
} from '@/lib/portfolio';
import type { Components } from 'react-markdown';

type PortfolioBrowserProps = {
  initialProjectSlug?: string;
  initialScreenshotSlug?: string;
};

type ProjectSlide =
  | {
      id: string;
      kind: 'description';
      slug: 'description';
    }
  | {
      id: string;
      kind: 'screenshot';
      slug: string;
      screenshot: PortfolioScreenshot;
    };

const START_SCREEN_INDEX = -1;
const WIDE_LAYOUT_MEDIA_QUERY =
  '(min-aspect-ratio: 5/4) and (min-width: 43rem)';
type WideLayoutStyle = CSSProperties & {
  '--portfolio-description-rail-width': string;
  '--portfolio-control-gutter-width': string;
  '--portfolio-screenshot-size': string;
};
type ProjectColorStyle = CSSProperties & {
  '--project-color': string;
};
type MarkdownLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  node?: unknown;
};
type MarkdownHeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  node?: unknown;
};
type MarkdownHeadingTag = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
type ModalTransitionRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};
const WIDE_LAYOUT_STYLE: WideLayoutStyle = {
  '--portfolio-description-rail-width':
    'min(calc(100vw - 4rem), calc(7rem + max(32rem, 48ch)))',
  '--portfolio-control-gutter-width': '6rem',
  '--portfolio-screenshot-size':
    'min(100dvh, calc(100vw - var(--portfolio-description-rail-width) - var(--portfolio-control-gutter-width)))',
};
const NAVIGATION_DOT_CLASS = 'block size-2.5 rounded-full bg-white';
const NAVIGATION_INDICATOR_STEP_REM = 2.5;
const NAVIGATION_RING_SIZE_REM = 3;
const NAVIGATION_INDICATOR_PAIR_STAGGER_MS = 90;
const NAVIGATION_INDICATOR_SIDE_LEAD_MS = 30;
const NAVIGATION_INDICATOR_TRANSITION_MS = 500;
const SECTION_NAV_ITEM_STEP_REM = 3.75;
const SECTION_NAV_PREVIEW_RETURN_DELAY_MS = 140;
const SECTION_NAV_SNAP_DISTANCE_PX = 10;
const SECTION_NAV_BREAKAWAY_DISTANCE_PX = 50;
const CAROUSEL_MEDIA_CLASS =
  'object-contain transition-[filter] duration-1000 ease-in-out';
const TOP_SCREEN_COLOR = 'hsl(0 0% 100%)';
const PROJECT_COLOR_START_HUE = 342;
const PROJECT_COLOR_SATURATION = 78;
const PROJECT_COLOR_LIGHTNESS = 54;
const PROJECT_COLORS = buildProjectColors(portfolioSlides.length);
const SECTION_NAV_COLORS = [TOP_SCREEN_COLOR, ...PROJECT_COLORS];
const INLINE_MARKDOWN_COMPONENTS = {
  p({ children }) {
    return <>{children}</>;
  },
} satisfies Components;
const PORTFOLIO_MARKDOWN_COMPONENTS = {
  a: MarkdownLink,
  h1: createMarkdownHeading('h2'),
  h2: createMarkdownHeading('h3'),
  h3: createMarkdownHeading('h4'),
  h4: createMarkdownHeading('h5'),
  h5: createMarkdownHeading('h6'),
  h6: createMarkdownHeading('h6'),
} satisfies Components;

function buildProjectColors(projectCount: number) {
  const safeProjectCount = Math.max(1, projectCount);
  const hueStep = 360 / safeProjectCount;

  return Array.from({ length: safeProjectCount }, (_, index) => {
    const hue = Math.round(
      (PROJECT_COLOR_START_HUE + hueStep * index) % 360
    );

    return `hsl(${hue} ${PROJECT_COLOR_SATURATION}% ${PROJECT_COLOR_LIGHTNESS}%)`;
  });
}

function getWideLayoutSnapshot() {
  return window.matchMedia(WIDE_LAYOUT_MEDIA_QUERY).matches;
}

function getWideLayoutServerSnapshot() {
  return false;
}

function subscribeToWideLayout(callback: () => void) {
  const mediaQuery = window.matchMedia(WIDE_LAYOUT_MEDIA_QUERY);
  mediaQuery.addEventListener('change', callback);

  return () => mediaQuery.removeEventListener('change', callback);
}

function positiveModulo(value: number, length: number) {
  return ((value % length) + length) % length;
}

type LoopingCarouselEntry<T> = {
  item: T;
  key: string;
  realIndex: number;
};

function getLoopingCarouselEntries<T extends { id: string }>(
  items: T[],
  cloneSingleton = false
): LoopingCarouselEntry<T>[] {
  if (items.length === 0) {
    return [];
  }

  const entries = items.map((item, realIndex) => ({
    item,
    key: `real:${item.id}`,
    realIndex,
  }));

  if (items.length === 1 && !cloneSingleton) {
    return entries;
  }

  const lastIndex = items.length - 1;

  return [
    {
      item: items[lastIndex],
      key: `clone-before:${items[lastIndex].id}`,
      realIndex: lastIndex,
    },
    ...entries,
    {
      item: items[0],
      key: `clone-after:${items[0].id}`,
      realIndex: 0,
    },
  ];
}

function getRealCarouselIndex(renderedIndex: number, itemCount: number) {
  return positiveModulo(renderedIndex - 1, itemCount);
}

function getCanonicalRenderedCarouselIndex(realIndex: number, itemCount: number) {
  return itemCount > 1 ? realIndex + 1 : realIndex;
}

function isCarouselBoundaryJump(
  previousIndex: number,
  nextIndex: number,
  itemCount: number
) {
  return (
    itemCount > 1 &&
    ((previousIndex === itemCount - 1 && nextIndex === 0) ||
      (previousIndex === 0 && nextIndex === itemCount - 1))
  );
}

function getCarouselMediaClass(isActive: boolean) {
  return `${CAROUSEL_MEDIA_CLASS} ${
    isActive ? 'blur-0' : 'blur-[20px]'
  }`;
}

function getTouchDistance(event: ReactTouchEvent<HTMLDialogElement>) {
  const [first, second] = Array.from(event.touches);

  return Math.hypot(
    first.clientX - second.clientX,
    first.clientY - second.clientY
  );
}

function getSectionNavArrowRotation(
  itemIndex: number,
  activeSectionIndex: number,
  side: 'left' | 'right'
) {
  const direction = side === 'left' ? 1 : -1;

  if (itemIndex < activeSectionIndex) {
    return 180 * direction;
  }

  if (itemIndex > activeSectionIndex) {
    return 0;
  }

  const activeProject = portfolioSlides[activeSectionIndex - 1];
  return activeProject?.screenshots.length > 1 ? 90 * direction : 0;
}

function getSectionNavPreviewOffset(
  preview: SVGGElement,
  target: HTMLElement
) {
  const targetRect = target.getBoundingClientRect();

  return getSectionNavPreviewOffsetFromClientY(
    preview,
    targetRect.top + targetRect.height / 2
  );
}

function getSectionNavPreviewOffsetFromClientY(
  preview: SVGGElement,
  targetCenterY: number
) {
  const ring = preview.querySelector('circle');

  if (!ring) {
    return 0;
  }

  const currentPreviewY = Number(gsap.getProperty(preview, 'y')) || 0;
  const ringRect = ring.getBoundingClientRect();
  const unshiftedRingCenterY =
    ringRect.top + ringRect.height / 2 - currentPreviewY;

  return targetCenterY - unshiftedRingCenterY;
}

function getSectionNavSnapTarget(
  buttons: Array<HTMLDivElement | null>,
  pointerY: number,
  snapDistance = SECTION_NAV_SNAP_DISTANCE_PX
): { index: number; centerY: number; distance: number } | null {
  let closest: { index: number; centerY: number; distance: number } | null = null;

  for (let index = 0; index < buttons.length; index += 1) {
    const button = buttons[index];

    if (!button || button.getAttribute('aria-hidden') === 'true') {
      continue;
    }

    const rect = button.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    const distance = Math.abs(pointerY - centerY);

    if (distance <= snapDistance && (!closest || distance < closest.distance)) {
      closest = { index, centerY, distance };
    }
  }

  return closest;
}

function getSectionNavPointerColor(
  buttons: Array<HTMLDivElement | null>,
  pointerY: number
) {
  const stops = buttons
    .map((button, index) => {
      if (!button || button.getAttribute('aria-hidden') === 'true') {
        return null;
      }

      const rect = button.getBoundingClientRect();

      return {
        centerY: rect.top + rect.height / 2,
        color: SECTION_NAV_COLORS[index],
      };
    })
    .filter(
      (stop): stop is { centerY: number; color: string } => stop !== null
    )
    .sort((first, second) => first.centerY - second.centerY);

  if (stops.length === 0) {
    return null;
  }

  if (pointerY <= stops[0].centerY) {
    return stops[0].color;
  }

  const lastStop = stops[stops.length - 1];

  if (pointerY >= lastStop.centerY) {
    return lastStop.color;
  }

  for (let index = 1; index < stops.length; index += 1) {
    const nextStop = stops[index];

    if (pointerY > nextStop.centerY) {
      continue;
    }

    const previousStop = stops[index - 1];
    const progress =
      (pointerY - previousStop.centerY) /
      (nextStop.centerY - previousStop.centerY);
    const previousColor = gsap.utils.splitColor(previousStop.color);
    const nextColor = gsap.utils.splitColor(nextStop.color);
    const channels = previousColor.slice(0, 3).map((channel, channelIndex) =>
      Math.round(channel + (nextColor[channelIndex] - channel) * progress)
    );

    return `rgb(${channels.join(', ')})`;
  }

  return lastStop.color;
}

function isSectionNavBeyondBreakawayDistance(
  buttons: Array<HTMLDivElement | null>,
  pointerY: number,
  indicatorY: number,
  breakawayDistance = SECTION_NAV_BREAKAWAY_DISTANCE_PX
) {
  const itemRects = buttons
    .filter((button): button is HTMLDivElement => Boolean(button))
    .map((button) => button.getBoundingClientRect());

  if (itemRects.length === 0) {
    return true;
  }

  const top = Math.min(...itemRects.map((rect) => rect.top));
  const bottom = Math.max(...itemRects.map((rect) => rect.bottom));
  const isAbove =
    pointerY < top - breakawayDistance &&
    indicatorY < top - breakawayDistance;
  const isBelow =
    pointerY > bottom + breakawayDistance &&
    indicatorY > bottom + breakawayDistance;

  return isAbove || isBelow;
}

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
    distanceFromLeft < distanceFromRight
      ? NAVIGATION_INDICATOR_SIDE_LEAD_MS
      : 0;

  return pairIndex * NAVIGATION_INDICATOR_PAIR_STAGGER_MS + leftSideDelay;
}

function getCenteredIndicatorTransform(index: number, count: number) {
  const offsetRem = (index - (count - 1) / 2) * NAVIGATION_INDICATOR_STEP_REM;

  return `translate3d(-50%, -50%, 0) translateX(${offsetRem}rem)`;
}

function getProjectColor(projectIndex: number) {
  return PROJECT_COLORS[positiveModulo(projectIndex, PROJECT_COLORS.length)];
}

function isExternalSiteHref(href?: string) {
  if (!href) {
    return false;
  }

  try {
    const url = new URL(href, 'https://aaronwright.ca');

    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.hostname !== 'aaronwright.ca' &&
      url.hostname !== 'www.aaronwright.ca'
    );
  } catch {
    return false;
  }
}

function MarkdownLink({
  href,
  children,
  node: _node,
  ...props
}: MarkdownLinkProps) {
  const isExternalSite = isExternalSiteHref(href);

  return (
    <a
      {...props}
      href={href}
      target={isExternalSite ? '_blank' : props.target}
      rel={isExternalSite ? 'noopener noreferrer' : props.rel}
    >
      {children}
    </a>
  );
}

function createMarkdownHeading(Tag: MarkdownHeadingTag) {
  function MarkdownHeading({ node: _node, ...props }: MarkdownHeadingProps) {
    return <Tag {...props} />;
  }

  return MarkdownHeading;
}

function getVerticalTargetProjectIndex(
  currentProjectIndex: number,
  direction: -1 | 1
) {
  const screenCount = portfolioSlides.length + 1;
  const currentScreenIndex = currentProjectIndex + 1;
  const nextScreenIndex = positiveModulo(
    currentScreenIndex + direction,
    screenCount
  );

  return nextScreenIndex - 1;
}

function projectUrl(project: PortfolioProject, slide: ProjectSlide) {
  if (slide.kind === 'description') {
    return `/work/${project.slug}`;
  }

  return `/work/${project.slug}/${slide.slug}`;
}

function pageTitle(project?: PortfolioProject, slide?: ProjectSlide) {
  if (!project || !slide) {
    return 'Work | Aaron M. Wright';
  }

  if (slide.kind === 'description') {
    return `${project.title} | Aaron M. Wright`;
  }

  return `${project.title}: ${slide.slug} | Aaron M. Wright`;
}

function titleCaseLabel(value: string) {
  return value.replace(/\S+/g, (word) =>
    word
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('-')
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function slideNavigationTitle(project: PortfolioProject, slide: ProjectSlide) {
  if (slide.kind === 'description') {
    return `${project.title} • Index`;
  }

  const altMatch = slide.screenshot.alt.match(/^(\d+\s+of\s+\d+):\s*(.+)$/i);
  const positionLabel =
    altMatch?.[1] ??
    `${project.screenshots.findIndex((screenshot) => screenshot.id === slide.screenshot.id) + 1} of ${project.screenshots.length}`;
  const rawSlideLabel = altMatch?.[2] ?? slide.screenshot.slug;
  const projectPrefixPattern = new RegExp(`^${escapeRegExp(project.title)}\\s*`, 'i');
  const slideLabel =
    rawSlideLabel.replace(projectPrefixPattern, '').trim() || slide.screenshot.slug;

  return `${positionLabel} • ${project.title} • ${titleCaseLabel(slideLabel)}`;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest('input, textarea, select, button, a, [contenteditable="true"]')
  );
}

function isTextEntryTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [role="textbox"]'
    )
  );
}

function snapshotClientRect(rect: DOMRectReadOnly): ModalTransitionRect {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function getVisibleScreenshotButtonRect(
  screenshotId: string
): ModalTransitionRect | null {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>('[data-portfolio-screenshot-id]')
  ).filter((node) => node.dataset.portfolioScreenshotId === screenshotId);
  let bestRect: DOMRect | undefined;
  let bestVisibleArea = 0;

  nodes.forEach((node) => {
    const rect = node.getBoundingClientRect();
    const visibleWidth =
      Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
    const visibleHeight =
      Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
    const visibleArea = Math.max(0, visibleWidth) * Math.max(0, visibleHeight);

    if (visibleArea > bestVisibleArea) {
      bestVisibleArea = visibleArea;
      bestRect = rect;
    }
  });

  return bestRect ? snapshotClientRect(bestRect) : null;
}

function getModalFrameRect(): ModalTransitionRect {
  return {
    left: window.innerWidth * 0.04,
    top: window.innerHeight * 0.04,
    width: window.innerWidth * 0.92,
    height: window.innerHeight * 0.92,
  };
}

function getProjectSlides(project: PortfolioProject): ProjectSlide[] {
  return [
    { id: `${project.id}-description`, kind: 'description', slug: 'description' },
    ...project.screenshots.map((screenshot) => ({
      id: screenshot.id,
      kind: 'screenshot' as const,
      slug: screenshot.slug,
      screenshot,
    })),
  ];
}

function isVideoScreenshot(screenshot: PortfolioScreenshot) {
  return /\.(webm|mp4|m4v|ogv|ogg)(?:$|\?)/i.test(screenshot.src);
}

function hasProjectScreenshots(project: PortfolioProject) {
  return project.screenshots.length > 0;
}

function isBuildingWithAiTextScreenshot(
  project: PortfolioProject,
  screenshot: PortfolioScreenshot
) {
  return (
    project.id === 'building-with-ai' &&
    screenshot.id === 'building-with-ai-home-page'
  );
}

function isBuildingWithAiTextSlide(
  project: PortfolioProject,
  slide: ProjectSlide
) {
  return (
    slide.kind === 'screenshot' &&
    isBuildingWithAiTextScreenshot(project, slide.screenshot)
  );
}

function isModalScreenshotSlide(
  project: PortfolioProject,
  slide: ProjectSlide
): slide is Extract<ProjectSlide, { kind: 'screenshot' }> {
  return slide.kind === 'screenshot' && !isBuildingWithAiTextSlide(project, slide);
}

function hasBuildingWithAiTextSlide(project: PortfolioProject) {
  return project.screenshots.some((screenshot) =>
    isBuildingWithAiTextScreenshot(project, screenshot)
  );
}

export function PortfolioBrowser({
  initialProjectSlug,
  initialScreenshotSlug,
}: PortfolioBrowserProps) {
  const keyboardSurfaceRef = useRef<HTMLElement>(null);
  const verticalRef = useRef<HTMLDivElement>(null);
  const horizontalRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const descriptionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const userMovedRef = useRef(false);
  const scrollSyncRef = useRef(false);
  const horizontalScrollSyncProjectRef = useRef<string | null>(null);
  const horizontalScrollSyncTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const modalHistoryEntryRef = useRef(false);
  const initialScrollSyncedRef = useRef(false);
  const sectionNavIndicatorRefs = useRef<Array<SVGSVGElement | null>>([]);
  const sectionNavPreviewRefs = useRef<Array<SVGGElement | null>>([]);
  const sectionNavPreviewIndexesRef = useRef<Array<number | null>>([
    null,
    null,
  ]);
  const sectionNavButtonRefs = useRef<
    Record<'left' | 'right', Array<HTMLDivElement | null>>
  >({ left: [], right: [] });
  const sectionNavPreviewReturnTimeoutRefs = useRef<
    Record<'left' | 'right', ReturnType<typeof setTimeout> | null>
  >({ left: null, right: null });
  const sectionNavPointerYRefs = useRef<Record<'left' | 'right', number | null>>({
    left: null,
    right: null,
  });
  const sectionNavPointerArmedRefs = useRef<Record<'left' | 'right', boolean>>({
    left: false,
    right: false,
  });
  const sectionNavPointerAcquiringRefs = useRef<
    Record<'left' | 'right', boolean>
  >({ left: false, right: false });
  const sectionNavClickTargetIndexesRef = useRef<
    Record<'left' | 'right', number | null>
  >({ left: null, right: null });
  const sectionNavClickPhaseRefs = useRef<
    Record<'left' | 'right', 'attaching' | 'recentering' | null>
  >({ left: null, right: null });
  const sectionNavClickAxisRefs = useRef<
    Record<'left' | 'right', 'horizontal' | 'vertical' | null>
  >({ left: null, right: null });
  const sectionNavAttachmentCallbacksRef = useRef<
    Record<'left' | 'right', (() => void) | null>
  >({ left: null, right: null });
  const sectionNavStrokeWidthRefs = useRef<Record<'left' | 'right', 2 | 4>>({
    left: 4,
    right: 4,
  });
  const sectionNavIsMovingRef = useRef(false);
  const sectionNavStackRefs = useRef<Array<HTMLDivElement | null>>([]);
  const sectionNavIconRefs = useRef<
    Record<'left' | 'right', Array<SVGSVGElement | null>>
  >({ left: [], right: [] });
  const animateSectionNavRingStroke = useCallback(
    (side: 'left' | 'right', strokeWidth: 2 | 4) => {
      if (sectionNavStrokeWidthRefs.current[side] === strokeWidth) {
        return;
      }

      const sideIndex = side === 'left' ? 0 : 1;
      const ring = sectionNavPreviewRefs.current[sideIndex]?.querySelector(
        'circle'
      );

      sectionNavStrokeWidthRefs.current[side] = strokeWidth;

      if (!ring) {
        return;
      }

      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      gsap.to(ring, {
        strokeWidth,
        duration: reducedMotion ? 0 : 0.2,
        ease: 'power2.out',
        autoRound: false,
        overwrite: 'auto',
      });
    },
    []
  );
  const returnSectionNavPointerToIdle = useCallback(
    (side: 'left' | 'right', delayed: boolean) => {
      const sideIndex = side === 'left' ? 0 : 1;
      const indicator = sectionNavIndicatorRefs.current[sideIndex];
      const preview = sectionNavPreviewRefs.current[sideIndex];
      const returnTimeout = sectionNavPreviewReturnTimeoutRefs.current[side];

      if (returnTimeout) {
        clearTimeout(returnTimeout);
        sectionNavPreviewReturnTimeoutRefs.current[side] = null;
      }

      sectionNavPointerYRefs.current[side] = null;
      sectionNavPointerArmedRefs.current[side] = false;
      sectionNavPointerAcquiringRefs.current[side] = false;
      animateSectionNavRingStroke(side, 4);

      if (sectionNavClickTargetIndexesRef.current[side] !== null) {
        return;
      }

      sectionNavPreviewIndexesRef.current[sideIndex] = null;

      if (!indicator || !preview) {
        return;
      }

      const animateToIdle = () => {
        sectionNavPreviewReturnTimeoutRefs.current[side] = null;
        const reducedMotion = window.matchMedia(
          '(prefers-reduced-motion: reduce)'
        ).matches;

        gsap.to(preview, {
          y: 0,
          color: getComputedStyle(indicator).color,
          duration: reducedMotion ? 0 : 0.3,
          ease: 'power3.out',
          overwrite: 'auto',
          onComplete: () => {
            if (!sectionNavPointerArmedRefs.current[side]) {
              gsap.set(preview, { clearProps: 'color' });
            }
          },
        });
      };

      if (!delayed) {
        animateToIdle();
        return;
      }

      sectionNavPreviewReturnTimeoutRefs.current[side] = setTimeout(
        animateToIdle,
        SECTION_NAV_PREVIEW_RETURN_DELAY_MS
      );
    },
    [animateSectionNavRingStroke]
  );
  const updateSectionNavPointer = useCallback(
    (
      side: 'left' | 'right',
      pointerY: number,
      animatePosition = false,
      onPositionSettled?: () => void
    ) => {
      if (!sectionNavPointerArmedRefs.current[side]) {
        return;
      }

      const sideIndex = side === 'left' ? 0 : 1;
      const indicator = sectionNavIndicatorRefs.current[sideIndex];
      const preview = sectionNavPreviewRefs.current[sideIndex];
      const returnTimeout = sectionNavPreviewReturnTimeoutRefs.current[side];

      sectionNavPointerYRefs.current[side] = pointerY;

      if (returnTimeout) {
        clearTimeout(returnTimeout);
        sectionNavPreviewReturnTimeoutRefs.current[side] = null;
      }

      if (!indicator || !preview) {
        return;
      }

      if (sectionNavClickTargetIndexesRef.current[side] !== null) {
        return;
      }

      animateSectionNavRingStroke(side, 2);

      const snapTarget = sectionNavIsMovingRef.current
        ? null
        : getSectionNavSnapTarget(
            sectionNavButtonRefs.current[side],
            pointerY
          );
      const snapIndex = snapTarget?.index ?? null;
      const targetY = snapTarget?.centerY ?? pointerY;

      if (
        !sectionNavIsMovingRef.current &&
        isSectionNavBeyondBreakawayDistance(
          sectionNavButtonRefs.current[side],
          pointerY,
          targetY
        )
      ) {
        returnSectionNavPointerToIdle(side, false);
        return;
      }

      sectionNavPreviewIndexesRef.current[sideIndex] = snapIndex;
      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      const targetOffset = getSectionNavPreviewOffsetFromClientY(
        preview,
        targetY
      );

      gsap.killTweensOf(preview, 'y');

      if (animatePosition && !reducedMotion) {
        gsap.to(preview, {
          y: targetOffset,
          duration: 0.3,
          ease: 'power3.out',
          overwrite: 'auto',
          onComplete: onPositionSettled,
        });
      } else {
        gsap.set(preview, { y: targetOffset });
        onPositionSettled?.();
      }

      const targetColor =
        getSectionNavPointerColor(
          sectionNavButtonRefs.current[side],
          targetY
        ) ?? getComputedStyle(indicator).color;

      gsap.to(preview, {
        color: targetColor,
        duration: reducedMotion ? 0 : 0.15,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    },
    [animateSectionNavRingStroke, returnSectionNavPointerToIdle]
  );
  const trackSectionNavPointer = useCallback(
    (side: 'left' | 'right', pointerY: number) => {
      const acquiring = sectionNavPointerAcquiringRefs.current[side];

      updateSectionNavPointer(
        side,
        pointerY,
        acquiring,
        acquiring
          ? () => {
              sectionNavPointerAcquiringRefs.current[side] = false;
            }
          : undefined
      );
    },
    [updateSectionNavPointer]
  );
  const engageSectionNavPointer = useCallback(
    (side: 'left' | 'right', pointerY: number) => {
      if (!sectionNavPointerArmedRefs.current[side]) {
        sectionNavPointerAcquiringRefs.current[side] = true;
      }

      sectionNavPointerArmedRefs.current[side] = true;
      trackSectionNavPointer(side, pointerY);
    },
    [trackSectionNavPointer]
  );
  const positionSectionNavClickTarget = useCallback(
    (
      side: 'left' | 'right',
      itemIndex: number,
      duration: number,
      onComplete?: () => void
    ) => {
      const sideIndex = side === 'left' ? 0 : 1;
      const preview = sectionNavPreviewRefs.current[sideIndex];
      const target = sectionNavButtonRefs.current[side][itemIndex];

      if (!preview || !target) {
        onComplete?.();
        return;
      }

      sectionNavPreviewIndexesRef.current[sideIndex] = itemIndex;
      animateSectionNavRingStroke(side, 4);

      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      gsap.to(preview, {
        y: getSectionNavPreviewOffset(preview, target),
        color: SECTION_NAV_COLORS[itemIndex],
        duration: reducedMotion ? 0 : duration,
        ease: 'power3.out',
        overwrite: 'auto',
        onComplete,
      });
    },
    [animateSectionNavRingStroke]
  );
  const lockSectionNavIndicatorToItem = useCallback(
    (
      side: 'left' | 'right',
      itemIndex: number,
      axis: 'horizontal' | 'vertical',
      onAttached?: () => void
    ) => {
      sectionNavPointerAcquiringRefs.current[side] = false;
      sectionNavClickTargetIndexesRef.current[side] = itemIndex;
      sectionNavClickAxisRefs.current[side] = axis;
      sectionNavClickPhaseRefs.current[side] = onAttached
        ? 'attaching'
        : 'recentering';
      const finishAttachment = onAttached
        ? () => {
            if (
              sectionNavClickTargetIndexesRef.current[side] !== itemIndex ||
              sectionNavClickPhaseRefs.current[side] !== 'attaching'
            ) {
              return;
            }

            sectionNavAttachmentCallbacksRef.current[side] = null;
            sectionNavClickPhaseRefs.current[side] = 'recentering';
            onAttached();
          }
        : undefined;

      sectionNavAttachmentCallbacksRef.current[side] =
        finishAttachment ?? null;
      positionSectionNavClickTarget(
        side,
        itemIndex,
        0.3,
        finishAttachment
      );
    },
    [positionSectionNavClickTarget]
  );
  const settleSectionNavClickTarget = useCallback(
    (side: 'left' | 'right', axis: 'horizontal' | 'vertical') => {
      const itemIndex = sectionNavClickTargetIndexesRef.current[side];

      if (
        itemIndex === null ||
        sectionNavClickAxisRefs.current[side] !== axis ||
        sectionNavClickPhaseRefs.current[side] !== 'recentering'
      ) {
        return;
      }

      positionSectionNavClickTarget(side, itemIndex, 0.2, () => {
        if (sectionNavClickTargetIndexesRef.current[side] !== itemIndex) {
          return;
        }

        sectionNavClickTargetIndexesRef.current[side] = null;
        sectionNavClickPhaseRefs.current[side] = null;
        sectionNavClickAxisRefs.current[side] = null;
        sectionNavAttachmentCallbacksRef.current[side] = null;
        const pointerY = sectionNavPointerYRefs.current[side];

        if (pointerY !== null && sectionNavPointerArmedRefs.current[side]) {
          sectionNavPointerAcquiringRefs.current[side] = true;
          trackSectionNavPointer(side, pointerY);
          return;
        }

        returnSectionNavPointerToIdle(side, false);
      });
    },
    [
      positionSectionNavClickTarget,
      returnSectionNavPointerToIdle,
      trackSectionNavPointer,
    ]
  );
  const settleSectionNavClickTargets = useCallback(
    (axis: 'horizontal' | 'vertical') => {
      settleSectionNavClickTarget('left', axis);
      settleSectionNavClickTarget('right', axis);
    },
    [settleSectionNavClickTarget]
  );
  const settleVerticalSectionNavClickTargets = useCallback(
    (vertical: HTMLDivElement) => {
      (['left', 'right'] as const).forEach((side) => {
        const itemIndex = sectionNavClickTargetIndexesRef.current[side];

        if (
          itemIndex === null ||
          sectionNavClickAxisRefs.current[side] !== 'vertical' ||
          Math.abs(vertical.scrollTop - vertical.clientHeight * itemIndex) > 1
        ) {
          return;
        }

        settleSectionNavClickTarget(side, 'vertical');
      });
    },
    [settleSectionNavClickTarget]
  );

  const projectSlides = useMemo(
    () =>
      Object.fromEntries(
        portfolioSlides.map((project) => [project.slug, getProjectSlides(project)])
      ) as Record<string, ProjectSlide[]>,
    []
  );

  const initialProjectIndex = initialProjectSlug
    ? portfolioSlides.findIndex((project) => project.slug === initialProjectSlug)
    : START_SCREEN_INDEX;
  const normalizedInitialProjectIndex =
    initialProjectIndex >= 0 ? initialProjectIndex : START_SCREEN_INDEX;
  const initialSectionNavIndex = normalizedInitialProjectIndex + 1;
  const initialSectionNavColor =
    SECTION_NAV_COLORS[initialSectionNavIndex] ?? TOP_SCREEN_COLOR;

  const initialSlideIndexes = useMemo(
    () =>
      portfolioSlides.map((project) => {
        if (project.slug !== initialProjectSlug || !initialScreenshotSlug) {
          return 0;
        }

        const screenshotIndex = project.screenshots.findIndex(
          (screenshot) => screenshot.slug === initialScreenshotSlug
        );

        return screenshotIndex >= 0 ? screenshotIndex + 1 : 0;
      }),
    [initialProjectSlug, initialScreenshotSlug]
  );

  const [activeProjectIndex, setActiveProjectIndex] = useState(
    normalizedInitialProjectIndex
  );
  const [activeSlideIndexes, setActiveSlideIndexes] = useState(initialSlideIndexes);
  const isWideLayout = useSyncExternalStore(
    subscribeToWideLayout,
    getWideLayoutSnapshot,
    getWideLayoutServerSnapshot
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [modalTransitionRect, setModalTransitionRect] =
    useState<ModalTransitionRect | null>(null);
  const [modalScale, setModalScale] = useState(1);
  const [modalOffset, setModalOffset] = useState({ x: 0, y: 0 });
  const modalDragRef = useRef({
    pointerId: 0,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    dragging: false,
  });
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);

  const activeProject =
    activeProjectIndex >= 0 ? portfolioSlides[activeProjectIndex] : undefined;
  const activeSlides = activeProject ? projectSlides[activeProject.slug] : [];
  const activeSlideIndex =
    activeProjectIndex >= 0 ? activeSlideIndexes[activeProjectIndex] : 0;
  const activeSlide = activeSlides[activeSlideIndex];
  const activeScreenshot =
    activeSlide?.kind === 'screenshot' ? activeSlide.screenshot : undefined;
  const shouldShowModal =
    isModalOpen &&
    Boolean(activeProject) &&
    Boolean(activeScreenshot) &&
    !(
      activeProject &&
      activeScreenshot &&
      isBuildingWithAiTextScreenshot(activeProject, activeScreenshot)
    );
  const isModalPresentationActive = shouldShowModal && !isModalClosing;
  const isModalLayerActive = shouldShowModal;
  const activeProjectColor =
    activeProjectIndex >= 0 ? getProjectColor(activeProjectIndex) : undefined;

  const focusKeyboardSurface = useCallback(() => {
    keyboardSurfaceRef.current?.focus({ preventScroll: true });
  }, []);

  const resetModalView = useCallback(() => {
    setModalScale(1);
    setModalOffset({ x: 0, y: 0 });
  }, []);

  const resetDescriptionScroll = useCallback((project: PortfolioProject) => {
    descriptionRefs.current[project.slug]?.scrollTo({ top: 0 });
  }, []);

  const setHorizontalRef = useCallback(
    (slideSlug: string) => (node: HTMLDivElement | null) => {
      horizontalRefs.current[slideSlug] = node;
    },
    []
  );

  const setDescriptionRef = useCallback(
    (slideSlug: string) => (node: HTMLDivElement | null) => {
      descriptionRefs.current[slideSlug] = node;
    },
    []
  );

  const getCarouselSlides = useCallback(
    (project: PortfolioProject) => {
      const slides = projectSlides[project.slug];

      if (!isWideLayout) {
        return slides;
      }

      const screenshotSlides = slides.filter((slide) => slide.kind === 'screenshot');

      return screenshotSlides.length > 0 ? screenshotSlides : slides;
    },
    [isWideLayout, projectSlides]
  );

  const getCarouselIndexFromSlideIndex = useCallback(
    (project: PortfolioProject, slideIndex: number) => {
      if (!isWideLayout) {
        return slideIndex;
      }

      const slide = projectSlides[project.slug][slideIndex];

      if (slide?.kind !== 'screenshot') {
        return 0;
      }

      return Math.max(
        0,
        getCarouselSlides(project).findIndex(
          (carouselSlide) => carouselSlide.id === slide.id
        )
      );
    },
    [getCarouselSlides, isWideLayout, projectSlides]
  );

  const getSlideIndexFromCarouselIndex = useCallback(
    (project: PortfolioProject, carouselIndex: number) => {
      const carouselSlides = getCarouselSlides(project);
      const carouselSlide =
        carouselSlides[positiveModulo(carouselIndex, carouselSlides.length)];

      return Math.max(
        0,
        projectSlides[project.slug].findIndex((slide) => slide.id === carouselSlide.id)
      );
    },
    [getCarouselSlides, projectSlides]
  );

  const scrollHorizontalToRealIndex = useCallback(
    (project: PortfolioProject, slideIndex: number, behavior: ScrollBehavior) => {
      const carousel = horizontalRefs.current[project.slug];

      if (!carousel) {
        return;
      }

      const slides = getCarouselSlides(project);
      const nextCarouselIndex = getCarouselIndexFromSlideIndex(
        project,
        slideIndex
      );
      const nextRenderedIndex = getCanonicalRenderedCarouselIndex(
        nextCarouselIndex,
        slides.length
      );

      carousel.scrollTo({
        left: carousel.clientWidth * nextRenderedIndex,
        behavior,
      });
    },
    [getCarouselIndexFromSlideIndex, getCarouselSlides]
  );

  const syncViewport = useCallback(
    (
      projectIndex: number,
      slideIndexes: number[],
      behavior: ScrollBehavior
    ) => {
      const vertical = verticalRef.current;

      if (vertical) {
        vertical.scrollTo({
          top: vertical.clientHeight * (projectIndex + 1),
          behavior,
        });
      }

      portfolioSlides.forEach((project, currentProjectIndex) => {
        scrollHorizontalToRealIndex(
          project,
          slideIndexes[currentProjectIndex] ?? 0,
          behavior
        );
      });
    },
    [scrollHorizontalToRealIndex]
  );

  const readLocationState = useCallback(() => {
    const { pathname, search } = window.location;
    const segments = pathname.split('/').filter(Boolean);

    if (segments[0] !== 'work') {
      return null;
    }

    if (segments.length === 1) {
      return {
        projectIndex: START_SCREEN_INDEX,
        slideIndex: 0,
        modalOpen: false,
      };
    }

    const projectIndex = portfolioSlides.findIndex(
      (project) => project.slug === segments[1]
    );

    if (projectIndex < 0) {
      return null;
    }

    const project = portfolioSlides[projectIndex];
    const slides = projectSlides[project.slug];
    const screenshotSlug = segments[2];
    const slideIndex = screenshotSlug
      ? slides.findIndex(
          (slide) => slide.kind === 'screenshot' && slide.slug === screenshotSlug
        )
      : 0;

    if (segments.length > 3 || slideIndex < 0) {
      return null;
    }

    const slide = slides[slideIndex];
    const modalOpen =
      new URLSearchParams(search).get('modal') === 'image' &&
      slide.kind === 'screenshot' &&
      !isBuildingWithAiTextSlide(project, slide);

    return { projectIndex, slideIndex, modalOpen };
  }, [projectSlides]);

  const applyLocationState = useCallback(
    (behavior: ScrollBehavior) => {
      const locationState = readLocationState();

      if (!locationState) {
        window.location.assign(window.location.href);
        return;
      }

      const nextSlideIndexes = portfolioSlides.map((_, projectIndex) =>
        projectIndex === locationState.projectIndex
          ? locationState.slideIndex
          : activeSlideIndexes[projectIndex] ?? 0
      );

      setActiveProjectIndex(locationState.projectIndex);
      setActiveSlideIndexes(nextSlideIndexes);
      setIsModalOpen(locationState.modalOpen);

      if (!locationState.modalOpen) {
        resetModalView();
      }

      if (locationState.projectIndex === START_SCREEN_INDEX) {
        document.title = pageTitle();
      }

      if (locationState.projectIndex >= 0) {
        const project = portfolioSlides[locationState.projectIndex];
        const slide = projectSlides[project.slug][locationState.slideIndex];
        document.title = pageTitle(project, slide);

        if (slide.kind === 'description') {
          resetDescriptionScroll(project);
        }
      }

      syncViewport(locationState.projectIndex, nextSlideIndexes, behavior);
    },
    [
      activeSlideIndexes,
      projectSlides,
      readLocationState,
      resetDescriptionScroll,
      resetModalView,
      syncViewport,
    ]
  );

  const updateUrl = useCallback(
    (
      project: PortfolioProject | undefined,
      slide: ProjectSlide | undefined,
      mode: 'push' | 'replace'
    ) => {
      const nextPath = project && slide ? projectUrl(project, slide) : '/work';
      const currentPath = `${window.location.pathname}${window.location.search}`;

      if (currentPath === nextPath) {
        return;
      }

      window.history[`${mode}State`]({}, '', nextPath);
      document.title = pageTitle(project, slide);
      modalHistoryEntryRef.current = false;
      resetModalView();
      setIsModalOpen(false);
    },
    [resetModalView]
  );

  const replaceModalUrl = useCallback((project: PortfolioProject, slide: ProjectSlide) => {
    if (!isModalScreenshotSlide(project, slide)) {
      return;
    }

    window.history.replaceState({}, '', `${projectUrl(project, slide)}?modal=image`);
    document.title = pageTitle(project, slide);
  }, []);

  const clearHorizontalScrollSync = useCallback((project?: PortfolioProject) => {
    if (
      project &&
      horizontalScrollSyncProjectRef.current &&
      horizontalScrollSyncProjectRef.current !== project.slug
    ) {
      return;
    }

    horizontalScrollSyncProjectRef.current = null;

    if (horizontalScrollSyncTimeoutRef.current) {
      clearTimeout(horizontalScrollSyncTimeoutRef.current);
      horizontalScrollSyncTimeoutRef.current = null;
    }
  }, []);

  const beginHorizontalScrollSync = useCallback(
    (project: PortfolioProject) => {
      clearHorizontalScrollSync();
      horizontalScrollSyncProjectRef.current = project.slug;
      horizontalScrollSyncTimeoutRef.current = setTimeout(() => {
        if (horizontalScrollSyncProjectRef.current === project.slug) {
          horizontalScrollSyncProjectRef.current = null;
        }

        horizontalScrollSyncTimeoutRef.current = null;
      }, 1000);
    },
    [clearHorizontalScrollSync]
  );

  const setActiveSlide = useCallback(
    (
      projectIndex: number,
      realIndex: number,
      mode: 'push' | 'replace',
      scrollBehavior: ScrollBehavior
    ) => {
      const project = portfolioSlides[projectIndex];
      const slides = projectSlides[project.slug];
      const nextIndex = positiveModulo(realIndex, slides.length);
      const nextSlide = slides[nextIndex];

      setActiveSlideIndexes((indexes) =>
        indexes.map((index, currentProjectIndex) =>
          currentProjectIndex === projectIndex ? nextIndex : index
        )
      );

      if (nextSlide.kind === 'description') {
        resetDescriptionScroll(project);
      }

      if (scrollBehavior === 'smooth') {
        beginHorizontalScrollSync(project);
      }

      scrollHorizontalToRealIndex(project, nextIndex, scrollBehavior);
      updateUrl(project, nextSlide, mode);
    },
    [
      beginHorizontalScrollSync,
      projectSlides,
      resetDescriptionScroll,
      scrollHorizontalToRealIndex,
      updateUrl,
    ]
  );

  const setActiveProject = useCallback(
    (
      nextProjectIndex: number,
      mode: 'push' | 'replace',
      behavior: ScrollBehavior = 'smooth',
      targetSlideIndex?: number
    ) => {
      const boundedIndex = Math.max(
        START_SCREEN_INDEX,
        Math.min(portfolioSlides.length - 1, nextProjectIndex)
      );
      const vertical = verticalRef.current;

      userMovedRef.current = true;
      setActiveProjectIndex(boundedIndex);

      if (vertical) {
        vertical.scrollTo({
          top: vertical.clientHeight * (boundedIndex + 1),
          behavior,
        });
      }

      if (boundedIndex === START_SCREEN_INDEX) {
        updateUrl(undefined, undefined, mode);
        return;
      }

      const project = portfolioSlides[boundedIndex];
      const slideIndex = targetSlideIndex ?? activeSlideIndexes[boundedIndex] ?? 0;
      const slide = projectSlides[project.slug][slideIndex];

      if (targetSlideIndex !== undefined) {
        setActiveSlideIndexes((indexes) =>
          indexes.map((index, currentProjectIndex) =>
            currentProjectIndex === boundedIndex ? slideIndex : index
          )
        );
      }

      if (slide.kind === 'description') {
        resetDescriptionScroll(project);
      }

      scrollHorizontalToRealIndex(project, slideIndex, 'auto');
      updateUrl(project, slide, mode);
    },
    [
      activeSlideIndexes,
      projectSlides,
      resetDescriptionScroll,
      scrollHorizontalToRealIndex,
      updateUrl,
    ]
  );

  const moveHorizontal = useCallback(
    (direction: -1 | 1) => {
      if (activeProjectIndex === START_SCREEN_INDEX) {
        return;
      }

      const currentProject = portfolioSlides[activeProjectIndex];
      const slides = getCarouselSlides(currentProject);
      const currentCarouselIndex = getCarouselIndexFromSlideIndex(
        currentProject,
        activeSlideIndexes[activeProjectIndex] ?? 0
      );
      const nextCarouselIndex = positiveModulo(
        currentCarouselIndex + direction,
        slides.length
      );
      const nextIndex = getSlideIndexFromCarouselIndex(
        currentProject,
        nextCarouselIndex
      );

      setActiveSlide(activeProjectIndex, nextIndex, 'push', 'smooth');
    },
    [
      activeProjectIndex,
      activeSlideIndexes,
      getCarouselIndexFromSlideIndex,
      getCarouselSlides,
      getSlideIndexFromCarouselIndex,
      setActiveSlide,
    ]
  );

  const setActiveModalSlide = useCallback(
    (slide: ProjectSlide, scrollBehavior: ScrollBehavior = 'smooth') => {
      if (!activeProject || activeProjectIndex === START_SCREEN_INDEX) {
        return;
      }

      const slides = projectSlides[activeProject.slug];

      if (!isModalScreenshotSlide(activeProject, slide)) {
        return;
      }

      const nextSlideIndex = Math.max(
        0,
        slides.findIndex((projectSlide) => projectSlide.id === slide.id)
      );

      setActiveSlideIndexes((indexes) =>
        indexes.map((index, currentProjectIndex) =>
          currentProjectIndex === activeProjectIndex ? nextSlideIndex : index
        )
      );

      if (scrollBehavior === 'smooth') {
        beginHorizontalScrollSync(activeProject);
      }

      scrollHorizontalToRealIndex(activeProject, nextSlideIndex, scrollBehavior);
      resetModalView();
      replaceModalUrl(activeProject, slide);
      // After modal-only navigation, Close should land on the current slide.
      modalHistoryEntryRef.current = false;
    },
    [
      activeProject,
      activeProjectIndex,
      beginHorizontalScrollSync,
      projectSlides,
      replaceModalUrl,
      resetModalView,
      scrollHorizontalToRealIndex,
    ]
  );

  const moveModalHorizontal = useCallback(
    (direction: -1 | 1) => {
      if (!activeProject || activeProjectIndex === START_SCREEN_INDEX) {
        return;
      }

      const modalSlides = projectSlides[activeProject.slug].filter((slide) =>
        isModalScreenshotSlide(activeProject, slide)
      );

      if (modalSlides.length < 2) {
        return;
      }

      const currentModalIndex = Math.max(
        0,
        modalSlides.findIndex((slide) => slide.id === activeSlide?.id)
      );
      const nextSlide =
        modalSlides[positiveModulo(currentModalIndex + direction, modalSlides.length)];

      setActiveModalSlide(nextSlide);
    },
    [
      activeProject,
      activeProjectIndex,
      activeSlide,
      projectSlides,
      setActiveModalSlide,
    ]
  );

  const moveVertical = useCallback(
    (direction: -1 | 1) => {
      setActiveProject(
        getVerticalTargetProjectIndex(activeProjectIndex, direction),
        'push'
      );
    },
    [activeProjectIndex, setActiveProject]
  );

  const openModal = useCallback(
    (slide: ProjectSlide = activeSlide, transitionRect?: ModalTransitionRect) => {
      if (
        !activeProject ||
        !slide ||
        slide.kind !== 'screenshot' ||
        isBuildingWithAiTextSlide(activeProject, slide)
      ) {
        return;
      }

      const slideIndex = Math.max(
        0,
        projectSlides[activeProject.slug].findIndex(
          (projectSlide) => projectSlide.id === slide.id
        )
      );

      setActiveSlideIndexes((indexes) =>
        indexes.map((index, currentProjectIndex) =>
          currentProjectIndex === activeProjectIndex ? slideIndex : index
        )
      );
      setIsModalClosing(false);
      setModalTransitionRect(transitionRect ?? null);
      resetModalView();
      window.history.pushState({}, '', `${projectUrl(activeProject, slide)}?modal=image`);
      document.title = pageTitle(activeProject, slide);
      modalHistoryEntryRef.current = true;
      setIsModalOpen(true);
    },
    [activeProject, activeProjectIndex, activeSlide, projectSlides, resetModalView]
  );

  const finishCloseModal = useCallback(() => {
    resetModalView();
    setIsModalClosing(false);
    setModalTransitionRect(null);
    setIsModalOpen(false);

    if (modalHistoryEntryRef.current) {
      modalHistoryEntryRef.current = false;
      window.history.back();
      return;
    }

    if (activeProject && activeSlide) {
      window.history.replaceState({}, '', projectUrl(activeProject, activeSlide));
    }
  }, [activeProject, activeSlide, resetModalView]);

  const closeModal = useCallback(() => {
    if (!shouldShowModal || isModalClosing) {
      return;
    }

    const nextTransitionRect = activeScreenshot
      ? getVisibleScreenshotButtonRect(activeScreenshot.id)
      : modalTransitionRect;

    if (!nextTransitionRect) {
      finishCloseModal();
      return;
    }

    setModalTransitionRect(nextTransitionRect);
    setIsModalClosing(true);
  }, [
    activeScreenshot,
    finishCloseModal,
    isModalClosing,
    modalTransitionRect,
    shouldShowModal,
  ]);

  const reopenModal = useCallback(() => {
    if (!shouldShowModal || !isModalClosing) {
      return;
    }

    setIsModalClosing(false);
  }, [isModalClosing, shouldShowModal]);

  const syncInitialScrollEvent = useEffectEvent(() => {
    syncViewport(normalizedInitialProjectIndex, initialSlideIndexes, 'auto');

    const initialProject =
      normalizedInitialProjectIndex >= 0
        ? portfolioSlides[normalizedInitialProjectIndex]
        : undefined;
    const initialSlide = initialProject
      ? projectSlides[initialProject.slug][
          initialSlideIndexes[normalizedInitialProjectIndex] ?? 0
        ]
      : undefined;

    if (
      window.location.search.includes('modal=image') &&
      initialProject &&
      initialSlide?.kind === 'screenshot' &&
      !isBuildingWithAiTextSlide(initialProject, initialSlide)
    ) {
      setIsModalOpen(true);
    }
  });

  const handlePopStateEvent = useEffectEvent(() => {
    modalHistoryEntryRef.current = false;
    applyLocationState('auto');
  });

  const syncCurrentViewportEvent = useEffectEvent(() => {
    syncViewport(activeProjectIndex, activeSlideIndexes, 'auto');
  });

  const handleVerticalScrollEndEvent = useEffectEvent((vertical: HTMLDivElement) => {
    if (scrollSyncRef.current) {
      return;
    }

    const screenIndex = Math.round(vertical.scrollTop / vertical.clientHeight) - 1;
    const nextProjectIndex = Math.max(
      START_SCREEN_INDEX,
      Math.min(portfolioSlides.length - 1, screenIndex)
    );

    setActiveProjectIndex(nextProjectIndex);

    if (nextProjectIndex === START_SCREEN_INDEX) {
      updateUrl(undefined, undefined, 'replace');
      return;
    }

    const project = portfolioSlides[nextProjectIndex];
    const slideIndex = activeSlideIndexes[nextProjectIndex] ?? 0;
    const slide = projectSlides[project.slug][slideIndex];

    if (slide.kind === 'description') {
      resetDescriptionScroll(project);
    }

    updateUrl(project, slide, 'replace');
  });

  const updateActiveSlideFromScrollEvent = useEffectEvent(
    (
      project: PortfolioProject,
      projectIndex: number,
      carousel: HTMLDivElement
    ) => {
      const slides = getCarouselSlides(project);
      const clonedIndex = Math.round(carousel.scrollLeft / carousel.clientWidth);
      const realIndex = getRealCarouselIndex(clonedIndex, slides.length);
      const nextSlideIndex = getSlideIndexFromCarouselIndex(project, realIndex);

      if (horizontalScrollSyncProjectRef.current === project.slug) {
        return;
      }

      setActiveSlideIndexes((indexes) => {
        if (indexes[projectIndex] === nextSlideIndex) {
          return indexes;
        }

        return indexes.map((index, currentProjectIndex) =>
          currentProjectIndex === projectIndex ? nextSlideIndex : index
        );
      });
    }
  );

  const handleHorizontalScrollEndEvent = useEffectEvent(
    (
      project: PortfolioProject,
      projectIndex: number,
      carousel: HTMLDivElement
    ) => {
      const slides = getCarouselSlides(project);
      const clonedIndex = Math.round(carousel.scrollLeft / carousel.clientWidth);
      let realIndex = getRealCarouselIndex(clonedIndex, slides.length);

      if (clonedIndex === 0) {
        realIndex = slides.length - 1;
        scrollSyncRef.current = true;
        carousel.scrollTo({
          left: carousel.clientWidth * slides.length,
          behavior: 'auto',
        });
        requestAnimationFrame(() => {
          scrollSyncRef.current = false;
        });
      }

      if (clonedIndex === slides.length + 1) {
        realIndex = 0;
        scrollSyncRef.current = true;
        carousel.scrollTo({ left: carousel.clientWidth, behavior: 'auto' });
        requestAnimationFrame(() => {
          scrollSyncRef.current = false;
        });
      }

      const nextIndex = realIndex;
      const nextSlideIndex = getSlideIndexFromCarouselIndex(project, nextIndex);
      const nextSlide = projectSlides[project.slug][nextSlideIndex];

      setActiveSlideIndexes((indexes) =>
        indexes.map((index, currentProjectIndex) =>
          currentProjectIndex === projectIndex ? nextSlideIndex : index
        )
      );

      if (nextSlide.kind === 'description') {
        resetDescriptionScroll(project);
      }

      if (projectIndex === activeProjectIndex) {
        if (isModalOpen && isModalScreenshotSlide(project, nextSlide)) {
          replaceModalUrl(project, nextSlide);
        } else {
          updateUrl(project, nextSlide, 'replace');
        }

        settleSectionNavClickTargets('horizontal');
      }

      clearHorizontalScrollSync(project);
    }
  );
  const clickVerticalSectionNavButton = useCallback(
    (direction: -1 | 1) => {
      const pendingItemIndex =
        sectionNavClickTargetIndexesRef.current.left;
      const navigationBaseProjectIndex =
        pendingItemIndex === null
          ? activeProjectIndex
          : pendingItemIndex - 1;
      const targetProjectIndex = getVerticalTargetProjectIndex(
        navigationBaseProjectIndex,
        direction
      );
      const targetItemIndex = targetProjectIndex + 1;
      const button = sectionNavButtonRefs.current.left[
        targetItemIndex
      ]?.querySelector<HTMLButtonElement>('button');

      if (!button) {
        return false;
      }

      button.click();
      return true;
    },
    [activeProjectIndex]
  );
  const clickHorizontalSlideIndicator = useCallback((direction: -1 | 1) => {
    const navigation = document.querySelector(
      '[data-portfolio-slide-indicators]'
    );
    const activeButton = navigation?.querySelector<HTMLButtonElement>(
      'button[data-portfolio-slide-indicator-index][aria-current="true"]'
    );

    if (!navigation || !activeButton) {
      return false;
    }

    const buttons = Array.from(
      navigation.querySelectorAll<HTMLButtonElement>(
        'button[data-portfolio-slide-indicator-index]'
      )
    ).filter((button) => button.parentElement?.style.pointerEvents !== 'none');
    const activeIndex = Number(
      activeButton.dataset.portfolioSlideIndicatorIndex
    );
    const targetIndex = positiveModulo(activeIndex + direction, buttons.length);
    const targetButton = buttons.find(
      (button) =>
        Number(button.dataset.portfolioSlideIndicatorIndex) === targetIndex
    );

    if (!targetButton) {
      return false;
    }

    targetButton.click();
    return true;
  }, []);

  const handleKeyDownEvent = useEffectEvent((event: KeyboardEvent) => {
    if (shouldShowModal) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        if (isModalClosing) {
          reopenModal();
        } else {
          closeModal();
        }
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (!clickHorizontalSlideIndicator(1)) {
          moveModalHorizontal(1);
        }
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (!clickHorizontalSlideIndicator(-1)) {
          moveModalHorizontal(-1);
        }
        return;
      }

      return;
    }

    if (isTextEntryTarget(event.target)) {
      return;
    }

    if (
      (event.key === 'Enter' || event.code === 'Space') &&
      !isEditableTarget(event.target) &&
      activeProject
    ) {
      const carouselSlides = getCarouselSlides(activeProject);
      const carouselIndex = getCarouselIndexFromSlideIndex(
        activeProject,
        activeSlideIndex
      );
      const slide = carouselSlides[carouselIndex];

      if (slide && isModalScreenshotSlide(activeProject, slide)) {
        event.preventDefault();
        focusKeyboardSurface();
        openModal(
          slide,
          getVisibleScreenshotButtonRect(slide.screenshot.id) ?? undefined
        );
        return;
      }
    }

    if (!event.metaKey && !event.ctrlKey && !event.altKey) {
      if (event.key === '0') {
        event.preventDefault();
        focusKeyboardSurface();
        setActiveProject(START_SCREEN_INDEX, 'push');
        return;
      }

      if (/^[1-9]$/.test(event.key)) {
        const projectIndex = Number(event.key) - 1;

        if (projectIndex < portfolioSlides.length) {
          event.preventDefault();
          focusKeyboardSurface();
          setActiveProject(projectIndex, 'push', 'smooth', 0);
          return;
        }
      }
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!clickVerticalSectionNavButton(1)) {
        focusKeyboardSurface();
        moveVertical(1);
      }
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!clickVerticalSectionNavButton(-1)) {
        focusKeyboardSurface();
        moveVertical(-1);
      }
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (!clickHorizontalSlideIndicator(1)) {
        focusKeyboardSurface();
        moveHorizontal(1);
      }
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (!clickHorizontalSlideIndicator(-1)) {
        focusKeyboardSurface();
        moveHorizontal(-1);
      }
    }
  });

  useLayoutEffect(() => {
    if (initialScrollSyncedRef.current) {
      return;
    }

    initialScrollSyncedRef.current = true;

    const rafId = requestAnimationFrame(() =>
      requestAnimationFrame(syncInitialScrollEvent)
    );

    return () => cancelAnimationFrame(rafId);
  }, []);

  useLayoutEffect(() => {
    const vertical = verticalRef.current;
    const indicators = sectionNavIndicatorRefs.current.filter(
      (indicator): indicator is SVGSVGElement => Boolean(indicator)
    );
    const rings = indicators
      .map((indicator) => indicator.querySelector('circle'))
      .filter((ring): ring is SVGCircleElement => Boolean(ring));
    const previews = sectionNavPreviewRefs.current.filter(
      (preview): preview is SVGGElement => Boolean(preview)
    );
    const leftIcons = sectionNavIconRefs.current.left.filter(
      (icon): icon is SVGSVGElement => Boolean(icon)
    );
    const rightIcons = sectionNavIconRefs.current.right.filter(
      (icon): icon is SVGSVGElement => Boolean(icon)
    );
    const stacks = sectionNavStackRefs.current.filter(
      (stack): stack is HTMLDivElement => Boolean(stack)
    );

    if (
      !vertical ||
      indicators.length === 0 ||
      rings.length !== indicators.length ||
      previews.length !== indicators.length ||
      stacks.length !== indicators.length ||
      leftIcons.length !== SECTION_NAV_COLORS.length ||
      rightIcons.length !== SECTION_NAV_COLORS.length
    ) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      const timelineColors = SECTION_NAV_COLORS.map((color) => {
        const [red, green, blue] = gsap.utils.splitColor(color);

        return `rgb(${red}, ${green}, ${blue})`;
      });
      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          scroller: vertical,
          start: 0,
          end: 'max',
          scrub: true,
          onUpdate: () => {
            previews.forEach((preview, sideIndex) => {
              const previewIndex =
                sectionNavPreviewIndexesRef.current[sideIndex];
              const side = sideIndex === 0 ? 'left' : 'right';
              const clickTargetIndex =
                sectionNavClickTargetIndexesRef.current[side];
              const pointerY = sectionNavPointerYRefs.current[side];

              if (clickTargetIndex !== null) {
                positionSectionNavClickTarget(
                  side,
                  clickTargetIndex,
                  0.12,
                  sectionNavClickPhaseRefs.current[side] === 'attaching'
                    ? sectionNavAttachmentCallbacksRef.current[side] ?? undefined
                    : undefined
                );
                return;
              }

              if (pointerY !== null) {
                trackSectionNavPointer(side, pointerY);
                return;
              }

              const target =
                previewIndex === null || previewIndex === undefined
                  ? null
                  : sectionNavButtonRefs.current[side][previewIndex];

              if (!target) {
                return;
              }

              gsap.set(preview, {
                y: getSectionNavPreviewOffset(preview, target),
              });
            });
          },
        },
      });
      const centeredStackOffsetRem =
        ((SECTION_NAV_COLORS.length - 1) / 2) * SECTION_NAV_ITEM_STEP_REM;

      timeline.set(indicators, {
        y: 0,
        color: timelineColors[0],
      });
      timeline.set(stacks, { y: `${centeredStackOffsetRem}rem` });
      timeline.set(previews, { y: 0 });
      timeline.set(rings, {
        stroke: 'currentColor',
        strokeWidth: 4,
      });
      timeline.set(leftIcons, {
        rotation: (itemIndex) =>
          getSectionNavArrowRotation(itemIndex, 0, 'left'),
        transformOrigin: '50% 50%',
      });
      timeline.set(rightIcons, {
        rotation: (itemIndex) =>
          getSectionNavArrowRotation(itemIndex, 0, 'right'),
        transformOrigin: '50% 50%',
      });

      timelineColors.slice(1).forEach((color, index) => {
        const activeSectionIndex = index + 1;

        timeline.to(
          indicators,
          {
            y: `${(index + 1) * SECTION_NAV_ITEM_STEP_REM}rem`,
            color,
            duration: 1,
          },
          index
        );
        timeline.to(
          stacks,
          {
            y: `${
              centeredStackOffsetRem -
              activeSectionIndex * SECTION_NAV_ITEM_STEP_REM
            }rem`,
            duration: 1,
          },
          index
        );
        timeline.to(
          leftIcons,
          {
            rotation: (itemIndex) =>
              getSectionNavArrowRotation(
                itemIndex,
                activeSectionIndex,
                'left'
              ),
            duration: 1,
          },
          index
        );
        timeline.to(
          rightIcons,
          {
            rotation: (itemIndex) =>
              getSectionNavArrowRotation(
                itemIndex,
                activeSectionIndex,
                'right'
              ),
            duration: 1,
          },
          index
        );
      });
    }, keyboardSurfaceRef);

    return () => context.revert();
  }, [isWideLayout, positionSectionNavClickTarget, trackSectionNavPointer]);

  useEffect(() => {
    window.history.scrollRestoration = 'manual';

    window.addEventListener('popstate', handlePopStateEvent);
    return () => window.removeEventListener('popstate', handlePopStateEvent);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', syncCurrentViewportEvent);
    return () => window.removeEventListener('resize', syncCurrentViewportEvent);
  }, []);

  useEffect(() => {
    syncCurrentViewportEvent();
  }, [isWideLayout]);

  const reevaluateSectionNavPointersEvent = useEffectEvent(() => {
    (['left', 'right'] as const).forEach((side) => {
      const pointerY = sectionNavPointerYRefs.current[side];

      if (pointerY !== null) {
        trackSectionNavPointer(side, pointerY);
      }
    });
  });
  const settleVerticalSectionNavClickTargetsEvent = useEffectEvent(
    (vertical: HTMLDivElement) => {
      settleVerticalSectionNavClickTargets(vertical);
    }
  );

  useEffect(() => {
    const vertical = verticalRef.current;

    if (!vertical) {
      return;
    }

    const handleVerticalScroll = () => {
      if (sectionNavIsMovingRef.current) {
        return;
      }

      sectionNavIsMovingRef.current = true;
      reevaluateSectionNavPointersEvent();
    };
    const handleVerticalScrollEnd = () => {
      sectionNavIsMovingRef.current = false;
      handleVerticalScrollEndEvent(vertical);
      requestAnimationFrame(() => {
        settleVerticalSectionNavClickTargetsEvent(vertical);
        reevaluateSectionNavPointersEvent();
      });
    };

    vertical.addEventListener('scroll', handleVerticalScroll, { passive: true });
    vertical.addEventListener('scrollend', handleVerticalScrollEnd);
    return () => {
      vertical.removeEventListener('scroll', handleVerticalScroll);
      vertical.removeEventListener('scrollend', handleVerticalScrollEnd);
    };
  }, []);

  useEffect(() => {
    const cleanupFns = portfolioSlides.map((project, projectIndex) => {
      const carousel = horizontalRefs.current[project.slug];

      if (!carousel) {
        return () => {};
      }

      const updateActiveSlideFromScroll = () =>
        updateActiveSlideFromScrollEvent(project, projectIndex, carousel);
      const handleHorizontalScrollEnd = () =>
        handleHorizontalScrollEndEvent(project, projectIndex, carousel);
      carousel.addEventListener('scroll', updateActiveSlideFromScroll, {
        passive: true,
      });
      carousel.addEventListener('scrollend', handleHorizontalScrollEnd);
      return () => {
        carousel.removeEventListener('scroll', updateActiveSlideFromScroll);
        carousel.removeEventListener('scrollend', handleHorizontalScrollEnd);
      };
    });

    return () => cleanupFns.forEach((cleanup) => cleanup());
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDownEvent);
    return () => window.removeEventListener('keydown', handleKeyDownEvent);
  }, []);

  useEffect(
    () => () => {
      clearHorizontalScrollSync();
    },
    [clearHorizontalScrollSync]
  );

  useEffect(
    () => () => {
      Object.values(sectionNavPreviewReturnTimeoutRefs.current).forEach(
        (timeout) => {
          if (timeout) {
            clearTimeout(timeout);
          }
        }
      );
    },
    []
  );

  const activeCarouselSlides = activeProject ? getCarouselSlides(activeProject) : [];
  const activeModalSlides = activeProject
    ? projectSlides[activeProject.slug].filter((slide) =>
        isModalScreenshotSlide(activeProject, slide)
      )
    : [];
  const activeModalScreenshots = activeModalSlides.map((slide) => slide.screenshot);
  const activeCarouselIndex = activeProject
    ? getCarouselIndexFromSlideIndex(activeProject, activeSlideIndex)
    : 0;
  const activeModalScreenshotIndex = Math.max(
    0,
    activeModalSlides.findIndex((slide) => slide.id === activeSlide?.id)
  );
  const activeNavigationSlides = isModalPresentationActive
    ? activeModalSlides
    : activeCarouselSlides;
  const activeNavigationIndex = isModalPresentationActive
    ? activeModalScreenshotIndex
    : activeCarouselIndex;
  const canMoveHorizontally = activeNavigationSlides.length > 1;
  const previousSlide = activeProject
    ? activeNavigationSlides[
        positiveModulo(activeNavigationIndex - 1, activeNavigationSlides.length)
      ]
    : undefined;
  const nextSlide = activeProject
    ? activeNavigationSlides[
        positiveModulo(activeNavigationIndex + 1, activeNavigationSlides.length)
      ]
    : undefined;
  const previousSlideTitle =
    activeProject && previousSlide
      ? slideNavigationTitle(activeProject, previousSlide)
      : '';
  const nextSlideTitle =
    activeProject && nextSlide ? slideNavigationTitle(activeProject, nextSlide) : '';
  const sectionNavItems = [
    {
      id: 'work',
      projectIndex: START_SCREEN_INDEX,
      title: 'Work',
      color: TOP_SCREEN_COLOR,
    },
    ...portfolioSlides.map((project, projectIndex) => ({
      id: project.id,
      projectIndex,
      title: project.title,
      color: getProjectColor(projectIndex),
    })),
  ];
  const previewSectionNavItem = useCallback(
    (
      side: 'left' | 'right',
      itemIndex: number,
      color: string,
      previewed: boolean
    ) => {
      const sideIndex = side === 'left' ? 0 : 1;
      const returnTimeout = sectionNavPreviewReturnTimeoutRefs.current[side];

      if (returnTimeout) {
        clearTimeout(returnTimeout);
        sectionNavPreviewReturnTimeoutRefs.current[side] = null;
      }

      if (sectionNavPointerYRefs.current[side] !== null) {
        return;
      }

      const animatePreview = (active: boolean) => {
        const indicator = sectionNavIndicatorRefs.current[sideIndex];
        const preview = sectionNavPreviewRefs.current[sideIndex];
        const target = sectionNavButtonRefs.current[side][itemIndex];

        if (!indicator || !preview || !target) {
          return;
        }

        sectionNavPreviewIndexesRef.current[sideIndex] = active
          ? itemIndex
          : null;
        const inheritedColor = getComputedStyle(indicator).color;
        const reducedMotion = window.matchMedia(
          '(prefers-reduced-motion: reduce)'
        ).matches;
        const pointerY = sectionNavPointerYRefs.current[side];

        gsap.to(preview, {
          y: active
            ? pointerY === null
              ? getSectionNavPreviewOffset(preview, target)
              : getSectionNavPreviewOffsetFromClientY(preview, pointerY)
            : 0,
          color: active ? color : inheritedColor,
          duration: reducedMotion ? 0 : 0.3,
          ease: 'power3.out',
          overwrite: 'auto',
          onComplete: () => {
            if (
              !active &&
              sectionNavPreviewIndexesRef.current[sideIndex] === null
            ) {
              gsap.set(preview, { clearProps: 'color' });
            }
          },
        });
      };

      if (previewed) {
        animatePreview(true);
        return;
      }

      sectionNavPreviewReturnTimeoutRefs.current[side] = setTimeout(() => {
        sectionNavPreviewReturnTimeoutRefs.current[side] = null;
        animatePreview(false);
      }, SECTION_NAV_PREVIEW_RETURN_DELAY_MS);
    },
    []
  );
  const sideNavStackStyle: CSSProperties = {
    transform: `translateY(${
      ((sectionNavItems.length - 1) / 2 - initialSectionNavIndex) *
      SECTION_NAV_ITEM_STEP_REM
    }rem)`,
  };
  const sideNavInteractiveZoneStyle: CSSProperties = {
    height: `${
      NAVIGATION_RING_SIZE_REM +
      Math.max(sectionNavItems.length - 1, 0) * SECTION_NAV_ITEM_STEP_REM * 2
    }rem`,
  };
  const renderSectionNavButton = (
    item: (typeof sectionNavItems)[number],
    side: 'left' | 'right',
    itemIndex: number
  ) => {
    const isActiveSection = item.projectIndex === activeProjectIndex;
    const isActiveProjectSection =
      isActiveSection && item.projectIndex !== START_SCREEN_INDEX;
    const isLeftSide = side === 'left';
    const tooltipId = `portfolio-${side}-section-${item.id}-tooltip`;
    const hasHorizontalAction = isActiveProjectSection && canMoveHorizontally;

    const label = hasHorizontalAction
      ? isLeftSide
        ? 'Previous screen'
        : 'Next screen'
      : isActiveSection
        ? `Current section: ${item.title}`
        : `Show ${item.title}`;
    const tooltipTitle = hasHorizontalAction
      ? isLeftSide
        ? previousSlideTitle
        : nextSlideTitle
      : item.title;

    return (
      <SideNavButton
        key={`${side}-${item.id}`}
        icon={faArrowDown}
        iconRef={(node) => {
          sectionNavIconRefs.current[side][itemIndex] = node;
        }}
        elementRef={(node) => {
          sectionNavButtonRefs.current[side][itemIndex] = node;
        }}
        label={label}
        tooltipTitle={tooltipTitle}
        tooltipId={tooltipId}
        side={side}
        color={item.color}
        activeButton={isActiveSection}
        concealed={isModalPresentationActive && !isActiveSection}
        onPreviewChange={(previewed) =>
          previewSectionNavItem(side, itemIndex, item.color, previewed)
        }
        onPointerEngage={(pointerY) =>
          engageSectionNavPointer(side, pointerY)
        }
        onClick={(event) => {
          focusKeyboardSurface();

          if (hasHorizontalAction) {
            lockSectionNavIndicatorToItem(side, itemIndex, 'horizontal');

            if (isModalPresentationActive) {
              moveModalHorizontal(isLeftSide ? -1 : 1);
            } else {
              moveHorizontal(isLeftSide ? -1 : 1);
            }
            return;
          }

          if (!isActiveSection) {
            const showProject = () =>
              setActiveProject(item.projectIndex, 'push');

            if (event.detail === 0) {
              lockSectionNavIndicatorToItem(
                side,
                itemIndex,
                'vertical',
                showProject
              );
            } else {
              lockSectionNavIndicatorToItem(side, itemIndex, 'vertical');
              showProject();
            }
          }
        }}
      />
    );
  };
  const renderSectionNavRail = (side: 'left' | 'right') => {
    const sideIndex = side === 'left' ? 0 : 1;
    const positionClass =
      side === 'left' ? 'left-3 sm:left-6' : 'right-3 sm:right-6';

    return (
      <div
        data-portfolio-section-nav-zone={side}
        className={`fixed top-1/2 w-12 -translate-y-1/2 ${positionClass} ${
          isModalLayerActive ? 'z-[60]' : 'z-20'
        }`}
        style={sideNavInteractiveZoneStyle}
        onPointerMove={(event) => {
          if (sectionNavPointerArmedRefs.current[side]) {
            trackSectionNavPointer(side, event.clientY);
          }
        }}
        onPointerLeave={() => returnSectionNavPointerToIdle(side, true)}
        onWheel={(event) => {
          const vertical = verticalRef.current;

          if (!vertical) {
            return;
          }

          event.preventDefault();
          const deltaScale =
            event.deltaMode === WheelEvent.DOM_DELTA_LINE
              ? 16
              : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
                ? vertical.clientHeight
                : 1;

          vertical.scrollBy({ top: event.deltaY * deltaScale });
        }}
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
          <div
            ref={(node) => {
              sectionNavStackRefs.current[sideIndex] = node;
            }}
            className="relative flex flex-col gap-3"
            style={sideNavStackStyle}
          >
            <NavigationActiveRing
              color={initialSectionNavColor}
              elementRef={(node) => {
                sectionNavIndicatorRefs.current[sideIndex] = node;
              }}
              previewElementRef={(node) => {
                sectionNavPreviewRefs.current[sideIndex] = node;
              }}
              className="absolute left-0 top-0 z-0"
              style={{
                transform: `translate3d(0, ${
                  initialSectionNavIndex * SECTION_NAV_ITEM_STEP_REM
                }rem, 0)`,
              }}
              dataAttributes={{
                'data-portfolio-section-nav-fill': side,
              }}
              previewDataAttributes={{
                'data-portfolio-section-nav-preview': side,
              }}
            />
            {sectionNavItems.map((item, itemIndex) =>
              renderSectionNavButton(item, side, itemIndex)
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <main
      ref={keyboardSurfaceRef}
      tabIndex={-1}
      className="h-dvh overflow-hidden bg-black text-white outline-none"
    >
      <div
        ref={verticalRef}
        className="h-dvh snap-y snap-mandatory overflow-y-auto overscroll-none portfolio-scrollbar-none"
      >
        <section className="relative flex h-dvh snap-start snap-always flex-col justify-center px-6 py-16 sm:px-10 lg:px-16">
          <div className="absolute inset-x-0 top-6 px-6 sm:px-10 lg:px-16">
            <div
              className={`mx-auto flex w-full max-w-6xl gap-4 ${
                isWideLayout
                  ? 'items-center justify-between'
                  : 'flex-col items-start justify-start'
              }`}
            >
              <div className="flex shrink-0 items-center gap-5">
                <svg
                  className="size-12 shrink-0 text-white"
                  viewBox="0 0 7 7"
                  aria-hidden="true"
                >
                  <rect x="1" y="1" width="1" height="1" fill="currentColor" />
                  <rect x="5" y="1" width="1" height="1" fill="currentColor" />
                  <rect x="1" y="2" width="1" height="1" fill="currentColor" />
                  <rect x="3" y="2" width="1" height="1" fill="currentColor" />
                  <rect x="5" y="2" width="1" height="1" fill="currentColor" />
                  <rect x="1" y="3" width="1" height="1" fill="currentColor" />
                  <rect x="5" y="3" width="1" height="1" fill="currentColor" />
                  <rect x="1" y="4" width="1" height="1" fill="currentColor" />
                  <rect x="3" y="4" width="1" height="1" fill="currentColor" />
                  <rect x="5" y="4" width="1" height="1" fill="currentColor" />
                  <rect x="1" y="5" width="1" height="1" fill="currentColor" />
                  <rect x="2" y="5" width="1" height="1" fill="currentColor" />
                  <rect x="3" y="5" width="1" height="1" fill="currentColor" />
                  <rect x="4" y="5" width="1" height="1" fill="currentColor" />
                  <rect x="5" y="5" width="1" height="1" fill="currentColor" />
                </svg>
                <p className="text-base font-light text-white/70">Aaron M. Wright</p>
              </div>
              <address
                className={`flex min-w-0 flex-col gap-1 text-base font-light not-italic leading-relaxed text-white/70 ${
                  isWideLayout ? 'items-end text-right' : 'items-start text-left'
                }`}
              >
                <p>302-70 Dyrgas Gate</p>
                <p>
                  Canmore, Alberta <span className="whitespace-nowrap">T1W 3J6</span>
                </p>
                <p
                  className={`flex flex-wrap gap-x-3 gap-y-1 ${
                    isWideLayout ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <a
                    className="transition-colors hover:text-white focus-visible:text-white"
                    href="tel:+16477469426"
                  >
                    +1-647-746-9426
                  </a>
                  <a
                    className="transition-colors hover:text-white focus-visible:text-white"
                    href="mailto:aaron@aaronwright.ca"
                  >
                    aaron@aaronwright.ca
                  </a>
                </p>
                <p>
                  <Link
                    className="inline-flex items-center gap-2 transition-colors hover:text-white focus-visible:text-white"
                    href="/resume.pdf"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FontAwesomeIcon icon={faFilePdf} className="size-4" />
                    <span>Resume</span>
                  </Link>
                </p>
              </address>
            </div>
          </div>
          <div className="mx-auto w-full max-w-6xl">
            <p className="mb-[clamp(0.65rem,1.6vh,2rem)] text-xs font-light uppercase tracking-[0.35em] text-white/45">
              Sections
            </p>
            <div className="divide-y divide-white/15 border-y border-white/15">
              {portfolioSlides.map((project, index) => (
                <button
                  key={project.id}
                  type="button"
                  className={`w-full items-center gap-[clamp(0.75rem,1.8vh,1.5rem)] py-[clamp(0.2rem,0.65vh,0.75rem)] text-left text-white outline-none transition-colors hover:text-[var(--project-color)] focus-visible:text-[var(--project-color)] sm:py-[clamp(0.3rem,0.85vh,1.25rem)] ${
                    isWideLayout
                      ? 'grid grid-cols-[minmax(0,1fr)_36ch]'
                      : 'flex justify-between'
                  }`}
                  style={
                    {
                      '--project-color': getProjectColor(index),
                    } as ProjectColorStyle
                  }
                  onClick={() => {
                    focusKeyboardSurface();
                    setActiveProject(index, 'push', 'smooth', 0);
                  }}
                >
                  {isWideLayout ? (
                    <>
                      <span className="flex min-w-0 items-center">
                        <span className="-ml-12 w-12 shrink-0 text-sm font-light text-current sm:text-base">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <SectionTitle color={getProjectColor(index)}>
                          {project.title}
                        </SectionTitle>
                      </span>
                      <SectionBlurb className="justify-self-start">
                        {project.blurb}
                      </SectionBlurb>
                    </>
                  ) : (
                    <span className="flex min-w-0 flex-col gap-[clamp(0.15rem,0.55vh,0.75rem)]">
                      <SectionTitle color={getProjectColor(index)}>
                        {project.title}
                      </SectionTitle>
                      <SectionBlurb>{project.blurb}</SectionBlurb>
                    </span>
                  )}
                  {!isWideLayout ? (
                    <span className="text-sm font-light text-current sm:text-base">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </section>

        {portfolioSlides.map((project, projectIndex) => {
          const slides = getCarouselSlides(project);
          const renderedSlides = getLoopingCarouselEntries(slides, true);
          const projectNumber = String(projectIndex + 1).padStart(2, '0');
          const activeCarouselIndex = getCarouselIndexFromSlideIndex(
            project,
            activeSlideIndexes[projectIndex] ?? 0
          );

          return (
            <section
              key={project.id}
              className="relative h-dvh snap-start snap-always overflow-hidden bg-black"
              aria-label={project.title}
              style={WIDE_LAYOUT_STYLE}
            >
              {isWideLayout && !hasBuildingWithAiTextSlide(project) ? (
                <ProjectDescription
                  project={project}
                  projectNumber={projectNumber}
                  projectColor={getProjectColor(projectIndex)}
                  setDescriptionRef={setDescriptionRef(project.slug)}
                  isWideLayout={isWideLayout}
                  className="absolute bottom-10 left-0 top-10 z-10 w-[var(--portfolio-description-rail-width)] bg-black/80 py-6 pl-[var(--portfolio-control-gutter-width)] pr-6 backdrop-blur-md"
                />
              ) : null}
              <div
                ref={setHorizontalRef(project.slug)}
                data-portfolio-carousel={project.slug}
                className={`flex h-dvh snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain portfolio-scrollbar-none ${
                  isWideLayout ? 'w-screen' : ''
                }`}
              >
                {renderedSlides.map(({ item: slide, key, realIndex }) => (
                  <ProjectPanel
                    key={`${project.id}-${key}`}
                    project={project}
                    projectNumber={projectNumber}
                    projectColor={getProjectColor(projectIndex)}
                    slide={slide}
                    isWideLayout={isWideLayout}
                    isActive={
                      activeProjectIndex === projectIndex &&
                      activeCarouselIndex === realIndex
                    }
                    setDescriptionRef={setDescriptionRef(project.slug)}
                    onScreenshotClick={openModal}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {isWideLayout ? (
        <>
          {renderSectionNavRail('left')}
          {renderSectionNavRail('right')}
        </>
      ) : null}

      {!isWideLayout ? (
        <div
          className={`fixed bottom-5 right-5 z-30 grid size-12 place-items-center transition-opacity duration-300 ease-out ${
            activeProjectIndex === START_SCREEN_INDEX
              ? 'pointer-events-none opacity-0'
              : 'opacity-100'
          }`}
        >
          <CircularIconButton
            icon={faArrowUp}
            iconClassName="size-7"
            ring
            className="relative size-12 bg-transparent text-[var(--project-color)]"
            style={
              {
                '--project-color': activeProjectColor ?? getProjectColor(0),
              } as ProjectColorStyle
            }
            aria-label="Back to work"
            onClick={() => {
              focusKeyboardSurface();
              setActiveProject(START_SCREEN_INDEX, 'push');
            }}
          />
        </div>
      ) : null}

      <nav
        className={`pointer-events-none fixed inset-x-0 bottom-5 ${
          isWideLayout
            ? 'grid grid-cols-[minmax(var(--portfolio-description-rail-width),1fr)_var(--portfolio-screenshot-size)_var(--portfolio-control-gutter-width)]'
            : 'flex justify-center px-6'
        } ${isModalLayerActive ? 'z-[60]' : 'z-20'}`}
        aria-label={
          activeProject ? `${activeProject.title} screens` : 'Portfolio screens'
        }
        style={
          {
            ...WIDE_LAYOUT_STYLE,
            '--project-color': activeProjectColor ?? getProjectColor(0),
            '--portfolio-modal-indicator-translate-x':
              'calc(var(--portfolio-control-gutter-width) + (var(--portfolio-screenshot-size) / 2) - 50vw)',
          } as ProjectColorStyle &
            WideLayoutStyle & {
              '--portfolio-modal-indicator-translate-x': string;
            }
        }
      >
        <div
          className={`relative transition-transform duration-500 ease-out motion-reduce:transition-none ${
            isWideLayout ? 'col-start-2 justify-self-center' : ''
          } ${
            isWideLayout && isModalPresentationActive
              ? 'translate-x-[var(--portfolio-modal-indicator-translate-x)] will-change-transform'
              : 'translate-x-0'
          }`}
        >
          <AnimatedSlideIndicators
            projectTitle={activeProject?.title ?? 'Portfolio'}
            slides={activeNavigationSlides}
            activeIndex={activeNavigationIndex}
            color={activeProjectColor ?? getProjectColor(0)}
            onSelect={(slide) => {
              if (!activeProject) {
                return;
              }

              focusKeyboardSurface();
              const slideIndex = Math.max(
                0,
                projectSlides[activeProject.slug].findIndex(
                  (projectSlide) => projectSlide.id === slide.id
                )
              );

              if (isModalPresentationActive) {
                setActiveModalSlide(slide);
                return;
              }

              setActiveSlide(activeProjectIndex, slideIndex, 'push', 'smooth');
            }}
          />
        </div>
      </nav>

      {shouldShowModal && activeProject && activeScreenshot ? (
        <ImageModal
          project={activeProject}
          projectColor={activeProjectColor}
          screenshot={activeScreenshot}
          screenshots={activeModalScreenshots}
          activeScreenshotIndex={activeModalScreenshotIndex}
          transitionRect={modalTransitionRect}
          isClosing={isModalClosing}
          scale={modalScale}
          offset={modalOffset}
          dragRef={modalDragRef}
          pinchRef={pinchRef}
          setScale={setModalScale}
          setOffset={setModalOffset}
          onClose={closeModal}
          onExited={finishCloseModal}
        />
      ) : null}
    </main>
  );
}

function SectionTitle({
  children,
  color,
}: {
  children: string;
  color: string;
}) {
  return (
    <span
      className="min-w-0 text-[clamp(1.1rem,3.4vh,2rem)] font-black uppercase leading-none tracking-normal sm:text-[clamp(1.25rem,4.2vh,4.2rem)] lg:text-[clamp(1.5rem,4.8vh,4.8rem)]"
      style={{ color }}
    >
      {children}
    </span>
  );
}

function SectionBlurb({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <span
      className={`max-w-[54ch] text-[clamp(0.58rem,1.25vh,0.82rem)] font-light normal-case leading-snug tracking-normal text-current opacity-70 sm:text-[clamp(0.68rem,1.45vh,1rem)] ${
        className ?? ''
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        allowedElements={['p', 'strong', 'em', 'code', 'br', 'del', 'abbr']}
        unwrapDisallowed
        components={INLINE_MARKDOWN_COMPONENTS}
      >
        {children}
      </ReactMarkdown>
    </span>
  );
}

type IndicatorTransitionState = {
  previousCount: number;
  targetCount: number;
  phase: 'idle' | 'preparing' | 'animating';
};

function AnimatedSlideIndicators({
  projectTitle,
  slides,
  activeIndex,
  color,
  onSelect,
}: {
  projectTitle: string;
  slides: ProjectSlide[];
  activeIndex: number;
  color: string;
  onSelect: (slide: ProjectSlide) => void;
}) {
  const visibleSlides = slides.length > 1 ? slides : [];
  const targetCount = visibleSlides.length;
  const slidesIdentity = visibleSlides.map((slide) => slide.id).join('|');
  const previousCountRef = useRef(targetCount);
  const transitionFrameRef = useRef<number | null>(null);
  const transitionStartFrameRef = useRef<number | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const ringRef = useRef<SVGSVGElement | null>(null);
  const ringTweenRef = useRef<gsap.core.Tween | null>(null);
  const previewReturnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const previewSourceIndexesRef = useRef<
    Record<'hover' | 'focus', number | null>
  >({ hover: null, focus: null });
  const [previewState, setPreviewState] = useState<{
    slidesIdentity: string;
    index: number | null;
  }>({ slidesIdentity, index: null });
  const [transitionState, setTransitionState] =
    useState<IndicatorTransitionState>({
      previousCount: targetCount,
      targetCount,
      phase: 'idle',
    });

  if (previewState.slidesIdentity !== slidesIdentity) {
    previewSourceIndexesRef.current = { hover: null, focus: null };
    setPreviewState({ slidesIdentity, index: null });
  }

  const previewIndex = previewState.index;

  const clearPreviewReturnTimeout = () => {
    if (!previewReturnTimeoutRef.current) {
      return;
    }

    clearTimeout(previewReturnTimeoutRef.current);
    previewReturnTimeoutRef.current = null;
  };

  const startPreview = (index: number, source: 'hover' | 'focus') => {
    clearPreviewReturnTimeout();
    previewSourceIndexesRef.current[source] = index;
    setPreviewState({ slidesIdentity, index });
  };

  const endPreview = (index: number, source: 'hover' | 'focus') => {
    if (previewSourceIndexesRef.current[source] !== index) {
      return;
    }

    previewSourceIndexesRef.current[source] = null;
    const remainingPreviewIndex =
      previewSourceIndexesRef.current.focus ??
      previewSourceIndexesRef.current.hover;

    if (remainingPreviewIndex !== null) {
      clearPreviewReturnTimeout();
      setPreviewState({ slidesIdentity, index: remainingPreviewIndex });
      return;
    }

    clearPreviewReturnTimeout();
    previewReturnTimeoutRef.current = setTimeout(() => {
      previewReturnTimeoutRef.current = null;
      setPreviewState((current) =>
        current.slidesIdentity === slidesIdentity
          ? { ...current, index: null }
          : current
      );
    }, SECTION_NAV_PREVIEW_RETURN_DELAY_MS);
  };

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
    setTransitionState({
      previousCount,
      targetCount,
      phase: 'preparing',
    });

    transitionFrameRef.current = requestAnimationFrame(() => {
      transitionStartFrameRef.current = requestAnimationFrame(() => {
        transitionFrameRef.current = null;
        transitionStartFrameRef.current = null;
        setTransitionState({
          previousCount,
          targetCount,
          phase: 'animating',
        });

        const longestStagger =
          Math.max(previousCount, targetCount, 1) *
          NAVIGATION_INDICATOR_PAIR_STAGGER_MS;

        transitionTimeoutRef.current = setTimeout(() => {
          transitionTimeoutRef.current = null;
          setTransitionState({
            previousCount: targetCount,
            targetCount,
            phase: 'idle',
          });
        }, NAVIGATION_INDICATOR_TRANSITION_MS + longestStagger);
      });
    });

    return () => {
      if (transitionFrameRef.current !== null) {
        cancelAnimationFrame(transitionFrameRef.current);
      }

      if (transitionStartFrameRef.current !== null) {
        cancelAnimationFrame(transitionStartFrameRef.current);
      }

      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [targetCount]);

  useEffect(() => clearPreviewReturnTimeout, []);

  const previousSlotIds = getIndicatorSlotIds(
    transitionState.phase === 'idle'
      ? transitionState.targetCount
      : transitionState.previousCount
  );
  const targetSlotIds = getIndicatorSlotIds(transitionState.targetCount);
  const renderedSlotIds =
    transitionState.phase === 'idle'
      ? targetSlotIds
      : Array.from(new Set([...previousSlotIds, ...targetSlotIds])).sort(
          (a, b) => a - b
        );
  const boundedActiveIndex = Math.max(
    0,
    Math.min(activeIndex, Math.max(targetCount - 1, 0))
  );
  const boundedPreviewIndex =
    previewIndex === null
      ? null
      : Math.max(0, Math.min(previewIndex, Math.max(targetCount - 1, 0)));
  const ringTargetIndex = boundedPreviewIndex ?? boundedActiveIndex;

  useLayoutEffect(() => {
    const ring = ringRef.current;

    if (!ring) {
      return;
    }

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const targetXRem =
      ringTargetIndex * NAVIGATION_INDICATOR_STEP_REM +
      (NAVIGATION_INDICATOR_STEP_REM - NAVIGATION_RING_SIZE_REM) / 2;
    const hasPosition = ring.dataset.positioned === 'true';

    ringTweenRef.current?.kill();

    if (!hasPosition) {
      gsap.set(ring, {
        x: `${targetXRem}rem`,
        yPercent: -50,
        color,
        opacity: targetCount > 0 ? 1 : 0,
      });
      ring.dataset.positioned = 'true';
      return;
    }

    const tween = gsap.to(ring, {
      x: `${targetXRem}rem`,
      yPercent: -50,
      color,
      opacity: targetCount > 0 ? 1 : 0,
      duration: reducedMotion ? 0 : 0.5,
      ease: 'power3.out',
      overwrite: 'auto',
    });
    ringTweenRef.current = tween;

    return () => {
      if (ringTweenRef.current === tween) {
        ringTweenRef.current = null;
      }
      tween.kill();
    };
  }, [color, ringTargetIndex, targetCount]);

  return (
    <div
      data-portfolio-slide-indicators
      className="relative h-[3.25rem] transition-[width] duration-500 ease-out motion-reduce:transition-none"
      style={{
        width: `${Math.max(targetCount, 1) * NAVIGATION_INDICATOR_STEP_REM}rem`,
      }}
    >
      <NavigationActiveRing
        color={color}
        elementRef={(node) => {
          ringRef.current = node;
        }}
        className="absolute left-0 top-1/2 z-10"
        dataAttributes={{ 'data-portfolio-slide-indicator-marker': 'true' }}
      />
      {renderedSlotIds.map((slotId) => {
        const previousIndex = previousSlotIds.indexOf(slotId);
        const targetIndex = targetSlotIds.indexOf(slotId);
        const isEntering = previousIndex < 0 && targetIndex >= 0;
        const isExiting = previousIndex >= 0 && targetIndex < 0;
        const usePreviousPosition =
          isExiting ||
          (transitionState.phase === 'preparing' && previousIndex >= 0);
        const positionIndex = usePreviousPosition ? previousIndex : targetIndex;
        const positionCount = usePreviousPosition
          ? transitionState.previousCount
          : transitionState.targetCount;
        const isVisible =
          transitionState.phase === 'idle'
            ? targetIndex >= 0
            : transitionState.phase === 'preparing'
              ? previousIndex >= 0
              : targetIndex >= 0;
        const staggerDelay =
          transitionState.phase === 'animating' && (isEntering || isExiting)
            ? getOutsideInDelay(
                usePreviousPosition ? previousIndex : targetIndex,
                usePreviousPosition
                  ? transitionState.previousCount
                  : transitionState.targetCount
              )
            : 0;
        const slide = targetIndex >= 0 ? visibleSlides[targetIndex] : undefined;

        return (
          <div
            key={slotId}
            data-portfolio-slide-indicator-slot={slotId}
            data-indicator-presence={
              isEntering ? 'entering' : isExiting ? 'exiting' : 'retained'
            }
            className="absolute left-1/2 top-1/2 grid size-7 place-items-center transition-[opacity,transform] duration-500 [transition-timing-function:cubic-bezier(0.19,1,0.22,1)] motion-reduce:transition-none"
            style={{
              opacity: isVisible ? 1 : 0,
              pointerEvents: slide && isVisible ? 'auto' : 'none',
              transform: getCenteredIndicatorTransform(
                positionIndex,
                Math.max(positionCount, 1)
              ),
              transitionDelay: `${staggerDelay}ms`,
            }}
          >
            {slide ? (
              <button
                type="button"
                className="pointer-events-auto grid size-7 place-items-center outline-none"
                aria-label={
                  slide.kind === 'description'
                    ? `Show ${projectTitle} description`
                    : `Show ${slide.screenshot.alt}`
                }
                aria-current={
                  boundedActiveIndex === targetIndex ? 'true' : undefined
                }
                data-portfolio-slide-indicator-index={targetIndex}
                data-interactive-pop-companion='[data-portfolio-slide-indicator-marker="true"] circle'
                onMouseEnter={() => startPreview(targetIndex, 'hover')}
                onMouseLeave={() => endPreview(targetIndex, 'hover')}
                onFocus={() => startPreview(targetIndex, 'focus')}
                onBlur={() => endPreview(targetIndex, 'focus')}
                onClick={() => onSelect(slide)}
              >
                <span className={NAVIGATION_DOT_CLASS} aria-hidden="true" />
              </button>
            ) : (
              <span className={NAVIGATION_DOT_CLASS} aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function NavigationActiveRing({
  color,
  elementRef,
  previewElementRef,
  className,
  style,
  dataAttributes,
  previewDataAttributes,
}: {
  color: string;
  elementRef?: (node: SVGSVGElement | null) => void;
  previewElementRef?: (node: SVGGElement | null) => void;
  className: string;
  style?: CSSProperties;
  dataAttributes?: Record<`data-${string}`, string>;
  previewDataAttributes?: Record<`data-${string}`, string>;
}) {
  return (
    <svg
      ref={elementRef}
      {...dataAttributes}
      className={`pointer-events-none size-12 overflow-visible ${className}`}
      viewBox="0 0 48 48"
      style={{
        color,
        ...style,
      }}
      aria-hidden="true"
    >
      <g ref={previewElementRef} {...previewDataAttributes}>
        <circle
          cx="24"
          cy="24"
          r="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}
        />
      </g>
    </svg>
  );
}

function SideNavButton({
  icon,
  elementRef,
  iconRef,
  label,
  tooltipTitle,
  tooltipId,
  side,
  color,
  activeButton = false,
  concealed = false,
  onPreviewChange,
  onPointerEngage,
  onClick,
}: {
  icon: IconProp;
  elementRef: (node: HTMLDivElement | null) => void;
  iconRef?: (node: SVGSVGElement | null) => void;
  label: string;
  tooltipTitle: string;
  tooltipId: string;
  side: 'left' | 'right';
  color?: string;
  activeButton?: boolean;
  concealed?: boolean;
  onPreviewChange: (previewed: boolean) => void;
  onPointerEngage: (pointerY: number) => void;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);
  const projectColor = color ?? PROJECT_COLORS[0];
  const tooltipPositionClass =
    side === 'left'
      ? 'left-full ml-3 -translate-x-1 group-hover/nav-tooltip:translate-x-0 group-focus-within/nav-tooltip:translate-x-0'
      : 'right-full mr-3 translate-x-1 group-hover/nav-tooltip:translate-x-0 group-focus-within/nav-tooltip:translate-x-0';

  return (
    <div
      ref={elementRef}
      className={`group/nav-tooltip relative z-10 grid size-12 place-items-center transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
        concealed
          ? 'pointer-events-none scale-90 opacity-0'
          : 'scale-100 opacity-100'
      }`}
      aria-hidden={concealed ? true : undefined}
      onPointerEnter={(event) => onPointerEngage(event.clientY)}
      onMouseEnter={() => {
        hoveredRef.current = true;
        onPreviewChange(true);
      }}
      onMouseLeave={() => {
        hoveredRef.current = false;
        onPreviewChange(focusedRef.current);
      }}
      onFocusCapture={() => {
        focusedRef.current = true;
        onPreviewChange(true);
      }}
      onBlurCapture={() => {
        focusedRef.current = false;
        onPreviewChange(hoveredRef.current);
      }}
      style={
        {
          '--project-color': projectColor,
        } as ProjectColorStyle
      }
    >
      <CircularIconButton
        icon={icon}
        iconRef={iconRef}
        iconClassName="size-7"
        className="relative size-12 border-0 bg-transparent p-0 text-[var(--project-color)]"
        aria-label={label}
        aria-describedby={tooltipId}
        aria-current={activeButton ? 'page' : undefined}
        data-interactive-pop-companion={`[data-portfolio-section-nav-preview="${side}"] circle`}
        tabIndex={concealed ? -1 : undefined}
        onClick={onClick}
      />
      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute top-1/2 z-30 whitespace-nowrap bg-[var(--project-color)] px-3 py-2 text-[0.6875rem] font-black uppercase leading-none tracking-[0.24em] text-black opacity-0 transition-[opacity,transform] duration-150 ease-out -translate-y-1/2 group-hover/nav-tooltip:opacity-100 group-focus-within/nav-tooltip:opacity-100 ${tooltipPositionClass}`}
      >
        {tooltipTitle}
      </span>
    </div>
  );
}

function CircularIconButton({
  icon,
  buttonRef,
  iconRef,
  iconClassName,
  ring = false,
  className,
  ...buttonProps
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: IconProp;
  buttonRef?: (node: HTMLButtonElement | null) => void;
  iconRef?: (node: SVGSVGElement | null) => void;
  iconClassName: string;
  ring?: boolean;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`group/icon-button grid place-items-center rounded-full outline-none ${className ?? ''}`}
      {...buttonProps}
    >
      {ring ? (
        <NavigationActiveRing
          color="inherit"
          className="absolute inset-0 z-0"
        />
      ) : null}
      <FontAwesomeIcon
        ref={iconRef}
        icon={icon}
        className={`relative z-10 ${iconClassName} drop-shadow-[1px_1px_0_black]`}
        aria-hidden="true"
      />
    </button>
  );
}

function ProjectDescription({
  project,
  projectNumber,
  projectColor,
  setDescriptionRef,
  isWideLayout,
  className,
}: {
  project: PortfolioProject;
  projectNumber: string;
  projectColor: string;
  setDescriptionRef: (node: HTMLDivElement | null) => void;
  isWideLayout: boolean;
  className?: string;
}) {
  return (
    <div
      className={`grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] pr-1 ${
        className ?? ''
      }`}
      style={
        {
          '--project-color': projectColor,
        } as ProjectColorStyle
      }
    >
      <div>
        <p className="mb-5 text-xs font-light uppercase tracking-[0.35em] text-white/45">
          SECTION {projectNumber}
        </p>
        <h1
          className={`mb-8 w-full max-w-[12ch] font-black uppercase leading-none tracking-normal ${
            isWideLayout
              ? 'text-[clamp(3.5rem,4vw,4.75rem)]'
              : 'text-[clamp(3rem,14vw,7rem)]'
          }`}
          style={{ color: projectColor }}
        >
          {project.title}
        </h1>
      </div>
      <div
        ref={setDescriptionRef}
        className={`portfolio-themed-scrollbar min-h-0 min-w-0 overflow-x-hidden overflow-y-scroll overscroll-contain pr-10 ${
          isWideLayout ? 'w-[calc(48ch+2rem)] max-w-full' : 'w-full max-w-[calc(48ch+2rem)]'
        }`}
      >
        <div
          className={`portfolio-markdown portfolio-markdown-scroll-body prose min-w-0 w-full max-w-[48ch] font-light leading-relaxed text-white/82 ${
            isWideLayout ? 'text-xl' : 'text-lg'
          }`}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={PORTFOLIO_MARKDOWN_COMPONENTS}
          >
            {project.descriptionMarkdown}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

function ProjectPanel({
  project,
  projectNumber,
  projectColor,
  slide,
  isWideLayout,
  isActive,
  setDescriptionRef,
  onScreenshotClick,
}: {
  project: PortfolioProject;
  projectNumber: string;
  projectColor: string;
  slide: ProjectSlide;
  isWideLayout: boolean;
  isActive: boolean;
  setDescriptionRef: (node: HTMLDivElement | null) => void;
  onScreenshotClick: (
    slide: ProjectSlide,
    transitionRect?: ModalTransitionRect
  ) => void;
}) {
  const isTextSlide = isBuildingWithAiTextSlide(project, slide);
  const shouldShowDescriptionPlaceholder =
    isWideLayout && slide.kind === 'description' && !hasProjectScreenshots(project);
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
      className={`grid h-dvh w-screen shrink-0 snap-start snap-always grid-rows-[1fr] bg-black ${
        isWideLayout ? 'px-0 py-0' : 'px-6 pb-24 pt-8 sm:px-10'
      }`}
      aria-hidden={!isActive}
      style={
        {
          '--project-color': projectColor,
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
          !isWideLayout && slide.kind === 'description'
            ? ''
            : 'hidden'
        }
      />

      <div
        className={`grid min-h-0 ${panelContentClass} ${
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
          <button
            type="button"
            className={`relative overflow-hidden border border-transparent outline-none transition-colors hover:border-[var(--project-color)] focus-visible:border-[var(--project-color)] ${
              isWideLayout
                ? 'col-start-2 aspect-square h-[var(--portfolio-screenshot-size)] max-h-none w-[var(--portfolio-screenshot-size)] max-w-none self-center justify-self-end'
                : 'h-full min-h-0 w-full'
            }`}
            data-portfolio-screenshot-id={slide.screenshot.id}
            onClick={(event) =>
              onScreenshotClick(
                slide,
                snapshotClientRect(event.currentTarget.getBoundingClientRect())
              )
            }
            aria-label={`Open ${slide.screenshot.alt} fullscreen`}
          >
            <ScreenshotMedia
              screenshot={slide.screenshot}
              priority={isActive}
              sizes="(min-aspect-ratio: 5/4) calc(100dvh - 8rem), 100vw"
              className={getCarouselMediaClass(isActive)}
            />
          </button>
        )}
      </div>
    </article>
  );
}

function BuildingWithAiTextPanel({
  project,
  projectNumber,
  projectColor,
  isWideLayout,
  setDescriptionRef,
}: {
  project: PortfolioProject;
  projectNumber: string;
  projectColor: string;
  isWideLayout: boolean;
  setDescriptionRef: (node: HTMLDivElement | null) => void;
}) {
  return (
    <section
      className={`grid min-h-0 min-w-0 w-full grid-rows-[auto_minmax(0,1fr)] ${
        isWideLayout
          ? 'h-full bg-black/80 py-16 pl-[var(--portfolio-control-gutter-width)] pr-[var(--portfolio-control-gutter-width)] backdrop-blur-md'
          : 'h-full'
      }`}
      aria-label={project.title}
      style={
        {
          '--project-color': projectColor,
        } as ProjectColorStyle
      }
    >
      <div>
        <p className="mb-5 text-xs font-light uppercase tracking-[0.35em] text-white/45">
          SECTION {projectNumber}
        </p>
        <h1
          className={`mb-8 w-full max-w-[12ch] font-black uppercase leading-none tracking-normal ${
            isWideLayout
              ? 'text-[clamp(3.5rem,4vw,4.75rem)]'
              : 'max-w-[12ch] text-[clamp(3rem,14vw,7rem)]'
          }`}
          style={{ color: projectColor }}
        >
          {project.title}
        </h1>
      </div>
      {isWideLayout ? (
        <div
          ref={setDescriptionRef}
          className="portfolio-themed-scrollbar min-h-0 min-w-0 w-full max-w-[calc(108ch+9rem)] overflow-x-hidden overflow-y-scroll overscroll-contain pr-10"
        >
          <div className="portfolio-markdown portfolio-markdown-scroll-body prose min-w-0 w-full max-w-[calc(108ch+7rem)] text-lg font-light leading-relaxed text-white/82 [column-count:3] [column-fill:balance] [column-gap:3.5rem]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={PORTFOLIO_MARKDOWN_COMPONENTS}
            >
              {project.descriptionMarkdown}
            </ReactMarkdown>
          </div>
        </div>
      ) : (
        <div
          ref={setDescriptionRef}
          className="portfolio-themed-scrollbar min-h-0 min-w-0 w-full max-w-[calc(48ch+2rem)] overflow-x-hidden overflow-y-scroll overscroll-contain pr-10"
        >
          <div className="portfolio-markdown portfolio-markdown-scroll-body prose min-w-0 w-full max-w-[48ch] text-lg font-light leading-relaxed text-white/82">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={PORTFOLIO_MARKDOWN_COMPONENTS}
            >
              {project.descriptionMarkdown}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </section>
  );
}

function ScreenshotMedia({
  screenshot,
  priority,
  sizes,
  className,
}: {
  screenshot: PortfolioScreenshot;
  priority?: boolean;
  sizes: string;
  className: string;
}) {
  if (isVideoScreenshot(screenshot)) {
    return (
      <video
        src={screenshot.src}
        aria-label={screenshot.alt}
        autoPlay
        draggable={false}
        loop
        muted
        onDragStart={(event) => event.preventDefault()}
        playsInline
        preload={priority ? 'auto' : 'metadata'}
        className={`absolute inset-0 h-full w-full select-none ${className}`}
      />
    );
  }

  return (
    <Image
      src={screenshot.src}
      alt={screenshot.alt}
      fill
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
      priority={priority}
      sizes={sizes}
      className={`select-none ${className}`}
    />
  );
}

function ImageModal({
  project,
  projectColor,
  screenshot,
  screenshots,
  activeScreenshotIndex,
  transitionRect,
  isClosing,
  scale,
  offset,
  dragRef,
  pinchRef,
  setScale,
  setOffset,
  onClose,
  onExited,
}: {
  project: PortfolioProject;
  projectColor?: string;
  screenshot: PortfolioScreenshot;
  screenshots: PortfolioScreenshot[];
  activeScreenshotIndex: number;
  transitionRect: ModalTransitionRect | null;
  isClosing: boolean;
  scale: number;
  offset: { x: number; y: number };
  dragRef: React.MutableRefObject<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    dragging: boolean;
  }>;
  pinchRef: React.MutableRefObject<{ distance: number; scale: number } | null>;
  setScale: (scale: number | ((current: number) => number)) => void;
  setOffset: (
    offset:
      | { x: number; y: number }
      | ((current: { x: number; y: number }) => { x: number; y: number })
  ) => void;
  onClose: () => void;
  onExited: () => void;
}) {
  const carouselScreenshots = screenshots.length > 0 ? screenshots : [screenshot];
  const carouselCount = carouselScreenshots.length;
  const boundedActiveScreenshotIndex = Math.max(
    0,
    Math.min(carouselCount - 1, activeScreenshotIndex)
  );
  const renderedCarouselScreenshots =
    getLoopingCarouselEntries(carouselScreenshots);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(Boolean(transitionRect));
  const renderedCarouselIndex = getCanonicalRenderedCarouselIndex(
    boundedActiveScreenshotIndex,
    carouselCount
  );
  const backdropRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const imageFrameRef = useRef<HTMLDivElement>(null);
  const carouselTrackRef = useRef<HTMLDivElement>(null);
  const liveOffsetRef = useRef(offset);
  const liveScaleRef = useRef(scale);
  const animationFrameRef = useRef<number | null>(null);
  const presentationTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const carouselTweenRef = useRef<gsap.core.Tween | null>(null);
  const hasInitializedPresentationRef = useRef(false);
  const previousCarouselStateRef = useRef<{
    activeIndex: number;
    itemCount: number;
  } | null>(null);
  const clampScale = useCallback((nextScale: number) => {
    return Math.min(6, Math.max(1, nextScale));
  }, []);
  const prefersReducedMotion = useCallback(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );
  const transformFor = useCallback(
    (nextOffset: { x: number; y: number }, nextScale: number) =>
      `translate3d(${nextOffset.x}px, ${nextOffset.y}px, 0) scale(${nextScale})`,
    []
  );
  const applyLiveTransform = useCallback(() => {
    const imageFrame = imageFrameRef.current;

    if (!imageFrame) {
      return;
    }

    imageFrame.style.transform = transformFor(
      liveOffsetRef.current,
      liveScaleRef.current
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
  const setLiveScale = useCallback(
    (nextScale: number) => {
      liveScaleRef.current = clampScale(nextScale);
      scheduleLiveTransform();
      setScale(liveScaleRef.current);
    },
    [clampScale, scheduleLiveTransform, setScale]
  );

  useLayoutEffect(() => {
    liveOffsetRef.current = offset;
    liveScaleRef.current = scale;

    if (!isTransitioning) {
      applyLiveTransform();
    }
  }, [applyLiveTransform, isTransitioning, offset, scale]);

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
      gsap.set(closeButton, { x: 64, rotation: 90, opacity: 0 });
    }

    if (isClosing) {
      dragRef.current.dragging = false;
      pinchRef.current = null;
      setIsDragging(false);
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
          onExited();
          return;
        }

        liveOffsetRef.current = { x: 0, y: 0 };
        liveScaleRef.current = 1;
        gsap.set(imageFrame, {
          clearProps: 'left,top,width,height,opacity,willChange',
        });
        imageFrame.style.transition = 'transform 160ms ease-out';
        applyLiveTransform();
        setScale(1);
        setOffset({ x: 0, y: 0 });
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
        0
      )
      .to(
        backdrop,
        {
          opacity: isClosing ? 0 : 1,
          duration: frameDuration,
          ease: isClosing ? 'power2.in' : 'power2.out',
        },
        0
      )
      .to(
        closeButton,
        {
          x: isClosing ? 64 : 0,
          rotation: isClosing ? 90 : 0,
          opacity: isClosing ? 0 : 1,
          duration: accessoryDuration,
          ease: isClosing ? 'power2.in' : 'expo.out',
        },
        0
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
    onExited,
    pinchRef,
    prefersReducedMotion,
    setOffset,
    setScale,
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
          carouselCount
        )
      : false;

    previousCarouselStateRef.current = {
      activeIndex: boundedActiveScreenshotIndex,
      itemCount: carouselCount,
    };
    carouselTweenRef.current?.kill();

    if (isFirstPosition || didCarouselChange) {
      gsap.set(carouselTrack, { xPercent: -renderedCarouselIndex * 100 });
      return;
    }

    gsap.set(carouselTrack, { willChange: 'transform' });
    const tween = gsap.to(carouselTrack, {
      xPercent: -renderedCarouselIndex * 100,
      duration: prefersReducedMotion() ? 0 : isBoundary ? 1 : 0.5,
      ease: isBoundary ? 'power2.inOut' : 'power3.out',
      overwrite: 'auto',
      onComplete: () => {
        gsap.set(carouselTrack, { clearProps: 'willChange' });
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
    prefersReducedMotion,
    renderedCarouselIndex,
  ]);

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      presentationTimelineRef.current?.kill();
      carouselTweenRef.current?.kill();
    },
    []
  );

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLDialogElement>) => {
      event.preventDefault();

      if (isTransitioning || isClosing) {
        return;
      }

      setLiveScale(liveScaleRef.current + event.deltaY * -0.002);
    },
    [isClosing, isTransitioning, setLiveScale]
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
      liveOffsetRef.current = { x: 0, y: 0 };
      liveScaleRef.current = 1;
      applyLiveTransform();
      setIsDragging(false);
      setScale(1);
      setOffset({ x: 0, y: 0 });
    },
    [
      applyLiveTransform,
      dragRef,
      isClosing,
      isTransitioning,
      pinchRef,
      setOffset,
      setScale,
    ]
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
    [dragRef, isClosing, isTransitioning]
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
    [dragRef, scheduleLiveTransform]
  );

  const stopPointerDrag = useCallback(
    (event: ReactPointerEvent<HTMLDialogElement>) => {
      if (dragRef.current.pointerId === event.pointerId) {
        dragRef.current.dragging = false;
        if (imageFrameRef.current) {
          imageFrameRef.current.style.transition = 'transform 160ms ease-out';
        }
        setOffset(liveOffsetRef.current);
        setIsDragging(false);
      }
    },
    [dragRef, setOffset]
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
    [isClosing, isTransitioning, pinchRef]
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
      setLiveScale((nextDistance / pinchRef.current.distance) * pinchRef.current.scale);
    },
    [isClosing, isTransitioning, pinchRef, setLiveScale]
  );

  const handleTouchEnd = useCallback(() => {
    pinchRef.current = null;
  }, [pinchRef]);

  const panCursorClass =
    scale > 1 && !isTransitioning && !isClosing
      ? isDragging
        ? 'cursor-grabbing'
        : 'cursor-grab'
      : '';
  return (
    <dialog
      open
      data-portfolio-modal-root
      className={`fixed inset-0 z-50 m-0 h-dvh max-h-none w-screen max-w-none touch-none overflow-hidden border-0 bg-transparent p-0 ${panCursorClass}`}
      aria-label={`${project.title}: ${screenshot.alt}`}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopPointerDrag}
      onPointerCancel={stopPointerDrag}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        ref={backdropRef}
        className="fixed inset-0 bg-black"
        aria-hidden="true"
      />
      <CircularIconButton
        icon={faXmark}
        buttonRef={(node) => {
          closeButtonRef.current = node;
        }}
        iconClassName="size-7"
        ring
        data-portfolio-modal-close
        className={`fixed right-5 top-5 z-20 isolate size-12 bg-black text-[var(--project-color)] ${
          isClosing ? 'pointer-events-none' : ''
        }`}
        style={
          {
            '--project-color': projectColor ?? PROJECT_COLORS[0],
          } as ProjectColorStyle
        }
        aria-label="Close enlarged image"
        title="Close"
        onClick={onClose}
      />
      <div
        ref={imageFrameRef}
        data-portfolio-modal-image-frame
        className={`fixed left-[4vw] top-[4dvh] z-10 h-[92dvh] w-[92vw] origin-center ${panCursorClass}`}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div
            ref={carouselTrackRef}
            data-portfolio-modal-carousel-track
            className="flex h-full"
          >
            {renderedCarouselScreenshots.map(
              ({ item: carouselScreenshot, key, realIndex }) => (
                <div
                  key={key}
                  className="relative h-full w-full shrink-0"
                >
                  <ScreenshotMedia
                    screenshot={carouselScreenshot}
                    priority={carouselScreenshot.id === screenshot.id}
                    sizes="92vw"
                    className={getCarouselMediaClass(
                      realIndex === boundedActiveScreenshotIndex
                    )}
                  />
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
