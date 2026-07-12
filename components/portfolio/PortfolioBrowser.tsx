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
  startTransition,
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
  faCircle,
  faFilePdf,
  faRotateRight,
  faSpinner,
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
import {
  PortfolioMediaElement,
  usePortfolioMediaReadiness,
} from '@/components/portfolio/usePortfolioMediaReadiness';
import type { Components } from 'react-markdown';

type PortfolioBrowserProps = {
  initialProjectSlug?: string;
  initialScreenshotSlug?: string;
  initialModalOpen?: boolean;
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
type PortfolioIntroPhase = 'loading' | 'revealing' | 'ready' | 'error';
type PendingNavigation =
  | { kind: 'project'; projectIndex: number }
  | { kind: 'slide'; projectIndex: number; slideIndex: number }
  | { kind: 'modal'; screenshotId: string }
  | null;
const WIDE_LAYOUT_STYLE: WideLayoutStyle = {
  '--portfolio-description-rail-width':
    'min(calc(100vw - 4rem), calc(7rem + max(32rem, 48ch)))',
  '--portfolio-control-gutter-width': '6rem',
  '--portfolio-screenshot-size':
    'min(100dvh, calc(100vw - var(--portfolio-description-rail-width) - var(--portfolio-control-gutter-width)))',
};
const NAVIGATION_DOT_CLASS = 'size-2.5 text-white';
const NAVIGATION_INDICATOR_STEP_REM = 2.5;
const NAVIGATION_RING_SIZE_REM = 3;
const NAVIGATION_INDICATOR_PAIR_STAGGER_MS = 90;
const NAVIGATION_INDICATOR_SIDE_LEAD_MS = 30;
const NAVIGATION_INDICATOR_TRANSITION_MS = 500;
const SECTION_NAV_ITEM_STEP_REM = 3.75;
const SECTION_NAV_PREVIEW_RETURN_DELAY_MS = 140;
const SECTION_NAV_SNAP_DISTANCE_PX = 10;
const SECTION_NAV_BREAKAWAY_DISTANCE_PX = 50;
const NAVIGATION_ACTIVE_SCALE = 1.1;
// 0 is sequential; 1 keeps both affordances in a full crossfade.
const SECTION_NAV_AFFORDANCE_OVERLAP = 1;
const CAROUSEL_MEDIA_CLASS =
  'object-contain transition-[filter] duration-1000 ease-in-out';
const TOP_SCREEN_COLOR = 'hsl(0 0% 100%)';
const PROJECT_COLOR_START_HUE = 342;
const PROJECT_COLOR_SATURATION = 78;
const PROJECT_COLOR_LIGHTNESS = 54;
const PROJECT_COLORS = buildProjectColors(portfolioSlides.length);
const SECTION_NAV_COLORS = [TOP_SCREEN_COLOR, ...PROJECT_COLORS];
const SECTION_NAV_HAS_SLIDES = [
  false,
  ...portfolioSlides.map((project) => project.screenshots.length > 1),
];
const CAROUSEL_MEDIA_BLUR_PX = 20;
const MODAL_CAROUSEL_GAP_PX = CAROUSEL_MEDIA_BLUR_PX * 2;
const SECTION_NAV_RGB_COLORS = SECTION_NAV_COLORS.map(
  (color) => gsap.utils.splitColor(color).slice(0, 3) as [number, number, number]
);
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
  preview: HTMLDivElement,
  target: HTMLElement
) {
  const targetRect = target.getBoundingClientRect();

  return getSectionNavPreviewOffsetFromClientY(
    preview,
    targetRect.top + targetRect.height / 2
  );
}

function getSectionNavPreviewOffsetFromClientY(
  preview: HTMLDivElement,
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

type SectionNavLayout = {
  items: Array<{
    index: number;
    centerY: number;
    color: string;
    rgb: [number, number, number];
  }>;
  top: number;
  bottom: number;
};

function getSectionNavLayout(
  buttons: Array<HTMLDivElement | null>
): SectionNavLayout | null {
  const items: SectionNavLayout['items'] = [];
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  buttons.forEach((button, index) => {
    if (!button || button.getAttribute('aria-hidden') === 'true') {
      return;
    }

    const rect = button.getBoundingClientRect();
    top = Math.min(top, rect.top);
    bottom = Math.max(bottom, rect.bottom);
    items.push({
      index,
      centerY: rect.top + rect.height / 2,
      color: SECTION_NAV_COLORS[index],
      rgb: SECTION_NAV_RGB_COLORS[index],
    });
  });

  return items.length > 0 ? { items, top, bottom } : null;
}

function getSectionNavPosition(
  layout: SectionNavLayout | null,
  targetY: number
) {
  const items = layout?.items ?? [];

  if (items.length === 0) {
    return 0;
  }

  if (targetY <= items[0].centerY) {
    return items[0].index;
  }

  const lastItem = items[items.length - 1];

  if (targetY >= lastItem.centerY) {
    return lastItem.index;
  }

  for (let index = 1; index < items.length; index += 1) {
    const nextItem = items[index];

    if (targetY > nextItem.centerY) {
      continue;
    }

    const previousItem = items[index - 1];
    const progress =
      (targetY - previousItem.centerY) /
      (nextItem.centerY - previousItem.centerY);

    return previousItem.index + progress;
  }

  return lastItem.index;
}

function getNavigationActiveScale(position: number, activeIndex: number) {
  const proximity = Math.max(0, 1 - Math.abs(position - activeIndex));

  return 1 + (NAVIGATION_ACTIVE_SCALE - 1) * proximity;
}

function getSectionNavAffordanceOpacity(activation: number) {
  const clampedActivation = Math.max(0, Math.min(1, activation));
  const arrowEnd = 0.5 * (1 + SECTION_NAV_AFFORDANCE_OVERLAP);
  const arrowOpacity = Math.max(0, 1 - clampedActivation / arrowEnd);
  const dotStart = 0.5 * (1 - SECTION_NAV_AFFORDANCE_OVERLAP);
  const dotOpacity = Math.max(
    0,
    Math.min(1, (clampedActivation - dotStart) / (1 - dotStart))
  );

  return { arrowOpacity, dotOpacity };
}

function getSectionNavSnapTarget(
  layout: SectionNavLayout | null,
  pointerY: number,
  snapDistance = SECTION_NAV_SNAP_DISTANCE_PX
): { index: number; centerY: number; distance: number } | null {
  let closest: { index: number; centerY: number; distance: number } | null = null;

  if (!layout) {
    return null;
  }

  for (const item of layout.items) {
    const distance = Math.abs(pointerY - item.centerY);

    if (distance <= snapDistance && (!closest || distance < closest.distance)) {
      closest = { index: item.index, centerY: item.centerY, distance };
    }
  }

  return closest;
}

function getSectionNavPointerColor(
  layout: SectionNavLayout | null,
  pointerY: number
) {
  const stops = layout?.items ?? [];

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
    const channels = previousStop.rgb.map((channel, channelIndex) =>
      Math.round(channel + (nextStop.rgb[channelIndex] - channel) * progress)
    );

    return `rgb(${channels.join(', ')})`;
  }

  return lastStop.color;
}

function isSectionNavBeyondBreakawayDistance(
  layout: SectionNavLayout | null,
  pointerY: number,
  indicatorY: number,
  breakawayDistance = SECTION_NAV_BREAKAWAY_DISTANCE_PX
) {
  if (!layout) {
    return true;
  }

  const isAbove =
    pointerY < layout.top - breakawayDistance &&
    indicatorY < layout.top - breakawayDistance;
  const isBelow =
    pointerY > layout.bottom + breakawayDistance &&
    indicatorY > layout.bottom + breakawayDistance;

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

function getHorizontalIndicatorRingX(index: number) {
  return (
    index * NAVIGATION_INDICATOR_STEP_REM +
    (NAVIGATION_INDICATOR_STEP_REM - NAVIGATION_RING_SIZE_REM) / 2
  );
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
    left: 0,
    top: 0,
    width: window.innerWidth,
    height: window.innerHeight,
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

function carouselMediaKey(screenshot: PortfolioScreenshot) {
  return `carousel:${screenshot.id}`;
}

function modalMediaKey(screenshot: PortfolioScreenshot) {
  return `modal:${screenshot.id}`;
}

function getProjectMediaScreenshots(project: PortfolioProject) {
  return project.screenshots.filter(
    (screenshot) => !isBuildingWithAiTextScreenshot(project, screenshot)
  );
}

function getSlideMediaKey(
  project: PortfolioProject,
  slide: ProjectSlide,
  useDesktopVisual: boolean
) {
  if (
    slide.kind === 'screenshot' &&
    !isBuildingWithAiTextSlide(project, slide)
  ) {
    return carouselMediaKey(slide.screenshot);
  }

  if (useDesktopVisual) {
    const firstScreenshot = getProjectMediaScreenshots(project)[0];
    return firstScreenshot ? carouselMediaKey(firstScreenshot) : undefined;
  }

  return undefined;
}

function nextAnimationFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

export function PortfolioBrowser({
  initialProjectSlug,
  initialScreenshotSlug,
  initialModalOpen = false,
}: PortfolioBrowserProps) {
  const keyboardSurfaceRef = useRef<HTMLElement>(null);
  const verticalRef = useRef<HTMLDivElement>(null);
  const horizontalRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const horizontalScrollTweenRefs = useRef<
    Record<string, gsap.core.Tween | null>
  >({});
  const horizontalTargetSlideIndexesRef = useRef<Record<string, number>>({});
  const horizontalKeyboardIndicatorIndexesRef = useRef<
    Record<string, number | undefined>
  >({});
  const horizontalPendingNavigationIntentRefs = useRef<
    Record<string, number | undefined>
  >({});
  const descriptionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const userMovedRef = useRef(false);
  const scrollSyncRef = useRef(false);
  const horizontalScrollSyncProjectRef = useRef<string | null>(null);
  const horizontalScrollSyncTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const modalHistoryEntryRef = useRef(false);
  const initialModalRequestedRef = useRef(initialModalOpen);
  const curtainRef = useRef<HTMLDivElement>(null);
  const introTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const initialRevealStartedRef = useRef(false);
  const initialRevealCompleteRef = useRef(false);
  const navigationIntentRef = useRef(0);
  const sectionNavIndicatorRefs = useRef<Array<HTMLDivElement | null>>([]);
  const sectionNavPreviewRefs = useRef<Array<HTMLDivElement | null>>([]);
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
  const sectionNavPointerOwnerRef = useRef<'left' | 'right' | null>(null);
  const sectionNavPointerFrameRef = useRef<number | null>(null);
  const sectionNavPendingPointerYRef = useRef<number | null>(null);
  const sectionNavPointerArmedRefs = useRef<Record<'left' | 'right', boolean>>({
    left: false,
    right: false,
  });
  const sectionNavPointerAcquiringRefs = useRef<
    Record<'left' | 'right', boolean>
  >({ left: false, right: false });
  const sectionNavSnapIndexesRef = useRef<
    Record<'left' | 'right', number | null>
  >({ left: null, right: null });
  const sectionNavSnapTransitioningRefs = useRef<
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
  const sectionNavReducedMotionRef = useRef(false);
  const sectionNavColorSetterRefs = useRef<
    Record<
      'left' | 'right',
      {
        preview: HTMLDivElement;
        setColor: (value: string) => void;
      } | null
    >
  >({ left: null, right: null });
  const sectionNavIsMovingRef = useRef(false);
  const sectionNavStackRefs = useRef<Array<HTMLDivElement | null>>([]);
  const sectionNavIconRefs = useRef<
    Record<'left' | 'right', Array<SVGSVGElement | null>>
  >({ left: [], right: [] });
  const sectionNavDotRefs = useRef<
    Record<'left' | 'right', Array<SVGSVGElement | null>>
  >({ left: [], right: [] });
  const sectionNavVisualRefs = useRef<
    Record<'left' | 'right', Array<HTMLSpanElement | null>>
  >({ left: [], right: [] });
  const sectionNavScrollPositionRef = useRef(0);
  const sectionNavActiveIndexRef = useRef(0);
  const sectionNavTooltipRefs = useRef<
    Record<'left' | 'right', HTMLDivElement | null>
  >({ left: null, right: null });
  const sectionNavTooltipTextRefs = useRef<
    Record<'left' | 'right', HTMLSpanElement | null>
  >({ left: null, right: null });
  const sectionNavTooltipIndexesRef = useRef<
    Record<'left' | 'right', number | null>
  >({ left: null, right: null });
  const sectionNavTooltipsSuppressedRef = useRef(false);
  const [introPhase, setIntroPhase] = useState<PortfolioIntroPhase>('loading');
  const [pendingNavigation, setPendingNavigation] =
    useState<PendingNavigation>(null);
  const {
    failure: mediaFailure,
    registerMediaElement,
    ensureMediaReady,
    preloadQueue,
    isMediaReady,
  } = usePortfolioMediaReadiness();
  const renderedIntroPhase: PortfolioIntroPhase = mediaFailure
    ? 'error'
    : introPhase;
  const setSectionNavTooltipText = useCallback(
    (side: 'left' | 'right', itemIndex: number, title?: string) => {
      const tooltipText = sectionNavTooltipTextRefs.current[side];
      const item = sectionNavButtonRefs.current[side][itemIndex];
      const nextTitle =
        title ?? item?.dataset.portfolioSectionNavTooltipTitle;

      if (tooltipText && nextTitle) {
        tooltipText.textContent = nextTitle;
      }
    },
    []
  );
  const setSectionNavTooltipVisibility = useCallback(
    (side: 'left' | 'right', visible: boolean) => {
      const tooltip = sectionNavTooltipRefs.current[side];

      if (!tooltip) {
        return;
      }

      gsap.to(tooltip, {
        autoAlpha: visible ? 1 : 0,
        x: visible ? 0 : side === 'left' ? -4 : 4,
        duration: sectionNavReducedMotionRef.current ? 0 : 0.15,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    },
    []
  );
  const hideSectionNavTooltips = useCallback(() => {
    setSectionNavTooltipVisibility('left', false);
    setSectionNavTooltipVisibility('right', false);
  }, [setSectionNavTooltipVisibility]);
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
  const applySectionNavActiveScale = useCallback((position: number, activeIndex: number, duration = 0) => {
    const scale = getNavigationActiveScale(position, activeIndex);
    const visualTargets = (['left', 'right'] as const).flatMap((side) =>
      sectionNavVisualRefs.current[side].filter(
        (visual): visual is HTMLSpanElement => Boolean(visual)
      )
    );
    const activeVisualTargets = (['left', 'right'] as const)
      .map((side) => sectionNavVisualRefs.current[side][activeIndex])
      .filter((visual): visual is HTMLSpanElement => Boolean(visual));
    const ringTargets = sectionNavPreviewRefs.current
      .map((preview) => preview?.querySelector('svg'))
      .filter((ring): ring is SVGSVGElement => Boolean(ring));

    const setScale = (targets: Element[], value: number) => {
      if (duration > 0 && !sectionNavReducedMotionRef.current) {
        gsap.to(targets, {
          scale: value,
          transformOrigin: '50% 50%',
          duration,
          ease: 'power3.out',
          overwrite: 'auto',
        });
        return;
      }

      gsap.set(targets, { scale: value, transformOrigin: '50% 50%' });
    };

    setScale(visualTargets, 1);
    setScale(activeVisualTargets, scale);
    setScale(ringTargets, scale);
  }, []);
  const applySectionNavScrollScale = useCallback((position: number, duration = 0) => {
    const reducedMotion = sectionNavReducedMotionRef.current;
    const setScale = (target: Element, scale: number) => {
      if (duration > 0 && !reducedMotion) {
        gsap.to(target, {
          scale,
          transformOrigin: '50% 50%',
          duration,
          ease: 'power3.out',
          overwrite: 'auto',
        });
        return;
      }

      gsap.set(target, {
        scale,
        transformOrigin: '50% 50%',
      });
    };

    (['left', 'right'] as const).forEach((side) => {
      sectionNavVisualRefs.current[side].forEach((visual, itemIndex) => {
        if (visual) {
          setScale(visual, getNavigationActiveScale(position, itemIndex));
        }
      });
    });

    const nearestItemDistance = Math.abs(position - Math.round(position));
    const ringProximity = Math.max(0, 1 - nearestItemDistance * 2);
    const ringScale = 1 + (NAVIGATION_ACTIVE_SCALE - 1) * ringProximity;

    sectionNavPreviewRefs.current.forEach((preview) => {
      const ring = preview?.querySelector('svg');

      if (ring) {
        setScale(ring, ringScale);
      }
    });
  }, []);
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
      sectionNavSnapIndexesRef.current[side] = null;
      sectionNavSnapTransitioningRefs.current[side] = false;
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

        if (side === 'left') {
          const scrollPosition = sectionNavScrollPositionRef.current;
          applySectionNavScrollScale(
            scrollPosition,
            reducedMotion ? 0 : 0.3
          );
        }

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
    [animateSectionNavRingStroke, applySectionNavScrollScale]
  );
  const updateSectionNavPointer = useCallback(
    (
      side: 'left' | 'right',
      pointerY: number,
      layout: SectionNavLayout | null,
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
        : getSectionNavSnapTarget(layout, pointerY);
      const snapIndex = snapTarget?.index ?? null;
      const previousSnapIndex = sectionNavSnapIndexesRef.current[side];
      const snapChanged = previousSnapIndex !== snapIndex;
      const targetY = snapTarget?.centerY ?? pointerY;

      if (snapChanged) {
        sectionNavSnapIndexesRef.current[side] = snapIndex;
        sectionNavSnapTransitioningRefs.current[side] = true;
      }

      if (
        !sectionNavIsMovingRef.current &&
        isSectionNavBeyondBreakawayDistance(
          layout,
          pointerY,
          targetY
        )
      ) {
        returnSectionNavPointerToIdle(side, false);
        return;
      }

      sectionNavPreviewIndexesRef.current[sideIndex] = snapIndex;
      const reducedMotion = sectionNavReducedMotionRef.current;
      const targetOffset = getSectionNavPreviewOffsetFromClientY(
        preview,
        targetY
      );
      const shouldAnimatePosition =
        animatePosition ||
        snapChanged ||
        (sectionNavSnapTransitioningRefs.current[side] && snapIndex === null);

      if (side === 'left') {
        applySectionNavActiveScale(
          getSectionNavPosition(layout, targetY),
          sectionNavActiveIndexRef.current,
          shouldAnimatePosition && !reducedMotion
            ? animatePosition
              ? 0.3
              : 0.2
            : 0
        );
      }

      if (shouldAnimatePosition && !reducedMotion) {
        gsap.to(preview, {
          y: targetOffset,
          duration: animatePosition ? 0.3 : 0.2,
          ease: 'power3.out',
          overwrite: 'auto',
          onComplete: () => {
            if (sectionNavSnapIndexesRef.current[side] === snapIndex) {
              sectionNavSnapTransitioningRefs.current[side] = false;
            }
            onPositionSettled?.();
          },
        });
      } else if (snapIndex === null || snapChanged || reducedMotion) {
        gsap.set(preview, { y: targetOffset });
        sectionNavSnapTransitioningRefs.current[side] = false;
        onPositionSettled?.();
      }

      const targetColor =
        getSectionNavPointerColor(layout, targetY) ??
        getComputedStyle(indicator).color;

      if (reducedMotion) {
        gsap.set(preview, { color: targetColor });
        return;
      }

      let colorSetter = sectionNavColorSetterRefs.current[side];

      if (!colorSetter || colorSetter.preview !== preview) {
        colorSetter = {
          preview,
          setColor: gsap.quickSetter(preview, 'color') as (
            value: string
          ) => void,
        };
        sectionNavColorSetterRefs.current[side] = colorSetter;
      }

      colorSetter.setColor(targetColor);
    },
    [
      animateSectionNavRingStroke,
      applySectionNavActiveScale,
      returnSectionNavPointerToIdle,
    ]
  );
  const trackSectionNavPointer = useCallback(
    (
      side: 'left' | 'right',
      pointerY: number,
      layout?: SectionNavLayout | null
    ) => {
      const acquiring = sectionNavPointerAcquiringRefs.current[side];
      const resolvedLayout =
        layout ?? getSectionNavLayout(sectionNavButtonRefs.current[side]);

      updateSectionNavPointer(
        side,
        pointerY,
        resolvedLayout,
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
  const trackSectionNavPointers = useCallback(
    (pointerY: number) => {
      const layoutSide = sectionNavPointerOwnerRef.current ?? 'left';
      const layout = getSectionNavLayout(
        sectionNavButtonRefs.current[layoutSide]
      );

      (['left', 'right'] as const).forEach((side) => {
        trackSectionNavPointer(side, pointerY, layout);
      });
    },
    [trackSectionNavPointer]
  );
  const scheduleSectionNavPointerTracking = useCallback(
    (pointerY: number) => {
      sectionNavPendingPointerYRef.current = pointerY;

      if (sectionNavPointerFrameRef.current !== null) {
        return;
      }

      sectionNavPointerFrameRef.current = requestAnimationFrame(() => {
        sectionNavPointerFrameRef.current = null;
        const pendingPointerY = sectionNavPendingPointerYRef.current;

        if (pendingPointerY === null) {
          return;
        }

        trackSectionNavPointers(pendingPointerY);
      });
    },
    [trackSectionNavPointers]
  );
  const engageSectionNavPointers = useCallback(
    (pointerOwner: 'left' | 'right', pointerY: number) => {
      sectionNavPointerOwnerRef.current = pointerOwner;
      setSectionNavTooltipVisibility(
        pointerOwner === 'left' ? 'right' : 'left',
        false
      );

      (['left', 'right'] as const).forEach((side) => {
        if (!sectionNavPointerArmedRefs.current[side]) {
          sectionNavPointerAcquiringRefs.current[side] = true;
        }

        sectionNavPointerArmedRefs.current[side] = true;
      });

      trackSectionNavPointers(pointerY);
    },
    [setSectionNavTooltipVisibility, trackSectionNavPointers]
  );
  const returnSectionNavPointersToIdle = useCallback(
    (pointerOwner: 'left' | 'right', delayed: boolean) => {
      if (sectionNavPointerOwnerRef.current !== pointerOwner) {
        return;
      }

      sectionNavPointerOwnerRef.current = null;
      sectionNavPendingPointerYRef.current = null;
      hideSectionNavTooltips();

      if (sectionNavPointerFrameRef.current !== null) {
        cancelAnimationFrame(sectionNavPointerFrameRef.current);
        sectionNavPointerFrameRef.current = null;
      }

      (['left', 'right'] as const).forEach((side) => {
        returnSectionNavPointerToIdle(side, delayed);
      });
    },
    [hideSectionNavTooltips, returnSectionNavPointerToIdle]
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

      if (side === 'left') {
        applySectionNavActiveScale(itemIndex, itemIndex, duration);
      }
    },
    [animateSectionNavRingStroke, applySectionNavActiveScale]
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
      sectionNavTooltipsSuppressedRef.current = true;
      hideSectionNavTooltips();
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
    [hideSectionNavTooltips, positionSectionNavClickTarget]
  );
  const lockSectionNavIndicatorsToItem = useCallback(
    (
      sourceSide: 'left' | 'right',
      itemIndex: number,
      axis: 'horizontal' | 'vertical',
      onAttached?: () => void
    ) => {
      (['left', 'right'] as const).forEach((side) => {
        lockSectionNavIndicatorToItem(
          side,
          itemIndex,
          axis,
          side === sourceSide ? onAttached : undefined
        );
      });
    },
    [lockSectionNavIndicatorToItem]
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
        const tooltipsSuppressed = Object.values(
          sectionNavClickTargetIndexesRef.current
        ).some((targetIndex) => targetIndex !== null);
        sectionNavTooltipsSuppressedRef.current = tooltipsSuppressed;

        if (!tooltipsSuppressed) {
          const pointerOwner = sectionNavPointerOwnerRef.current;

          if (
            pointerOwner &&
            sectionNavTooltipIndexesRef.current[pointerOwner] !== null
          ) {
            setSectionNavTooltipText(
              pointerOwner,
              sectionNavTooltipIndexesRef.current[pointerOwner]
            );
            setSectionNavTooltipVisibility(pointerOwner, true);
          }
        }
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
      setSectionNavTooltipText,
      setSectionNavTooltipVisibility,
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
  const projectMediaKeys = useMemo(
    () =>
      portfolioSlides.map((project) =>
        getProjectMediaScreenshots(project).map((screenshot) =>
          carouselMediaKey(screenshot)
        )
      ),
    []
  );
  const sectionEntryMediaKeys = useMemo(
    () => projectMediaKeys.flatMap((keys) => (keys[0] ? [keys[0]] : [])),
    [projectMediaKeys]
  );
  const initialTargetScreenshot = useMemo(() => {
    if (normalizedInitialProjectIndex < 0) {
      return undefined;
    }

    const project = portfolioSlides[normalizedInitialProjectIndex];
    const initialSlide = projectSlides[project.slug][
      initialSlideIndexes[normalizedInitialProjectIndex] ?? 0
    ];

    return initialSlide?.kind === 'screenshot' &&
      !isBuildingWithAiTextSlide(project, initialSlide)
      ? initialSlide.screenshot
      : undefined;
  }, [initialSlideIndexes, normalizedInitialProjectIndex, projectSlides]);
  const openingMediaKeys = useMemo(() => {
    const journeyKeys = projectMediaKeys
      .slice(0, normalizedInitialProjectIndex + 1)
      .map((keys) => keys[0])
      .filter(Boolean);

    if (initialTargetScreenshot) {
      journeyKeys.push(carouselMediaKey(initialTargetScreenshot));
    }

    return Array.from(new Set(journeyKeys));
  }, [initialTargetScreenshot, normalizedInitialProjectIndex, projectMediaKeys]);
  const backgroundMediaQueue = useMemo(() => {
    const activeProjectMedia =
      normalizedInitialProjectIndex >= 0
        ? getProjectMediaScreenshots(
            portfolioSlides[normalizedInitialProjectIndex]
          )
        : [];
    const activeScreenshotIndex = initialTargetScreenshot
      ? activeProjectMedia.findIndex(
          (screenshot) => screenshot.id === initialTargetScreenshot.id
        )
      : 0;
    const adjacentKeys = [-1, 1]
      .map((offset) => activeProjectMedia[activeScreenshotIndex + offset])
      .filter((screenshot): screenshot is PortfolioScreenshot => Boolean(screenshot))
      .map(carouselMediaKey);

    return Array.from(
      new Set([
        ...adjacentKeys,
        ...sectionEntryMediaKeys,
        ...projectMediaKeys.flat(),
      ])
    );
  }, [
    initialTargetScreenshot,
    normalizedInitialProjectIndex,
    projectMediaKeys,
    sectionEntryMediaKeys,
  ]);
  const sectionEntryMediaReady = sectionEntryMediaKeys.every(isMediaReady);
  const projectCarouselsReady = projectMediaKeys.map((keys) =>
    keys.every(isMediaReady)
  );

  const [activeProjectIndex, setActiveProjectIndex] = useState(
    normalizedInitialProjectIndex
  );
  const [activeSlideIndexes, setActiveSlideIndexes] = useState(initialSlideIndexes);
  useLayoutEffect(() => {
    sectionNavActiveIndexRef.current = activeProjectIndex + 1;

    if (!initialRevealCompleteRef.current) {
      sectionNavScrollPositionRef.current = activeProjectIndex + 1;
    }
  }, [activeProjectIndex]);

  const isWideLayout = useSyncExternalStore(
    subscribeToWideLayout,
    getWideLayoutSnapshot,
    getWideLayoutServerSnapshot
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [modalTransitionRect, setModalTransitionRect] =
    useState<ModalTransitionRect | null>(null);

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
    (
      project: PortfolioProject,
      slideIndex: number,
      behavior: ScrollBehavior,
      onComplete?: () => void
    ) => {
      const carousel = horizontalRefs.current[project.slug];

      if (!carousel) {
        onComplete?.();
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
      const targetScrollLeft = carousel.clientWidth * nextRenderedIndex;
      const currentTween = horizontalScrollTweenRefs.current[project.slug];

      if (
        behavior !== 'smooth' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        currentTween?.kill();
        horizontalScrollTweenRefs.current[project.slug] = null;
        carousel.style.removeProperty('scroll-snap-type');
        carousel.scrollTo({ left: targetScrollLeft, behavior: 'auto' });
        onComplete?.();
        return;
      }

      carousel.style.scrollSnapType = 'none';
      const distanceInSlides =
        Math.abs(targetScrollLeft - carousel.scrollLeft) /
        Math.max(carousel.clientWidth, 1);
      const tween = gsap.to(carousel, {
        scrollLeft: targetScrollLeft,
        duration: Math.min(0.85, 0.48 + distanceInSlides * 0.08),
        ease: 'power3.out',
        overwrite: 'auto',
        onComplete: () => {
          if (horizontalScrollTweenRefs.current[project.slug] === tween) {
            horizontalScrollTweenRefs.current[project.slug] = null;
            carousel.style.removeProperty('scroll-snap-type');
            carousel.scrollTo({ left: targetScrollLeft, behavior: 'auto' });
            onComplete?.();
          }
        },
        onInterrupt: () => {
          if (horizontalScrollTweenRefs.current[project.slug] === tween) {
            horizontalScrollTweenRefs.current[project.slug] = null;
          }
        },
      });

      horizontalScrollTweenRefs.current[project.slug] = tween;
    },
    [getCarouselIndexFromSlideIndex, getCarouselSlides]
  );

  const syncHorizontalViewports = useCallback(
    (
      slideIndexes: number[],
      behavior: ScrollBehavior
    ) => {
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

      syncHorizontalViewports(slideIndexes, behavior);
    },
    [syncHorizontalViewports]
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
    async (behavior: ScrollBehavior) => {
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

      if (locationState.projectIndex >= 0) {
        const project = portfolioSlides[locationState.projectIndex];
        const slide = projectSlides[project.slug][locationState.slideIndex];
        const requiredKeys = [
          getSlideMediaKey(project, slide, isWideLayout),
          locationState.modalOpen && slide.kind === 'screenshot'
            ? modalMediaKey(slide.screenshot)
            : undefined,
        ].filter((key): key is string => Boolean(key));
        const intent = navigationIntentRef.current + 1;
        navigationIntentRef.current = intent;

        if (!requiredKeys.every(isMediaReady)) {
          setPendingNavigation(
            locationState.modalOpen && slide.kind === 'screenshot'
              ? { kind: 'modal', screenshotId: slide.screenshot.id }
              : {
                  kind: 'slide',
                  projectIndex: locationState.projectIndex,
                  slideIndex: locationState.slideIndex,
                }
          );

          try {
            await ensureMediaReady(requiredKeys);
          } catch {
            return;
          }

          if (navigationIntentRef.current !== intent) {
            return;
          }
        }

        setPendingNavigation(null);
      }

      setActiveProjectIndex(locationState.projectIndex);
      setActiveSlideIndexes(nextSlideIndexes);
      setIsModalOpen(locationState.modalOpen);

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
      ensureMediaReady,
      isMediaReady,
      isWideLayout,
      projectSlides,
      readLocationState,
      resetDescriptionScroll,
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
      setIsModalOpen(false);
    },
    []
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

    const syncedProjectSlug = horizontalScrollSyncProjectRef.current;
    horizontalScrollSyncProjectRef.current = null;

    if (project) {
      delete horizontalTargetSlideIndexesRef.current[project.slug];
      delete horizontalKeyboardIndicatorIndexesRef.current[project.slug];
      delete horizontalPendingNavigationIntentRefs.current[project.slug];
    } else if (syncedProjectSlug) {
      delete horizontalTargetSlideIndexesRef.current[syncedProjectSlug];
      delete horizontalKeyboardIndicatorIndexesRef.current[syncedProjectSlug];
      delete horizontalPendingNavigationIntentRefs.current[syncedProjectSlug];
    }

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
          delete horizontalTargetSlideIndexesRef.current[project.slug];
        }

        horizontalScrollSyncTimeoutRef.current = null;
      }, 1000);
    },
    [clearHorizontalScrollSync]
  );

  const prepareMediaNavigation = useCallback(
    async (
      pending: Exclude<PendingNavigation, null>,
      mediaKeys?: string | string[]
    ) => {
      const intent = navigationIntentRef.current + 1;
      navigationIntentRef.current = intent;
      const requiredKeys = (Array.isArray(mediaKeys) ? mediaKeys : [mediaKeys]).filter(
        (key): key is string => Boolean(key)
      );

      if (requiredKeys.every(isMediaReady)) {
        setPendingNavigation(null);
        return true;
      }

      setPendingNavigation(pending);

      try {
        await ensureMediaReady(requiredKeys);
      } catch {
        return false;
      }

      if (navigationIntentRef.current !== intent) {
        return false;
      }

      setPendingNavigation(null);
      return true;
    },
    [ensureMediaReady, isMediaReady]
  );

  const setActiveSlide = useCallback(
    async (
      projectIndex: number,
      realIndex: number,
      mode: 'push' | 'replace',
      scrollBehavior: ScrollBehavior
    ) => {
      const project = portfolioSlides[projectIndex];
      const slides = projectSlides[project.slug];
      const nextIndex = positiveModulo(realIndex, slides.length);
      const nextSlide = slides[nextIndex];
      const horizontalIntent =
        (horizontalPendingNavigationIntentRefs.current[project.slug] ?? 0) + 1;
      horizontalPendingNavigationIntentRefs.current[project.slug] =
        horizontalIntent;
      horizontalTargetSlideIndexesRef.current[project.slug] = nextIndex;
      horizontalKeyboardIndicatorIndexesRef.current[project.slug] =
        getCarouselIndexFromSlideIndex(project, nextIndex);
      const canNavigate = await prepareMediaNavigation(
        { kind: 'slide', projectIndex, slideIndex: nextIndex },
        getSlideMediaKey(project, nextSlide, isWideLayout)
      );

      if (!canNavigate) {
        if (
          horizontalPendingNavigationIntentRefs.current[project.slug] ===
          horizontalIntent
        ) {
          delete horizontalPendingNavigationIntentRefs.current[project.slug];
          delete horizontalTargetSlideIndexesRef.current[project.slug];
        }
        return;
      }

      if (
        horizontalPendingNavigationIntentRefs.current[project.slug] !==
        horizontalIntent
      ) {
        return;
      }

      delete horizontalPendingNavigationIntentRefs.current[project.slug];

      if (nextSlide.kind === 'description') {
        resetDescriptionScroll(project);
      }

      if (scrollBehavior === 'smooth') {
        beginHorizontalScrollSync(project);
      }

      horizontalTargetSlideIndexesRef.current[project.slug] = nextIndex;
      horizontalKeyboardIndicatorIndexesRef.current[project.slug] =
        getCarouselIndexFromSlideIndex(project, nextIndex);
      scrollHorizontalToRealIndex(project, nextIndex, scrollBehavior, () => {
        updateUrl(project, nextSlide, mode);
        startTransition(() => {
          setActiveSlideIndexes((indexes) =>
            indexes.map((index, currentProjectIndex) =>
              currentProjectIndex === projectIndex ? nextIndex : index
            )
          );
        });
      });
    },
    [
      beginHorizontalScrollSync,
      getCarouselIndexFromSlideIndex,
      isWideLayout,
      prepareMediaNavigation,
      projectSlides,
      resetDescriptionScroll,
      scrollHorizontalToRealIndex,
      updateUrl,
    ]
  );

  const setActiveProject = useCallback(
    async (
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

      if (boundedIndex !== START_SCREEN_INDEX) {
        const project = portfolioSlides[boundedIndex];
        const slideIndex =
          targetSlideIndex ?? activeSlideIndexes[boundedIndex] ?? 0;
        const slide = projectSlides[project.slug][slideIndex];
        const canNavigate = await prepareMediaNavigation(
          { kind: 'project', projectIndex: boundedIndex },
          getSlideMediaKey(project, slide, isWideLayout)
        );

        if (!canNavigate) {
          return;
        }
      } else {
        navigationIntentRef.current += 1;
        setPendingNavigation(null);
      }

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
      isWideLayout,
      prepareMediaNavigation,
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
      const currentSlideIndex =
        horizontalTargetSlideIndexesRef.current[currentProject.slug] ??
        activeSlideIndexes[activeProjectIndex] ??
        0;
      const currentCarouselIndex = getCarouselIndexFromSlideIndex(
        currentProject,
        currentSlideIndex
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
    async (slide: ProjectSlide, scrollBehavior: ScrollBehavior = 'smooth') => {
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
      const canNavigate = await prepareMediaNavigation(
        { kind: 'modal', screenshotId: slide.screenshot.id },
        modalMediaKey(slide.screenshot)
      );

      if (!canNavigate) {
        return;
      }

      setActiveSlideIndexes((indexes) =>
        indexes.map((index, currentProjectIndex) =>
          currentProjectIndex === activeProjectIndex ? nextSlideIndex : index
        )
      );

      if (scrollBehavior === 'smooth') {
        beginHorizontalScrollSync(activeProject);
      }

      scrollHorizontalToRealIndex(activeProject, nextSlideIndex, scrollBehavior);
      replaceModalUrl(activeProject, slide);
      // After modal-only navigation, Close should land on the current slide.
      modalHistoryEntryRef.current = false;
    },
    [
      activeProject,
      activeProjectIndex,
      beginHorizontalScrollSync,
      prepareMediaNavigation,
      projectSlides,
      replaceModalUrl,
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
    async (
      slide: ProjectSlide = activeSlide,
      transitionRect?: ModalTransitionRect
    ) => {
      if (
        !activeProject ||
        !slide ||
        slide.kind !== 'screenshot' ||
        isBuildingWithAiTextSlide(activeProject, slide)
      ) {
        return;
      }

      const canOpen = await prepareMediaNavigation(
        { kind: 'modal', screenshotId: slide.screenshot.id },
        modalMediaKey(slide.screenshot)
      );

      if (!canOpen) {
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
      window.history.pushState({}, '', `${projectUrl(activeProject, slide)}?modal=image`);
      document.title = pageTitle(activeProject, slide);
      modalHistoryEntryRef.current = true;
      setIsModalOpen(true);
    },
    [
      activeProject,
      activeProjectIndex,
      activeSlide,
      prepareMediaNavigation,
      projectSlides,
    ]
  );

  const finishCloseModal = useCallback(() => {
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
  }, [activeProject, activeSlide]);

  const closeModal = useCallback(() => {
    if (!shouldShowModal || isModalClosing) {
      return;
    }

    const beginClose = () => {
      const nextTransitionRect = activeScreenshot
        ? getVisibleScreenshotButtonRect(activeScreenshot.id)
        : modalTransitionRect;

      if (!nextTransitionRect) {
        finishCloseModal();
        return;
      }

      setModalTransitionRect(nextTransitionRect);
      setIsModalClosing(true);
    };

    if (!activeProject) {
      beginClose();
      return;
    }

    clearHorizontalScrollSync(activeProject);
    scrollHorizontalToRealIndex(
      activeProject,
      activeSlideIndex,
      'auto',
      beginClose
    );
  }, [
    activeProject,
    activeSlideIndex,
    activeScreenshot,
    clearHorizontalScrollSync,
    finishCloseModal,
    isModalClosing,
    modalTransitionRect,
    scrollHorizontalToRealIndex,
    shouldShowModal,
  ]);

  const reopenModal = useCallback(() => {
    if (!shouldShowModal || !isModalClosing) {
      return;
    }

    setIsModalClosing(false);
  }, [isModalClosing, shouldShowModal]);

  const startInitialRevealEvent = useEffectEvent(async () => {
    const vertical = verticalRef.current;
    const curtain = curtainRef.current;

    if (!vertical || !curtain) {
      return;
    }

    const initialProject =
      normalizedInitialProjectIndex >= 0
        ? portfolioSlides[normalizedInitialProjectIndex]
        : undefined;
    const initialSlide = initialProject
      ? projectSlides[initialProject.slug][
          initialSlideIndexes[normalizedInitialProjectIndex] ?? 0
        ]
      : undefined;
    const shouldOpenInitialModal = Boolean(
      initialModalRequestedRef.current &&
        initialProject &&
        initialSlide?.kind === 'screenshot' &&
        !isBuildingWithAiTextSlide(initialProject, initialSlide)
    );

    window.history.scrollRestoration = 'manual';
    scrollSyncRef.current = true;
    vertical.scrollTo({ top: 0, behavior: 'auto' });
    syncHorizontalViewports(initialSlideIndexes, 'auto');

    await Promise.all([
      document.fonts.ready.catch(() => undefined),
      nextAnimationFrame().then(nextAnimationFrame),
    ]);

    if (
      shouldOpenInitialModal &&
      initialProject &&
      initialSlide?.kind === 'screenshot'
    ) {
      setIsModalOpen(true);
      replaceModalUrl(initialProject, initialSlide);
      await nextAnimationFrame();
      await nextAnimationFrame();
    }

    const requiredMediaKeys = [...openingMediaKeys];

    if (shouldOpenInitialModal && initialTargetScreenshot) {
      requiredMediaKeys.push(modalMediaKey(initialTargetScreenshot));
    }

    try {
      await ensureMediaReady(requiredMediaKeys);
    } catch {
      setIntroPhase('error');
      return;
    }

    const targetScrollTop =
      vertical.clientHeight * (normalizedInitialProjectIndex + 1);
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const revealDuration = reducedMotion
      ? 0.2
      : normalizedInitialProjectIndex === START_SCREEN_INDEX
        ? 0.6
        : 0.9;

    setIntroPhase('revealing');
    gsap.set(curtain, { autoAlpha: 1 });

    await new Promise<void>((resolve) => {
      if (reducedMotion) {
        vertical.scrollTo({ top: targetScrollTop, behavior: 'auto' });
      }

      const timeline = gsap.timeline({
        defaults: { ease: 'power3.inOut' },
        onComplete: resolve,
      });
      introTimelineRef.current = timeline;

      if (!reducedMotion && targetScrollTop !== 0) {
        timeline.to(
          vertical,
          { scrollTop: targetScrollTop, duration: revealDuration },
          0
        );
      }

      timeline.to(
        curtain,
        { autoAlpha: 0, duration: revealDuration },
        0
      );
    });

    introTimelineRef.current = null;
    initialRevealCompleteRef.current = true;
    scrollSyncRef.current = false;
    setIntroPhase('ready');
    void preloadQueue(backgroundMediaQueue, 2).catch(() => undefined);
  });

  const handlePopStateEvent = useEffectEvent(() => {
    modalHistoryEntryRef.current = false;
    void applyLocationState('auto');
  });

  const syncCurrentViewportEvent = useEffectEvent(() => {
    if (!initialRevealCompleteRef.current) {
      syncHorizontalViewports(activeSlideIndexes, 'auto');
      return;
    }

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
      if (!initialRevealCompleteRef.current && scrollSyncRef.current) {
        return;
      }

      if (
        horizontalPendingNavigationIntentRefs.current[project.slug] !==
          undefined ||
        horizontalScrollTweenRefs.current[project.slug]
      ) {
        return;
      }

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
      if (!initialRevealCompleteRef.current && scrollSyncRef.current) {
        return;
      }

      if (
        horizontalPendingNavigationIntentRefs.current[project.slug] !==
          undefined ||
        horizontalScrollTweenRefs.current[project.slug]
      ) {
        return;
      }

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
    const activeIndex =
      !shouldShowModal && activeProject
        ? horizontalKeyboardIndicatorIndexesRef.current[activeProject.slug] ??
          Number(activeButton.dataset.portfolioSlideIndicatorIndex)
        : Number(activeButton.dataset.portfolioSlideIndicatorIndex);
    const targetIndex = positiveModulo(activeIndex + direction, buttons.length);
    const targetButton = buttons.find(
      (button) =>
        Number(button.dataset.portfolioSlideIndicatorIndex) === targetIndex
    );

    if (!targetButton) {
      return false;
    }

    if (!shouldShowModal && activeProject) {
      horizontalKeyboardIndicatorIndexesRef.current[activeProject.slug] =
        targetIndex;
    }
    targetButton.click();
    return true;
  }, [activeProject, shouldShowModal]);

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
    if (initialRevealStartedRef.current) {
      return;
    }

    initialRevealStartedRef.current = true;
    void startInitialRevealEvent();

    return () => {
      introTimelineRef.current?.kill();
      introTimelineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mediaFailure) {
      return;
    }

    introTimelineRef.current?.kill();
    introTimelineRef.current = null;
    scrollSyncRef.current = false;

    const curtain = curtainRef.current;

    if (!curtain) {
      return;
    }

    gsap.to(curtain, {
      autoAlpha: 1,
      duration: initialRevealCompleteRef.current ? 0.3 : 0,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }, [mediaFailure]);

  useLayoutEffect(() => {
    const vertical = verticalRef.current;
    const indicators = sectionNavIndicatorRefs.current.filter(
      (indicator): indicator is HTMLDivElement => Boolean(indicator)
    );
    const rings = indicators
      .map((indicator) => indicator.querySelector('circle'))
      .filter((ring): ring is SVGCircleElement => Boolean(ring));
    const previews = sectionNavPreviewRefs.current.filter(
      (preview): preview is HTMLDivElement => Boolean(preview)
    );
    const leftIcons = sectionNavIconRefs.current.left.filter(
      (icon): icon is SVGSVGElement => Boolean(icon)
    );
    const rightIcons = sectionNavIconRefs.current.right.filter(
      (icon): icon is SVGSVGElement => Boolean(icon)
    );
    const leftDots = sectionNavDotRefs.current.left.filter(
      (dot): dot is SVGSVGElement => Boolean(dot)
    );
    const rightDots = sectionNavDotRefs.current.right.filter(
      (dot): dot is SVGSVGElement => Boolean(dot)
    );
    const leftVisuals = sectionNavVisualRefs.current.left.filter(
      (visual): visual is HTMLSpanElement => Boolean(visual)
    );
    const rightVisuals = sectionNavVisualRefs.current.right.filter(
      (visual): visual is HTMLSpanElement => Boolean(visual)
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
      rightIcons.length !== SECTION_NAV_COLORS.length ||
      leftDots.length !== SECTION_NAV_COLORS.length ||
      rightDots.length !== SECTION_NAV_COLORS.length ||
      leftVisuals.length !== SECTION_NAV_COLORS.length ||
      rightVisuals.length !== SECTION_NAV_COLORS.length
    ) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      const timelineColors = SECTION_NAV_COLORS.map((color) => {
        const [red, green, blue] = gsap.utils.splitColor(color);

        return `rgb(${red}, ${green}, ${blue})`;
      });
      const iconGroups = [leftIcons, rightIcons];
      const dotGroups = [leftDots, rightDots];
      const setAffordanceLayers = (position: number) => {
        const lowerIndex = Math.max(0, Math.floor(position));
        const upperIndex = Math.min(
          SECTION_NAV_HAS_SLIDES.length - 1,
          Math.ceil(position)
        );
        const progress = position - lowerIndex;
        const directDotTransition =
          lowerIndex !== upperIndex &&
          !SECTION_NAV_HAS_SLIDES[lowerIndex] &&
          !SECTION_NAV_HAS_SLIDES[upperIndex];

        SECTION_NAV_HAS_SLIDES.forEach((hasSlides, itemIndex) => {
          let arrowOpacity = 1;
          let dotOpacity = 0;
          const pending = (['left', 'right'] as const).some(
            (side) =>
              sectionNavButtonRefs.current[side][itemIndex]?.querySelector(
                '[aria-busy="true"]'
              )
          );

          if (pending) {
            arrowOpacity = 1;
          } else if (!hasSlides) {
            if (
              directDotTransition &&
              (itemIndex === lowerIndex || itemIndex === upperIndex)
            ) {
              arrowOpacity = 0;
              dotOpacity =
                itemIndex === lowerIndex ? 1 - progress : progress;
            } else {
              const activation = Math.max(
                0,
                1 - Math.abs(position - itemIndex)
              );
              ({ arrowOpacity, dotOpacity } =
                getSectionNavAffordanceOpacity(activation));
            }
          }

          iconGroups.forEach((icons) =>
            gsap.set(icons[itemIndex], { opacity: arrowOpacity })
          );
          dotGroups.forEach((dots) =>
            gsap.set(dots[itemIndex], { opacity: dotOpacity })
          );
        });
      };
      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          scroller: vertical,
          start: 0,
          end: 'max',
          scrub: true,
          onUpdate: (scrollTrigger) => {
            const scrollPosition =
              scrollTrigger.progress * (SECTION_NAV_COLORS.length - 1);
            sectionNavScrollPositionRef.current = scrollPosition;
            setAffordanceLayers(scrollPosition);

            const hasPointer = Object.values(
              sectionNavPointerArmedRefs.current
            ).some(Boolean);
            const hasClickTarget = Object.values(
              sectionNavClickTargetIndexesRef.current
            ).some((targetIndex) => targetIndex !== null);

            if (!hasPointer && !hasClickTarget) {
              applySectionNavScrollScale(scrollPosition);
            }

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
      timeline.set([...leftVisuals, ...rightVisuals, ...rings], {
        transformOrigin: '50% 50%',
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
      setAffordanceLayers(initialSectionNavIndex);
      applySectionNavScrollScale(initialSectionNavIndex);

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
  }, [
    applySectionNavScrollScale,
    initialSectionNavIndex,
    isWideLayout,
    positionSectionNavClickTarget,
    trackSectionNavPointer,
  ]);

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

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );
    const syncReducedMotion = () => {
      sectionNavReducedMotionRef.current = reducedMotion.matches;
    };

    syncReducedMotion();
    reducedMotion.addEventListener('change', syncReducedMotion);

    return () => {
      reducedMotion.removeEventListener('change', syncReducedMotion);

      if (sectionNavPointerFrameRef.current !== null) {
        cancelAnimationFrame(sectionNavPointerFrameRef.current);
        sectionNavPointerFrameRef.current = null;
      }
    };
  }, []);

  const reevaluateSectionNavPointersEvent = useEffectEvent(() => {
    const pointerY =
      sectionNavPointerYRefs.current.left ??
      sectionNavPointerYRefs.current.right;

    if (pointerY !== null) {
      trackSectionNavPointers(pointerY);
    }
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
      Object.values(horizontalScrollTweenRefs.current).forEach((tween) => {
        tween?.kill();
      });
      Object.values(horizontalRefs.current).forEach((carousel) => {
        carousel?.style.removeProperty('scroll-snap-type');
      });
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
  const pendingNavigationSlide =
    pendingNavigation?.kind === 'slide' &&
    pendingNavigation.projectIndex === activeProjectIndex &&
    activeProject
      ? projectSlides[activeProject.slug][pendingNavigation.slideIndex]
      : pendingNavigation?.kind === 'modal'
        ? activeNavigationSlides.find(
            (slide) =>
              slide.kind === 'screenshot' &&
              slide.screenshot.id === pendingNavigation.screenshotId
          )
        : undefined;
  const pendingNavigationIndex = pendingNavigationSlide
    ? activeNavigationSlides.findIndex(
        (slide) => slide.id === pendingNavigationSlide.id
      )
    : null;
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
  const getSectionNavItemPresentation = (
    item: (typeof sectionNavItems)[number],
    side: 'left' | 'right'
  ) => {
    const isActiveSection = item.projectIndex === activeProjectIndex;
    const isActiveProjectSection =
      isActiveSection && item.projectIndex !== START_SCREEN_INDEX;
    const isLeftSide = side === 'left';
    const hasHorizontalAction =
      isActiveProjectSection && canMoveHorizontally;
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

    return {
      hasHorizontalAction,
      isActiveSection,
      isLeftSide,
      label,
      tooltipTitle,
    };
  };
  const renderSectionNavButton = (
    item: (typeof sectionNavItems)[number],
    side: 'left' | 'right',
    itemIndex: number
  ) => {
    const {
      hasHorizontalAction,
      isActiveSection,
      isLeftSide,
      label,
      tooltipTitle,
    } = getSectionNavItemPresentation(item, side);
    const tooltipId = `portfolio-${side}-section-nav-tooltip`;
    const isPending = Boolean(
      (pendingNavigation?.kind === 'project' &&
        pendingNavigation.projectIndex === item.projectIndex) ||
        ((pendingNavigation?.kind === 'slide' ||
          pendingNavigation?.kind === 'modal') &&
          isActiveSection)
    );

    return (
      <SideNavButton
        key={`${side}-${item.id}`}
        icon={isPending ? faSpinner : faArrowDown}
        iconRef={(node) => {
          sectionNavIconRefs.current[side][itemIndex] = node;
        }}
        dotRef={(node) => {
          sectionNavDotRefs.current[side][itemIndex] = node;
        }}
        visualRef={(node) => {
          sectionNavVisualRefs.current[side][itemIndex] = node;
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
        pending={isPending}
        concealed={isModalPresentationActive && !isActiveSection}
        onPreviewChange={(previewed) => {
          previewSectionNavItem(side, itemIndex, item.color, previewed);
          const currentTooltipIndex =
            sectionNavTooltipIndexesRef.current[side];

          if (previewed) {
            sectionNavTooltipIndexesRef.current[side] = itemIndex;
            setSectionNavTooltipText(side, itemIndex, tooltipTitle);
          } else if (currentTooltipIndex === itemIndex) {
            sectionNavTooltipIndexesRef.current[side] = null;
          }

          const pointerOwner = sectionNavPointerOwnerRef.current;
          const shouldShowTooltip =
            sectionNavTooltipIndexesRef.current[side] === itemIndex &&
            !sectionNavTooltipsSuppressedRef.current &&
            (pointerOwner === null || pointerOwner === side);

          setSectionNavTooltipVisibility(side, shouldShowTooltip);
        }}
        onPointerEngage={(pointerY) =>
          engageSectionNavPointers(side, pointerY)
        }
        onClick={(event) => {
          focusKeyboardSurface();

          if (hasHorizontalAction) {
            lockSectionNavIndicatorsToItem(side, itemIndex, 'horizontal');

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
              lockSectionNavIndicatorsToItem(
                side,
                itemIndex,
                'vertical',
                showProject
              );
            } else {
              lockSectionNavIndicatorsToItem(side, itemIndex, 'vertical');
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
          if (
            sectionNavPointerOwnerRef.current === side &&
            sectionNavPointerArmedRefs.current[side]
          ) {
            scheduleSectionNavPointerTracking(event.clientY);
          }
        }}
        onPointerLeave={() => returnSectionNavPointersToIdle(side, true)}
        onWheel={(event) => {
          const vertical = verticalRef.current;

          if (!vertical || !sectionEntryMediaReady) {
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
            className="relative flex flex-col"
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
              className="absolute left-0 top-1.5 z-0"
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
              tooltip={{
                id: `portfolio-${side}-section-nav-tooltip`,
                side,
                elementRef: (node) => {
                  sectionNavTooltipRefs.current[side] = node;
                },
                textElementRef: (node) => {
                  sectionNavTooltipTextRefs.current[side] = node;
                },
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
        className={`h-dvh overscroll-none portfolio-scrollbar-none ${
          renderedIntroPhase === 'ready' ? 'snap-y snap-mandatory' : 'snap-none'
        } ${
          renderedIntroPhase === 'ready' && sectionEntryMediaReady
            ? 'overflow-y-auto'
            : 'overflow-y-hidden'
        }`}
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
                  aria-busy={
                    pendingNavigation?.kind === 'project' &&
                    pendingNavigation.projectIndex === index
                      ? true
                      : undefined
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
                          {pendingNavigation?.kind === 'project' &&
                          pendingNavigation.projectIndex === index ? (
                            <FontAwesomeIcon
                              icon={faSpinner}
                              className="size-4 animate-spin"
                            />
                          ) : (
                            String(index + 1).padStart(2, '0')
                          )}
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
                      {pendingNavigation?.kind === 'project' &&
                      pendingNavigation.projectIndex === index ? (
                        <FontAwesomeIcon
                          icon={faSpinner}
                          className="size-4 animate-spin"
                        />
                      ) : (
                        String(index + 1).padStart(2, '0')
                      )}
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
                className={`flex h-dvh snap-x snap-mandatory overflow-y-hidden overscroll-x-contain portfolio-scrollbar-none ${
                  projectCarouselsReady[projectIndex]
                    ? 'overflow-x-auto'
                    : 'overflow-x-hidden'
                } ${
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
                    concealedScreenshotId={
                      isModalLayerActive ? activeScreenshot?.id : undefined
                    }
                    registerMediaElement={registerMediaElement}
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
            pendingIndex={pendingNavigationIndex}
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
          registerMediaElement={registerMediaElement}
          onClose={closeModal}
          onExited={finishCloseModal}
        />
      ) : null}

      <div
        ref={curtainRef}
        data-portfolio-loading-curtain
        data-phase={renderedIntroPhase}
        className={`fixed inset-0 z-[100] grid place-items-center bg-black ${
          renderedIntroPhase === 'ready'
            ? 'pointer-events-none'
            : 'pointer-events-auto'
        }`}
      >
        <div
          role={renderedIntroPhase === 'error' ? 'alert' : undefined}
          className={`flex max-w-md flex-col items-center gap-5 px-8 text-center transition-opacity duration-300 ${
            renderedIntroPhase === 'error' ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden={renderedIntroPhase === 'error' ? undefined : true}
        >
          <p className="text-lg font-light leading-relaxed text-white/80">
            Portfolio media didn&apos;t finish loading.
          </p>
          <CircularIconButton
            icon={faRotateRight}
            iconClassName="size-6"
            ring
            className="relative size-12 bg-black text-white"
            aria-label="Reload page"
            title="Reload page"
            onClick={() => window.location.reload()}
          />
        </div>
      </div>
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
  pendingIndex,
  color,
  onSelect,
}: {
  projectTitle: string;
  slides: ProjectSlide[];
  activeIndex: number;
  pendingIndex: number | null;
  color: string;
  onSelect: (slide: ProjectSlide) => void;
}) {
  const visibleSlides = slides.length > 1 ? slides : [];
  const targetCount = visibleSlides.length;
  const boundedActiveIndex = Math.max(
    0,
    Math.min(activeIndex, Math.max(targetCount - 1, 0))
  );
  const slidesIdentity = visibleSlides.map((slide) => slide.id).join('|');
  const previousCountRef = useRef(targetCount);
  const transitionFrameRef = useRef<number | null>(null);
  const transitionStartFrameRef = useRef<number | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const ringRef = useRef<HTMLDivElement | null>(null);
  const ringTweenRef = useRef<gsap.core.Tween | null>(null);
  const previewReturnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const pendingPointerXRef = useRef<number | null>(null);
  const pointerXRef = useRef<number | null>(null);
  const rootFontSizeRef = useRef(16);
  const pointerArmedRef = useRef(false);
  const pointerAcquiringRef = useRef(false);
  const snappedIndexRef = useRef<number | null>(null);
  const snapTransitioningRef = useRef(false);
  const clickTargetIndexRef = useRef<number | null>(null);
  const focusedIndexRef = useRef<number | null>(null);
  const ringStrokeWidthRef = useRef<2 | 4>(4);
  const activeIndexRef = useRef(boundedActiveIndex);
  useLayoutEffect(() => {
    activeIndexRef.current = boundedActiveIndex;
  }, [boundedActiveIndex]);
  const [transitionState, setTransitionState] =
    useState<IndicatorTransitionState>({
      previousCount: targetCount,
      targetCount,
      phase: 'idle',
    });

  const clearPreviewReturnTimeout = () => {
    if (!previewReturnTimeoutRef.current) {
      return;
    }

    clearTimeout(previewReturnTimeoutRef.current);
    previewReturnTimeoutRef.current = null;
  };

  const applyActiveScale = (position: number) => {
    const container = containerRef.current;
    const ring = ringRef.current;

    if (!container || !ring) {
      return;
    }

    const activeMarkerIndex = activeIndexRef.current;
    const scale = getNavigationActiveScale(position, activeMarkerIndex);

    container
      .querySelectorAll<HTMLElement>(
        '[data-portfolio-slide-indicator-visual]'
      )
      .forEach((visual) => {
        const itemIndex = Number(
          visual.dataset.portfolioSlideIndicatorVisual
        );
        gsap.set(visual, {
          scale: itemIndex === activeMarkerIndex ? scale : 1,
          transformOrigin: '50% 50%',
        });
      });

    const ringVisual = ring.querySelector('svg');

    if (ringVisual) {
      gsap.set(ringVisual, {
        scale,
        transformOrigin: '50% 50%',
      });
    }
  };

  const applyActiveScaleFromRing = () => {
    const ring = ringRef.current;

    if (!ring) {
      return;
    }

    const rootFontSize = rootFontSizeRef.current;
    const step = NAVIGATION_INDICATOR_STEP_REM * rootFontSize;
    const ringSize = NAVIGATION_RING_SIZE_REM * rootFontSize;
    const ringX = Number(gsap.getProperty(ring, 'x')) || 0;
    const position = (ringX + ringSize / 2) / step - 0.5;

    applyActiveScale(position);
  };

  const animateRingStroke = (strokeWidth: 2 | 4) => {
    if (ringStrokeWidthRef.current === strokeWidth) {
      return;
    }

    const circle = ringRef.current?.querySelector('circle');
    ringStrokeWidthRef.current = strokeWidth;

    if (!circle) {
      return;
    }

    gsap.to(circle, {
      strokeWidth,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : 0.2,
      ease: 'power2.out',
      autoRound: false,
      overwrite: 'auto',
    });
  };

  const moveRingToIndex = (
    index: number,
    duration = 0.3,
    onComplete?: () => void
  ) => {
    const ring = ringRef.current;

    if (!ring) {
      onComplete?.();
      return;
    }

    ringTweenRef.current?.kill();
    const tween = gsap.to(ring, {
      x: `${getHorizontalIndicatorRingX(index)}rem`,
      yPercent: -50,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : duration,
      ease: 'power3.out',
      overwrite: 'auto',
      onUpdate: applyActiveScaleFromRing,
      onComplete,
    });
    ringTweenRef.current = tween;
  };

  const trackPointer = (clientX: number, animatePosition = false) => {
    const container = containerRef.current;
    const ring = ringRef.current;

    if (!container || !ring || clickTargetIndexRef.current !== null) {
      return;
    }

    clearPreviewReturnTimeout();
    pointerXRef.current = clientX;
    animateRingStroke(2);

    const containerRect = container.getBoundingClientRect();
    const rootFontSize = rootFontSizeRef.current;
    const step = NAVIGATION_INDICATOR_STEP_REM * rootFontSize;
    const ringSize = NAVIGATION_RING_SIZE_REM * rootFontSize;
    const localPointerX = clientX - containerRect.left;
    const closestIndex = Math.max(
      0,
      Math.min(targetCount - 1, Math.round(localPointerX / step - 0.5))
    );
    const closestCenter = step / 2 + closestIndex * step;
    const snapIndex =
      Math.abs(localPointerX - closestCenter) <= SECTION_NAV_SNAP_DISTANCE_PX
        ? closestIndex
        : null;
    const snapChanged = snappedIndexRef.current !== snapIndex;
    const targetCenter = snapIndex === null ? localPointerX : closestCenter;
    const targetX = targetCenter - ringSize / 2;

    if (snapChanged) {
      snappedIndexRef.current = snapIndex;
      snapTransitioningRef.current = true;
    }

    const shouldAnimatePosition =
      animatePosition ||
      snapChanged ||
      (snapTransitioningRef.current && snapIndex === null);
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (shouldAnimatePosition && !reducedMotion) {
      ringTweenRef.current?.kill();
      const tween = gsap.to(ring, {
        x: targetX,
        yPercent: -50,
        duration: animatePosition ? 0.3 : 0.2,
        ease: 'power3.out',
        overwrite: 'auto',
        onUpdate: applyActiveScaleFromRing,
        onComplete: () => {
          if (ringTweenRef.current === tween) {
            ringTweenRef.current = null;
          }
          pointerAcquiringRef.current = false;
          if (snappedIndexRef.current === snapIndex) {
            snapTransitioningRef.current = false;
          }
        },
      });
      ringTweenRef.current = tween;
      return;
    }

    if (snapIndex === null || snapChanged || reducedMotion) {
      ringTweenRef.current?.kill();
      gsap.set(ring, { x: targetX, yPercent: -50 });
      applyActiveScaleFromRing();
      pointerAcquiringRef.current = false;
      snapTransitioningRef.current = false;
    }
  };

  const schedulePointerTracking = (clientX: number) => {
    pendingPointerXRef.current = clientX;

    if (pointerFrameRef.current !== null) {
      return;
    }

    pointerFrameRef.current = requestAnimationFrame(() => {
      pointerFrameRef.current = null;
      const pendingPointerX = pendingPointerXRef.current;

      if (pendingPointerX !== null && pointerArmedRef.current) {
        trackPointer(pendingPointerX, pointerAcquiringRef.current);
      }
    });
  };

  const engagePointer = (clientX: number) => {
    clearPreviewReturnTimeout();
    rootFontSizeRef.current = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize
    );
    pointerArmedRef.current = true;
    pointerAcquiringRef.current = true;
    trackPointer(clientX, true);
  };

  const returnRingToIdle = (delayed: boolean) => {
    clearPreviewReturnTimeout();
    pointerArmedRef.current = false;
    pointerAcquiringRef.current = false;
    snappedIndexRef.current = null;
    snapTransitioningRef.current = false;
    pointerXRef.current = null;
    pendingPointerXRef.current = null;

    if (clickTargetIndexRef.current !== null || focusedIndexRef.current !== null) {
      return;
    }

    const returnToActive = () => {
      previewReturnTimeoutRef.current = null;
      animateRingStroke(4);
      moveRingToIndex(boundedActiveIndex);
    };

    if (!delayed) {
      returnToActive();
      return;
    }

    previewReturnTimeoutRef.current = setTimeout(
      returnToActive,
      SECTION_NAV_PREVIEW_RETURN_DELAY_MS
    );
  };

  const lockRingToIndex = (index: number) => {
    clearPreviewReturnTimeout();
    snappedIndexRef.current = null;
    snapTransitioningRef.current = false;
    clickTargetIndexRef.current = index;
    animateRingStroke(4);
    moveRingToIndex(index, 0.3, () => {
      if (clickTargetIndexRef.current !== index) {
        return;
      }

      clickTargetIndexRef.current = null;
      const pointerX = pointerXRef.current;

      if (pointerArmedRef.current && pointerX !== null) {
        pointerAcquiringRef.current = true;
        animateRingStroke(2);
        trackPointer(pointerX, true);
        return;
      }

      if (focusedIndexRef.current !== null) {
        animateRingStroke(2);
        moveRingToIndex(focusedIndexRef.current);
      }
    });
  };

  const focusRingAtIndex = (index: number) => {
    focusedIndexRef.current = index;

    if (!pointerArmedRef.current && clickTargetIndexRef.current === null) {
      clearPreviewReturnTimeout();
      animateRingStroke(2);
      moveRingToIndex(index);
    }
  };

  const releaseFocusedRing = (index: number) => {
    if (focusedIndexRef.current !== index) {
      return;
    }

    focusedIndexRef.current = null;

    if (!pointerArmedRef.current) {
      returnRingToIdle(true);
    }
  };

  useEffect(() => {
    pointerArmedRef.current = false;
    pointerXRef.current = null;
    snappedIndexRef.current = null;
    snapTransitioningRef.current = false;
    focusedIndexRef.current = null;

    if (previewReturnTimeoutRef.current) {
      clearTimeout(previewReturnTimeoutRef.current);
      previewReturnTimeoutRef.current = null;
    }
  }, [slidesIdentity]);

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

  useEffect(
    () => () => {
      clearPreviewReturnTimeout();
      ringTweenRef.current?.kill();

      if (pointerFrameRef.current !== null) {
        cancelAnimationFrame(pointerFrameRef.current);
      }
    },
    []
  );

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
  useLayoutEffect(() => {
    const ring = ringRef.current;

    if (!ring) {
      return;
    }

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const targetXRem = getHorizontalIndicatorRingX(boundedActiveIndex);
    const hasPosition = ring.dataset.positioned === 'true';
    const shouldPosition =
      !pointerArmedRef.current &&
      clickTargetIndexRef.current === null &&
      focusedIndexRef.current === null;

    if (!hasPosition) {
      gsap.set(ring, {
        x: `${targetXRem}rem`,
        yPercent: -50,
        color,
        opacity: targetCount > 0 ? 1 : 0,
      });
      applyActiveScale(boundedActiveIndex);
      ring.dataset.positioned = 'true';
      return;
    }

    if (!shouldPosition) {
      gsap.to(ring, {
        color,
        opacity: targetCount > 0 ? 1 : 0,
        duration: reducedMotion ? 0 : 0.3,
        ease: 'power2.out',
        overwrite: 'auto',
      });
      return;
    }

    ringTweenRef.current?.kill();
    const tween = gsap.to(ring, {
      x: `${targetXRem}rem`,
      yPercent: -50,
      color,
      opacity: targetCount > 0 ? 1 : 0,
      duration: reducedMotion ? 0 : 0.5,
      ease: 'power3.out',
      overwrite: 'auto',
      onUpdate: applyActiveScaleFromRing,
    });
    ringTweenRef.current = tween;

    return () => {
      if (ringTweenRef.current === tween) {
        ringTweenRef.current = null;
      }
      tween.kill();
    };
  }, [boundedActiveIndex, color, targetCount]);

  return (
    <div
      ref={containerRef}
      data-portfolio-slide-indicators
      className="pointer-events-auto relative h-[3.25rem] transition-[width] duration-500 ease-out motion-reduce:transition-none"
      style={{
        width: `${Math.max(targetCount, 1) * NAVIGATION_INDICATOR_STEP_REM}rem`,
      }}
      onPointerMove={(event) => {
        if (pointerArmedRef.current) {
          schedulePointerTracking(event.clientX);
        }
      }}
      onPointerLeave={() => returnRingToIdle(true)}
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
            className="absolute left-1/2 top-1/2 grid size-10 place-items-center transition-[opacity,transform] duration-500 [transition-timing-function:cubic-bezier(0.19,1,0.22,1)] motion-reduce:transition-none"
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
                className="pointer-events-auto grid size-10 cursor-pointer place-items-center outline-none"
                aria-label={
                  slide.kind === 'description'
                    ? `Show ${projectTitle} description`
                    : `Show ${slide.screenshot.alt}`
                }
                aria-current={
                  boundedActiveIndex === targetIndex ? 'true' : undefined
                }
                aria-busy={pendingIndex === targetIndex ? true : undefined}
                data-portfolio-slide-indicator-index={targetIndex}
                data-interactive-pop-companion='[data-portfolio-slide-indicator-marker="true"] svg'
                onPointerEnter={(event) => {
                  if (pointerArmedRef.current) {
                    schedulePointerTracking(event.clientX);
                  } else {
                    engagePointer(event.clientX);
                  }
                }}
                onFocus={() => focusRingAtIndex(targetIndex)}
                onBlur={() => releaseFocusedRing(targetIndex)}
                onClick={() => {
                  lockRingToIndex(targetIndex);
                  onSelect(slide);
                }}
              >
                <span
                  data-portfolio-slide-indicator-visual={targetIndex}
                  className="grid size-3 place-items-center"
                  aria-hidden="true"
                >
                  {pendingIndex === targetIndex ? (
                    <FontAwesomeIcon
                      icon={faSpinner}
                      className="size-3 animate-spin text-white"
                    />
                  ) : (
                    <FontAwesomeIcon
                      icon={faCircle}
                      className={NAVIGATION_DOT_CLASS}
                      style={{ width: '0.625rem', height: '0.625rem' }}
                    />
                  )}
                </span>
              </button>
            ) : (
              <FontAwesomeIcon
                icon={faCircle}
                className={NAVIGATION_DOT_CLASS}
                style={{ width: '0.625rem', height: '0.625rem' }}
                aria-hidden="true"
              />
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
  tooltip,
}: {
  color: string;
  elementRef?: (node: HTMLDivElement | null) => void;
  previewElementRef?: (node: HTMLDivElement | null) => void;
  className: string;
  style?: CSSProperties;
  dataAttributes?: Record<`data-${string}`, string>;
  previewDataAttributes?: Record<`data-${string}`, string>;
  tooltip?: {
    id: string;
    side: 'left' | 'right';
    elementRef: (node: HTMLDivElement | null) => void;
    textElementRef: (node: HTMLSpanElement | null) => void;
  };
}) {
  return (
    <div
      ref={elementRef}
      {...dataAttributes}
      className={`pointer-events-none size-12 overflow-visible ${className}`}
      style={{
        color,
        ...style,
      }}
      aria-hidden={tooltip ? undefined : true}
    >
      <div
        ref={previewElementRef}
        {...previewDataAttributes}
        className="relative size-12"
      >
        <svg
          className="absolute inset-0 size-12 overflow-visible"
          viewBox="0 0 48 48"
          aria-hidden="true"
        >
          <circle
            cx="24"
            cy="24"
            r="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}
          />
        </svg>
        {tooltip ? (
          <div
            ref={tooltip.elementRef}
            id={tooltip.id}
            role="tooltip"
            className={`invisible absolute top-1/2 z-30 -translate-y-1/2 whitespace-nowrap px-3 py-2 text-[0.6875rem] font-black uppercase leading-none tracking-[0.24em] opacity-0 ${
              tooltip.side === 'left'
                ? 'left-full ml-3 -translate-x-1'
                : 'right-full mr-3 translate-x-1'
            }`}
            style={{ backgroundColor: 'currentColor' }}
          >
            <span ref={tooltip.textElementRef} className="text-black" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SideNavButton({
  icon,
  elementRef,
  iconRef,
  dotRef,
  visualRef,
  label,
  tooltipTitle,
  tooltipId,
  side,
  color,
  activeButton = false,
  pending = false,
  concealed = false,
  onPreviewChange,
  onPointerEngage,
  onClick,
}: {
  icon: IconProp;
  elementRef: (node: HTMLDivElement | null) => void;
  iconRef?: (node: SVGSVGElement | null) => void;
  dotRef: (node: SVGSVGElement | null) => void;
  visualRef: (node: HTMLSpanElement | null) => void;
  label: string;
  tooltipTitle: string;
  tooltipId: string;
  side: 'left' | 'right';
  color?: string;
  activeButton?: boolean;
  pending?: boolean;
  concealed?: boolean;
  onPreviewChange: (previewed: boolean) => void;
  onPointerEngage: (pointerY: number) => void;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);
  const projectColor = color ?? PROJECT_COLORS[0];
  const gutterHitAreaClass =
    side === 'left'
      ? "before:absolute before:inset-y-0 before:right-0 before:w-[3.75rem] before:content-[''] sm:before:w-[4.5rem]"
      : "before:absolute before:inset-y-0 before:left-0 before:w-[3.75rem] before:content-[''] sm:before:w-[4.5rem]";
  return (
    <div
      ref={elementRef}
      data-portfolio-section-nav-tooltip-title={tooltipTitle}
      className={`relative z-10 grid h-[3.75rem] w-12 place-items-center transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
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
        iconClassName={`size-7 ${pending ? 'animate-spin' : ''}`}
        visualRef={visualRef}
        secondaryVisual={
          <FontAwesomeIcon
            ref={dotRef}
            icon={faCircle}
            className="absolute size-2.5 text-current opacity-0 drop-shadow-[1px_1px_0_black]"
            style={{ width: '0.625rem', height: '0.625rem' }}
            aria-hidden="true"
          />
        }
        className={`relative h-full w-12 cursor-pointer border-0 bg-transparent p-0 text-[var(--project-color)] ${gutterHitAreaClass}`}
        aria-label={label}
        aria-describedby={tooltipId}
        aria-current={activeButton ? 'page' : undefined}
        aria-busy={pending ? true : undefined}
        data-interactive-pop-companion={`[data-portfolio-section-nav-preview="${side}"] svg`}
        tabIndex={concealed ? -1 : undefined}
        onClick={onClick}
      />
    </div>
  );
}

function CircularIconButton({
  icon,
  buttonRef,
  iconRef,
  iconClassName,
  visualRef,
  secondaryVisual,
  ring = false,
  className,
  ...buttonProps
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: IconProp;
  buttonRef?: (node: HTMLButtonElement | null) => void;
  iconRef?: (node: SVGSVGElement | null) => void;
  iconClassName: string;
  visualRef?: (node: HTMLSpanElement | null) => void;
  secondaryVisual?: ReactNode;
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
      {visualRef || secondaryVisual ? (
        <span
          ref={visualRef}
          className="relative z-10 grid size-7 place-items-center"
        >
          <FontAwesomeIcon
            ref={iconRef}
            icon={icon}
            className={`absolute ${iconClassName} drop-shadow-[1px_1px_0_black]`}
            aria-hidden="true"
          />
          {secondaryVisual}
        </span>
      ) : (
        <FontAwesomeIcon
          ref={iconRef}
          icon={icon}
          className={`relative z-10 ${iconClassName} drop-shadow-[1px_1px_0_black]`}
          aria-hidden="true"
        />
      )}
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
        className={`portfolio-themed-scrollbar min-h-0 min-w-0 overflow-x-hidden overflow-y-scroll pr-10 ${
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
  concealedScreenshotId,
  registerMediaElement,
  setDescriptionRef,
  onScreenshotClick,
}: {
  project: PortfolioProject;
  projectNumber: string;
  projectColor: string;
  slide: ProjectSlide;
  isWideLayout: boolean;
  isActive: boolean;
  concealedScreenshotId?: string;
  registerMediaElement: (
    key: string,
    element: PortfolioMediaElement | null
  ) => void;
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
              concealedScreenshotId === slide.screenshot.id ? 'invisible' : ''
            } ${
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
              mediaKey={carouselMediaKey(slide.screenshot)}
              registerMediaElement={registerMediaElement}
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
          className="portfolio-themed-scrollbar min-h-0 min-w-0 w-full max-w-[calc(108ch+9rem)] overflow-x-hidden overflow-y-scroll pr-10"
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
          className="portfolio-themed-scrollbar min-h-0 min-w-0 w-full max-w-[calc(48ch+2rem)] overflow-x-hidden overflow-y-scroll pr-10"
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
  mediaKey,
  registerMediaElement,
  priority,
  sizes,
  className,
}: {
  screenshot: PortfolioScreenshot;
  mediaKey: string;
  registerMediaElement: (
    key: string,
    element: PortfolioMediaElement | null
  ) => void;
  priority?: boolean;
  sizes: string;
  className: string;
}) {
  const setMediaRef = (element: PortfolioMediaElement | null) => {
    registerMediaElement(mediaKey, element);

    if (mediaKey.startsWith('carousel:')) {
      registerMediaElement(modalMediaKey(screenshot), element);
    }
  };

  if (isVideoScreenshot(screenshot)) {
    return (
      <video
        ref={setMediaRef}
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
      ref={setMediaRef}
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
  registerMediaElement,
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
  registerMediaElement: (
    key: string,
    element: PortfolioMediaElement | null
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
  const [isZoomed, setIsZoomed] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(Boolean(transitionRect));
  const renderedCarouselIndex = getCanonicalRenderedCarouselIndex(
    boundedActiveScreenshotIndex,
    carouselCount
  );
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
    [applyLiveTransform, updateZoomedState]
  );
  const setLiveScale = useCallback(
    (nextScale: number) => {
      liveScaleRef.current = clampScale(nextScale);
      updateZoomedState(liveScaleRef.current > 1);
      scheduleLiveTransform();
    },
    [clampScale, scheduleLiveTransform, updateZoomedState]
  );

  useLayoutEffect(() => {
    resetLiveView(!isTransitioning);
  }, [isTransitioning, resetLiveView, screenshot.id]);

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
          carouselCount
        )
      : false;

    previousCarouselStateRef.current = {
      activeIndex: boundedActiveScreenshotIndex,
      itemCount: carouselCount,
    };
    carouselTweenRef.current?.kill();
    const targetX =
      -renderedCarouselIndex *
      (window.innerWidth + MODAL_CAROUSEL_GAP_PX);

    if (isFirstPosition || didCarouselChange) {
      gsap.set(carouselTrack, { x: targetX, xPercent: 0 });
      return;
    }

    gsap.set(carouselTrack, { willChange: 'transform' });
    const tween = gsap.to(carouselTrack, {
      x: targetX,
      xPercent: 0,
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

  useEffect(() => {
    const syncCarouselWidth = () => {
      const carouselTrack = carouselTrackRef.current;

      if (!carouselTrack) {
        return;
      }

      carouselTweenRef.current?.kill();
      gsap.set(carouselTrack, {
        x:
          -renderedCarouselIndex *
          (window.innerWidth + MODAL_CAROUSEL_GAP_PX),
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
      resetLiveView();
      setIsDragging(false);
    },
    [
      dragRef,
      isClosing,
      isTransitioning,
      pinchRef,
      resetLiveView,
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
        setIsDragging(false);
      }
    },
    [dragRef]
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
    isZoomed && !isTransitioning && !isClosing
      ? isDragging
        ? 'cursor-grabbing'
        : 'cursor-grab'
      : '';
  const showTransitionMedia = isTransitioning || isClosing;
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
        className={`fixed left-0 top-0 z-10 h-dvh w-screen origin-center ${panCursorClass}`}
      >
        <div
          className={`absolute inset-0 overflow-hidden ${
            showTransitionMedia ? 'invisible' : 'visible'
          }`}
          aria-hidden={showTransitionMedia}
        >
          <div
            ref={carouselTrackRef}
            data-portfolio-modal-carousel-track
            className="flex h-full w-screen"
            style={{ gap: `${MODAL_CAROUSEL_GAP_PX}px` }}
          >
            {renderedCarouselScreenshots.map(
              ({ item: carouselScreenshot, key, realIndex }) => (
                <div
                  key={key}
                  className="relative h-full w-screen shrink-0"
                >
                  <ScreenshotMedia
                    screenshot={carouselScreenshot}
                    mediaKey={modalMediaKey(carouselScreenshot)}
                    registerMediaElement={registerMediaElement}
                    priority={carouselScreenshot.id === screenshot.id}
                    sizes="100vw"
                    className={getCarouselMediaClass(
                      realIndex === boundedActiveScreenshotIndex
                    )}
                  />
                </div>
              )
            )}
          </div>
        </div>
        <div
          className={`absolute inset-0 overflow-hidden ${
            showTransitionMedia ? 'visible' : 'invisible'
          }`}
          aria-hidden={!showTransitionMedia}
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
  );
}
