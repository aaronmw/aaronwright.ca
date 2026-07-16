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
  faArrowLeft,
  faArrowRight,
  faArrowUp,
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
import {
  INLINE_MEDIA_RESET_EVENT,
  INLINE_MEDIA_ZOOM_IN_EVENT,
  useInlineMediaZoom,
} from '@/components/portfolio/useInlineMediaZoom';
import {
  SlideIndicatorMotionController,
  SlideNavigation,
} from '@/components/portfolio/navigation/SlideNavigation';
import {
  SectionNavigation,
  SectionNavigationHandle,
} from '@/components/portfolio/navigation/SectionNavigation';
import { OverscrollIndicator } from '@/components/OverscrollIndicator';
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
const TOUCH_INPUT_MEDIA_QUERY = '(hover: none) and (pointer: coarse)';
type WideLayoutStyle = CSSProperties & {
  '--portfolio-description-rail-width': string;
  '--portfolio-control-gutter-width': string;
  '--portfolio-screenshot-size': string;
};
type ProjectColorStyle = CSSProperties & {
  '--project-color': string;
};
type InlineMediaSurfaceStyle = CSSProperties & {
  '--portfolio-media-padding': string;
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
type PortfolioHelperMessageKind = 'navigation' | 'close' | null;
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
const NAVIGATION_INDICATOR_STEP_REM = 2.25;
const NAVIGATION_RING_SIZE_REM = 2.75;
const MOBILE_SLIDE_NAV_CONTROL_CLEARANCE_REM = 6.25;
const NAVIGATION_TRAVEL_BASE_SECONDS = 0.48;
const NAVIGATION_TRAVEL_SECONDS_PER_SCREEN = 0.08;
const NAVIGATION_TRAVEL_MAX_SECONDS = 0.85;
const NAVIGATION_TRAVEL_EASE = 'power2.inOut';
const NAVIGATION_ACTIVE_SCALE = 1.1;
const CAROUSEL_MEDIA_CLASS =
  'object-contain transition-[filter,padding] [transition-duration:1000ms,500ms] [transition-timing-function:ease-in-out,var(--ease-out)] motion-reduce:transition-none';
const TOP_SCREEN_COLOR = 'hsl(0 0% 100%)';
const PROJECT_COLOR_START_HUE = 342;
const PROJECT_COLOR_SATURATION = 78;
const PROJECT_COLOR_LIGHTNESS = 54;
const PROJECT_COLOR_MIN_CONTRAST = 4.5;
const PROJECT_COLORS = buildProjectColors(portfolioSlides.length);
const SECTION_NAV_HAS_SLIDES = [
  false,
  ...portfolioSlides.map((project) => project.screenshots.length > 1),
];
const CAROUSEL_MEDIA_BLUR_PX = 20;
const MODAL_CAROUSEL_GAP_PX = CAROUSEL_MEDIA_BLUR_PX * 2;
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
  const evenlySpacedColors = Array.from(
    { length: safeProjectCount },
    (_, index) => ({
      hue: Math.round((PROJECT_COLOR_START_HUE + hueStep * index) % 360),
      saturation: PROJECT_COLOR_SATURATION,
      lightness: PROJECT_COLOR_LIGHTNESS,
    }),
  );

  return evenlySpacedColors.map(({ hue, saturation, lightness }) => {
    const correctedLightness = ensureContrastAgainstBlack(
      hue,
      saturation,
      lightness,
      PROJECT_COLOR_MIN_CONTRAST,
    );

    return `hsl(${hue} ${saturation}% ${correctedLightness}%)`;
  });
}

function ensureContrastAgainstBlack(
  hue: number,
  saturation: number,
  lightness: number,
  minimumContrast: number,
) {
  const getContrast = (candidateLightness: number) => {
    const [red, green, blue] = gsap.utils.splitColor(
      `hsl(${hue} ${saturation}% ${candidateLightness}%)`,
    );
    const toLinearChannel = (channel: number) => {
      const value = channel / 255;

      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    };
    const relativeLuminance =
      0.2126 * toLinearChannel(red) +
      0.7152 * toLinearChannel(green) +
      0.0722 * toLinearChannel(blue);

    return (relativeLuminance + 0.05) / 0.05;
  };

  if (getContrast(lightness) >= minimumContrast) {
    return lightness;
  }

  let failingLightness = lightness;
  let passingLightness = 100;

  for (let iteration = 0; iteration < 20; iteration += 1) {
    const candidateLightness = (failingLightness + passingLightness) / 2;

    if (getContrast(candidateLightness) >= minimumContrast) {
      passingLightness = candidateLightness;
    } else {
      failingLightness = candidateLightness;
    }
  }

  return Math.ceil(passingLightness * 100) / 100;
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

function getTouchInputSnapshot() {
  return window.matchMedia(TOUCH_INPUT_MEDIA_QUERY).matches;
}

function getTouchInputServerSnapshot() {
  return false;
}

function subscribeToTouchInput(callback: () => void) {
  const mediaQuery = window.matchMedia(TOUCH_INPUT_MEDIA_QUERY);
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
  kind: 'canonical' | 'clone-before' | 'clone-after';
};

type HorizontalScrollOptions = {
  syncIndicator?: boolean;
  boundarySourceIndex?: number;
};

function getNavigationTravelDuration(distanceInScreens: number) {
  return Math.min(
    NAVIGATION_TRAVEL_MAX_SECONDS,
    NAVIGATION_TRAVEL_BASE_SECONDS +
      Math.abs(distanceInScreens) * NAVIGATION_TRAVEL_SECONDS_PER_SCREEN,
  );
}

function getCanonicalCarouselEntries<T extends { id: string }>(items: T[]) {
  return items.map((item, realIndex) => ({
    item,
    key: `real:${item.id}`,
    realIndex,
    kind: 'canonical' as const,
  }));
}

function getLoopingCarouselEntries<T extends { id: string }>(
  items: T[],
  cloneSingleton = false,
): LoopingCarouselEntry<T>[] {
  if (items.length === 0) {
    return [];
  }

  const entries = getCanonicalCarouselEntries(items);

  if (items.length === 1 && !cloneSingleton) {
    return entries;
  }

  const lastIndex = items.length - 1;

  return [
    {
      item: items[lastIndex],
      key: `clone-before:${items[lastIndex].id}`,
      realIndex: lastIndex,
      kind: 'clone-before',
    },
    ...entries,
    {
      item: items[0],
      key: `clone-after:${items[0].id}`,
      realIndex: 0,
      kind: 'clone-after',
    },
  ];
}

function getCarouselPosition(carousel: HTMLDivElement) {
  const firstCanonicalPanel = carousel.querySelector<HTMLElement>(
    '[data-portfolio-carousel-panel="canonical"][data-portfolio-carousel-index="0"]',
  );

  return (
    (carousel.scrollLeft - (firstCanonicalPanel?.offsetLeft ?? 0)) /
    Math.max(carousel.clientWidth, 1)
  );
}

function getCarouselTargetScrollLeft(
  carousel: HTMLDivElement,
  carouselIndex: number,
) {
  const targetPanel = carousel.querySelector<HTMLElement>(
    `[data-portfolio-carousel-panel="canonical"][data-portfolio-carousel-index="${carouselIndex}"]`,
  );

  return targetPanel?.offsetLeft ?? carousel.clientWidth * carouselIndex;
}

function getCanonicalRenderedCarouselIndex(
  realIndex: number,
  itemCount: number,
) {
  return itemCount > 1 ? realIndex + 1 : realIndex;
}

function isCarouselBoundaryJump(
  previousIndex: number,
  nextIndex: number,
  itemCount: number,
) {
  return (
    itemCount > 1 &&
    ((previousIndex === itemCount - 1 && nextIndex === 0) ||
      (previousIndex === 0 && nextIndex === itemCount - 1))
  );
}

function getCarouselMediaClass(shouldBlur: boolean) {
  return `${CAROUSEL_MEDIA_CLASS} ${shouldBlur ? 'blur-[20px]' : 'blur-0'}`;
}

function getTouchDistance(event: ReactTouchEvent<HTMLDialogElement>) {
  const [first, second] = Array.from(event.touches);

  return Math.hypot(
    first.clientX - second.clientX,
    first.clientY - second.clientY,
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
  direction: -1 | 1,
) {
  const screenCount = portfolioSlides.length + 1;
  const currentScreenIndex = currentProjectIndex + 1;
  const nextScreenIndex = positiveModulo(
    currentScreenIndex + direction,
    screenCount,
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
      .join('-'),
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
  const projectPrefixPattern = new RegExp(
    `^${escapeRegExp(project.title)}\\s*`,
    'i',
  );
  const slideLabel =
    rawSlideLabel.replace(projectPrefixPattern, '').trim() ||
    slide.screenshot.slug;

  return `${positionLabel} • ${project.title} • ${titleCaseLabel(slideLabel)}`;
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

function isTextEntryTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [role="textbox"]',
    ),
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
  screenshotId: string,
): ModalTransitionRect | null {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>('[data-portfolio-screenshot-id]'),
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

function resetInlineMediaZoom() {
  document
    .querySelectorAll<HTMLElement>('[data-portfolio-inline-zoomed="true"]')
    .forEach((surface) => {
      surface.dispatchEvent(new Event(INLINE_MEDIA_RESET_EVENT));
    });
}

function zoomVisibleInlineMediaIn() {
  const surfaces = Array.from(
    document.querySelectorAll<HTMLElement>('[data-portfolio-inline-zoomed]'),
  );
  let visibleSurface: HTMLElement | null = null;
  let largestVisibleArea = 0;

  for (const surface of surfaces) {
    if (surface.closest('article')?.getAttribute('aria-hidden') === 'true') {
      continue;
    }

    const rect = surface.getBoundingClientRect();
    const visibleWidth =
      Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
    const visibleHeight =
      Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
    const visibleArea = Math.max(0, visibleWidth) * Math.max(0, visibleHeight);

    if (visibleArea > largestVisibleArea) {
      largestVisibleArea = visibleArea;
      visibleSurface = surface;
    }
  }

  if (!visibleSurface) {
    return false;
  }

  visibleSurface.dispatchEvent(new Event(INLINE_MEDIA_ZOOM_IN_EVENT));
  return true;
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
    {
      id: `${project.id}-description`,
      kind: 'description',
      slug: 'description',
    },
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
  screenshot: PortfolioScreenshot,
) {
  return (
    project.id === 'building-with-ai' &&
    screenshot.id === 'building-with-ai-home-page'
  );
}

function isBuildingWithAiTextSlide(
  project: PortfolioProject,
  slide: ProjectSlide,
) {
  return (
    slide.kind === 'screenshot' &&
    isBuildingWithAiTextScreenshot(project, slide.screenshot)
  );
}

function isModalScreenshotSlide(
  project: PortfolioProject,
  slide: ProjectSlide,
): slide is Extract<ProjectSlide, { kind: 'screenshot' }> {
  return (
    slide.kind === 'screenshot' && !isBuildingWithAiTextSlide(project, slide)
  );
}

function hasBuildingWithAiTextSlide(project: PortfolioProject) {
  return project.screenshots.some((screenshot) =>
    isBuildingWithAiTextScreenshot(project, screenshot),
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
    (screenshot) => !isBuildingWithAiTextScreenshot(project, screenshot),
  );
}

function getSlideMediaKey(
  project: PortfolioProject,
  slide: ProjectSlide,
  useDesktopVisual: boolean,
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
  const verticalScrollTweenRef = useRef<gsap.core.Tween | null>(null);
  const slideIndicatorMotionControllerRef =
    useRef<SlideIndicatorMotionController | null>(null);
  const sectionNavigationControllerRef = useRef<SectionNavigationHandle | null>(
    null,
  );
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
  const inlineZoomHandoffScreenshotIdRef = useRef<string | null>(null);
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
  const sectionMenuTitleRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [sectionNavHovered, setSectionNavHovered] = useState(false);
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
  const settleSectionNavClickTargets = useCallback(
    (axis: 'horizontal' | 'vertical') => {
      sectionNavigationControllerRef.current?.settle(axis);
    },
    [],
  );
  const settleVerticalSectionNavClickTargets = useCallback(() => {
    sectionNavigationControllerRef.current?.settle('vertical');
  }, []);
  const cancelScrollLinkedSectionNavigation = useCallback(() => {
    sectionNavigationControllerRef.current?.cancel();
  }, []);

  const projectSlides = useMemo(
    () =>
      Object.fromEntries(
        portfolioSlides.map((project) => [
          project.slug,
          getProjectSlides(project),
        ]),
      ) as Record<string, ProjectSlide[]>,
    [],
  );

  const initialProjectIndex = initialProjectSlug
    ? portfolioSlides.findIndex(
        (project) => project.slug === initialProjectSlug,
      )
    : START_SCREEN_INDEX;
  const normalizedInitialProjectIndex =
    initialProjectIndex >= 0 ? initialProjectIndex : START_SCREEN_INDEX;
  const initialSlideIndexes = useMemo(
    () =>
      portfolioSlides.map((project) => {
        if (project.slug !== initialProjectSlug || !initialScreenshotSlug) {
          return 0;
        }

        const screenshotIndex = project.screenshots.findIndex(
          (screenshot) => screenshot.slug === initialScreenshotSlug,
        );

        return screenshotIndex >= 0 ? screenshotIndex + 1 : 0;
      }),
    [initialProjectSlug, initialScreenshotSlug],
  );
  const projectMediaKeys = useMemo(
    () =>
      portfolioSlides.map((project) =>
        getProjectMediaScreenshots(project).map((screenshot) =>
          carouselMediaKey(screenshot),
        ),
      ),
    [],
  );
  const sectionEntryMediaKeys = useMemo(
    () => projectMediaKeys.flatMap((keys) => (keys[0] ? [keys[0]] : [])),
    [projectMediaKeys],
  );
  const initialTargetScreenshot = useMemo(() => {
    if (normalizedInitialProjectIndex < 0) {
      return undefined;
    }

    const project = portfolioSlides[normalizedInitialProjectIndex];
    const initialSlide =
      projectSlides[project.slug][
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
  }, [
    initialTargetScreenshot,
    normalizedInitialProjectIndex,
    projectMediaKeys,
  ]);
  const backgroundMediaQueue = useMemo(() => {
    const activeProjectMedia =
      normalizedInitialProjectIndex >= 0
        ? getProjectMediaScreenshots(
            portfolioSlides[normalizedInitialProjectIndex],
          )
        : [];
    const activeScreenshotIndex = initialTargetScreenshot
      ? activeProjectMedia.findIndex(
          (screenshot) => screenshot.id === initialTargetScreenshot.id,
        )
      : 0;
    const adjacentKeys = [-1, 1]
      .map((offset) => activeProjectMedia[activeScreenshotIndex + offset])
      .filter((screenshot): screenshot is PortfolioScreenshot =>
        Boolean(screenshot),
      )
      .map(carouselMediaKey);

    return Array.from(
      new Set([
        ...adjacentKeys,
        ...sectionEntryMediaKeys,
        ...projectMediaKeys.flat(),
      ]),
    );
  }, [
    initialTargetScreenshot,
    normalizedInitialProjectIndex,
    projectMediaKeys,
    sectionEntryMediaKeys,
  ]);
  const sectionEntryMediaReady = sectionEntryMediaKeys.every(isMediaReady);
  const projectCarouselsReady = projectMediaKeys.map((keys) =>
    keys.every(isMediaReady),
  );

  const [activeProjectIndex, setActiveProjectIndex] = useState(
    normalizedInitialProjectIndex,
  );
  const [activeSlideIndexes, setActiveSlideIndexes] =
    useState(initialSlideIndexes);

  const isWideLayout = useSyncExternalStore(
    subscribeToWideLayout,
    getWideLayoutSnapshot,
    getWideLayoutServerSnapshot,
  );
  const isTouchInput = useSyncExternalStore(
    subscribeToTouchInput,
    getTouchInputSnapshot,
    getTouchInputServerSnapshot,
  );
  const isTouchLandscapeLayout = isWideLayout && isTouchInput;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [inlineZoomedScreenshotId, setInlineZoomedScreenshotId] = useState<
    string | null
  >(null);
  const [modalTransitionRect, setModalTransitionRect] =
    useState<ModalTransitionRect | null>(null);
  const [boundaryBlurProjectSlugs, setBoundaryBlurProjectSlugs] = useState<
    ReadonlySet<string>
  >(() => new Set());

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
  const isInlineZoomPresentationActive =
    isWideLayout && !isTouchInput && inlineZoomedScreenshotId !== null;
  const shouldCenterSlideNavigation =
    isModalPresentationActive || isInlineZoomPresentationActive;
  const activeProjectColor =
    activeProjectIndex >= 0 ? getProjectColor(activeProjectIndex) : undefined;

  const handleInlinePresentationChange = (
    screenshotId: string,
    presented: boolean,
  ) => {
    setInlineZoomedScreenshotId((currentId) =>
      presented
        ? screenshotId
        : inlineZoomHandoffScreenshotIdRef.current
          ? currentId
          : currentId === screenshotId
            ? null
            : currentId,
    );
  };

  const exitInlineZoomPresentation = () => {
    inlineZoomHandoffScreenshotIdRef.current = null;
    resetInlineMediaZoom();
  };

  useLayoutEffect(() => {
    const handoffScreenshotId = inlineZoomHandoffScreenshotIdRef.current;

    if (!handoffScreenshotId || activeScreenshot?.id !== handoffScreenshotId) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      if (zoomVisibleInlineMediaIn()) {
        inlineZoomHandoffScreenshotIdRef.current = null;
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [activeScreenshot]);

  useEffect(() => {
    inlineZoomHandoffScreenshotIdRef.current = null;
  }, [activeProjectIndex]);

  const focusKeyboardSurface = useCallback(() => {
    keyboardSurfaceRef.current?.focus({ preventScroll: true });
  }, []);
  const restoreVerticalScrollSnap = useCallback(() => {
    verticalRef.current?.style.removeProperty('scroll-snap-type');
  }, []);
  const cancelVerticalScrollTween = useCallback(() => {
    verticalScrollTweenRef.current?.kill();
    verticalScrollTweenRef.current = null;
    restoreVerticalScrollSnap();
  }, [restoreVerticalScrollSnap]);
  const cancelVerticalUserTravel = useCallback(() => {
    cancelVerticalScrollTween();
    cancelScrollLinkedSectionNavigation();
  }, [cancelScrollLinkedSectionNavigation, cancelVerticalScrollTween]);

  const resetDescriptionScroll = useCallback((project: PortfolioProject) => {
    descriptionRefs.current[project.slug]?.scrollTo({ top: 0 });
  }, []);
  const setProjectBoundaryBlur = useCallback(
    (projectSlug: string, shouldBlur: boolean) => {
      setBoundaryBlurProjectSlugs((currentSlugs) => {
        if (currentSlugs.has(projectSlug) === shouldBlur) {
          return currentSlugs;
        }

        const nextSlugs = new Set(currentSlugs);

        if (shouldBlur) {
          nextSlugs.add(projectSlug);
        } else {
          nextSlugs.delete(projectSlug);
        }

        return nextSlugs;
      });
    },
    [],
  );

  const setHorizontalRef = useCallback(
    (slideSlug: string) => (node: HTMLDivElement | null) => {
      horizontalRefs.current[slideSlug] = node;
    },
    [],
  );

  const setDescriptionRef = useCallback(
    (slideSlug: string) => (node: HTMLDivElement | null) => {
      descriptionRefs.current[slideSlug] = node;
    },
    [],
  );

  const getCarouselSlides = useCallback(
    (project: PortfolioProject) => {
      const slides = projectSlides[project.slug];

      if (!isWideLayout) {
        return slides;
      }

      const screenshotSlides = slides.filter(
        (slide) => slide.kind === 'screenshot',
      );

      return screenshotSlides.length > 0 ? screenshotSlides : slides;
    },
    [isWideLayout, projectSlides],
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
          (carouselSlide) => carouselSlide.id === slide.id,
        ),
      );
    },
    [getCarouselSlides, isWideLayout, projectSlides],
  );

  const getSlideIndexFromCarouselIndex = useCallback(
    (project: PortfolioProject, carouselIndex: number) => {
      const carouselSlides = getCarouselSlides(project);
      const carouselSlide =
        carouselSlides[positiveModulo(carouselIndex, carouselSlides.length)];

      return Math.max(
        0,
        projectSlides[project.slug].findIndex(
          (slide) => slide.id === carouselSlide.id,
        ),
      );
    },
    [getCarouselSlides, projectSlides],
  );

  const scrollHorizontalToRealIndex = useCallback(
    (
      project: PortfolioProject,
      slideIndex: number,
      behavior: ScrollBehavior,
      onComplete?: () => void,
      options: HorizontalScrollOptions = {},
    ) => {
      const { syncIndicator = false, boundarySourceIndex } = options;
      const carousel = horizontalRefs.current[project.slug];

      if (!carousel) {
        onComplete?.();
        return;
      }

      const slides = getCarouselSlides(project);
      const nextCarouselIndex = getCarouselIndexFromSlideIndex(
        project,
        slideIndex,
      );
      const targetScrollLeft = getCarouselTargetScrollLeft(
        carousel,
        nextCarouselIndex,
      );
      const initialScrollLeft = carousel.scrollLeft;
      const currentTween = horizontalScrollTweenRefs.current[project.slug];
      const currentCarouselIndex = Math.max(
        0,
        Math.min(slides.length - 1, Math.round(getCarouselPosition(carousel))),
      );
      const isBoundaryTravel =
        boundarySourceIndex !== undefined &&
        boundarySourceIndex !== nextCarouselIndex;
      const shouldBlurBoundary =
        slides.length > 2 &&
        (isBoundaryTravel ||
          isCarouselBoundaryJump(
            currentCarouselIndex,
            nextCarouselIndex,
            slides.length,
          ));

      if (
        behavior !== 'smooth' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        currentTween?.kill();
        horizontalScrollTweenRefs.current[project.slug] = null;
        setProjectBoundaryBlur(project.slug, false);
        carousel.style.removeProperty('scroll-snap-type');
        carousel.scrollTo({ left: targetScrollLeft, behavior: 'auto' });
        if (syncIndicator) {
          slideIndicatorMotionControllerRef.current?.update(nextCarouselIndex);
          slideIndicatorMotionControllerRef.current?.complete(
            nextCarouselIndex,
          );
        }
        onComplete?.();
        return;
      }

      carousel.style.scrollSnapType = 'none';
      const distanceInSlides =
        Math.abs(targetScrollLeft - carousel.scrollLeft) /
        Math.max(carousel.clientWidth, 1);
      const tween = gsap.to(carousel, {
        scrollLeft: targetScrollLeft,
        duration: getNavigationTravelDuration(distanceInSlides),
        ease: NAVIGATION_TRAVEL_EASE,
        overwrite: 'auto',
        onUpdate: () => {
          if (!syncIndicator) {
            return;
          }

          if (boundarySourceIndex === undefined) {
            slideIndicatorMotionControllerRef.current?.update(
              getCarouselPosition(carousel),
            );
            return;
          }

          const scrollDistance = targetScrollLeft - initialScrollLeft;
          const progress =
            Math.abs(scrollDistance) < 0.5
              ? 1
              : gsap.utils.clamp(
                  0,
                  1,
                  (carousel.scrollLeft - initialScrollLeft) / scrollDistance,
                );
          slideIndicatorMotionControllerRef.current?.update(
            gsap.utils.interpolate(
              boundarySourceIndex,
              nextCarouselIndex,
              progress,
            ),
          );
        },
        onComplete: () => {
          if (horizontalScrollTweenRefs.current[project.slug] === tween) {
            horizontalScrollTweenRefs.current[project.slug] = null;
            carousel.style.removeProperty('scroll-snap-type');
            carousel.scrollTo({ left: targetScrollLeft, behavior: 'auto' });
            setProjectBoundaryBlur(project.slug, false);
            if (syncIndicator) {
              slideIndicatorMotionControllerRef.current?.update(
                nextCarouselIndex,
              );
              slideIndicatorMotionControllerRef.current?.complete(
                nextCarouselIndex,
              );
            }
            onComplete?.();
          }
        },
        onInterrupt: () => {
          if (horizontalScrollTweenRefs.current[project.slug] === tween) {
            horizontalScrollTweenRefs.current[project.slug] = null;
            setProjectBoundaryBlur(project.slug, false);
          }
        },
      });

      horizontalScrollTweenRefs.current[project.slug] = tween;
      setProjectBoundaryBlur(project.slug, shouldBlurBoundary);
    },
    [getCarouselIndexFromSlideIndex, getCarouselSlides, setProjectBoundaryBlur],
  );

  const syncHorizontalViewports = useCallback(
    (slideIndexes: number[], behavior: ScrollBehavior) => {
      portfolioSlides.forEach((project, currentProjectIndex) => {
        scrollHorizontalToRealIndex(
          project,
          slideIndexes[currentProjectIndex] ?? 0,
          behavior,
        );
      });
    },
    [scrollHorizontalToRealIndex],
  );
  const syncViewport = useCallback(
    (
      projectIndex: number,
      slideIndexes: number[],
      behavior: ScrollBehavior,
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
    [syncHorizontalViewports],
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
      (project) => project.slug === segments[1],
    );

    if (projectIndex < 0) {
      return null;
    }

    const project = portfolioSlides[projectIndex];
    const slides = projectSlides[project.slug];
    const screenshotSlug = segments[2];
    const slideIndex = screenshotSlug
      ? slides.findIndex(
          (slide) =>
            slide.kind === 'screenshot' && slide.slug === screenshotSlug,
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
          : (activeSlideIndexes[projectIndex] ?? 0),
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
                },
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
    ],
  );

  const updateUrl = useCallback(
    (
      project: PortfolioProject | undefined,
      slide: ProjectSlide | undefined,
      mode: 'push' | 'replace',
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
    [],
  );

  const replaceModalUrl = useCallback(
    (project: PortfolioProject, slide: ProjectSlide) => {
      if (!isModalScreenshotSlide(project, slide)) {
        return;
      }

      window.history.replaceState(
        {},
        '',
        `${projectUrl(project, slide)}?modal=image`,
      );
      document.title = pageTitle(project, slide);
    },
    [],
  );

  const clearHorizontalScrollSync = useCallback(
    (project?: PortfolioProject) => {
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
    },
    [],
  );

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
    [clearHorizontalScrollSync],
  );

  const prepareMediaNavigation = useCallback(
    async (
      pending: Exclude<PendingNavigation, null>,
      mediaKeys?: string | string[],
    ) => {
      const intent = navigationIntentRef.current + 1;
      navigationIntentRef.current = intent;
      const requiredKeys = (
        Array.isArray(mediaKeys) ? mediaKeys : [mediaKeys]
      ).filter((key): key is string => Boolean(key));

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
    [ensureMediaReady, isMediaReady],
  );

  const setActiveSlide = useCallback(
    async (
      projectIndex: number,
      realIndex: number,
      mode: 'push' | 'replace',
      scrollBehavior: ScrollBehavior,
      boundarySourceIndex?: number,
    ) => {
      const project = portfolioSlides[projectIndex];
      const slides = projectSlides[project.slug];
      const nextIndex = positiveModulo(realIndex, slides.length);
      const nextSlide = slides[nextIndex];
      const nextScreenshotId =
        nextSlide.kind === 'screenshot' ? nextSlide.screenshot.id : null;
      const horizontalIntent =
        (horizontalPendingNavigationIntentRefs.current[project.slug] ?? 0) + 1;
      horizontalPendingNavigationIntentRefs.current[project.slug] =
        horizontalIntent;
      horizontalTargetSlideIndexesRef.current[project.slug] = nextIndex;
      horizontalKeyboardIndicatorIndexesRef.current[project.slug] =
        getCarouselIndexFromSlideIndex(project, nextIndex);
      const canNavigate = await prepareMediaNavigation(
        { kind: 'slide', projectIndex, slideIndex: nextIndex },
        getSlideMediaKey(project, nextSlide, isWideLayout),
      );

      if (!canNavigate) {
        if (
          nextScreenshotId &&
          inlineZoomHandoffScreenshotIdRef.current === nextScreenshotId
        ) {
          inlineZoomHandoffScreenshotIdRef.current = null;
        }

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
      const nextCarouselIndex = getCarouselIndexFromSlideIndex(
        project,
        nextIndex,
      );
      slideIndicatorMotionControllerRef.current?.begin(nextCarouselIndex);
      scrollHorizontalToRealIndex(
        project,
        nextIndex,
        scrollBehavior,
        () => {
          updateUrl(project, nextSlide, mode);
          startTransition(() => {
            setActiveSlideIndexes((indexes) =>
              indexes.map((index, currentProjectIndex) =>
                currentProjectIndex === projectIndex ? nextIndex : index,
              ),
            );
          });
        },
        { syncIndicator: true, boundarySourceIndex },
      );
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
    ],
  );

  const setActiveProject = useCallback(
    async (
      nextProjectIndex: number,
      mode: 'push' | 'replace',
      behavior: ScrollBehavior = 'smooth',
      targetSlideIndex?: number,
    ) => {
      const boundedIndex = Math.max(
        START_SCREEN_INDEX,
        Math.min(portfolioSlides.length - 1, nextProjectIndex),
      );
      const vertical = verticalRef.current;

      if (boundedIndex !== START_SCREEN_INDEX) {
        const project = portfolioSlides[boundedIndex];
        const slideIndex =
          targetSlideIndex ?? activeSlideIndexes[boundedIndex] ?? 0;
        const slide = projectSlides[project.slug][slideIndex];
        const canNavigate = await prepareMediaNavigation(
          { kind: 'project', projectIndex: boundedIndex },
          getSlideMediaKey(project, slide, isWideLayout),
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
        const targetScrollTop = vertical.clientHeight * (boundedIndex + 1);
        const distanceInScreens =
          Math.abs(targetScrollTop - vertical.scrollTop) /
          Math.max(vertical.clientHeight, 1);

        cancelVerticalScrollTween();
        if (
          behavior !== 'smooth' ||
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
          vertical.scrollTo({ top: targetScrollTop, behavior: 'auto' });
        } else {
          vertical.style.setProperty('scroll-snap-type', 'none');
          const tween = gsap.to(vertical, {
            scrollTop: targetScrollTop,
            duration: getNavigationTravelDuration(distanceInScreens),
            ease: NAVIGATION_TRAVEL_EASE,
            overwrite: 'auto',
            onUpdate: () => {
              sectionNavigationControllerRef.current?.syncSourcePosition();
              ScrollTrigger.update();
            },
            onComplete: () => {
              if (verticalScrollTweenRef.current === tween) {
                verticalScrollTweenRef.current = null;
              }
              restoreVerticalScrollSnap();
            },
            onInterrupt: () => {
              if (verticalScrollTweenRef.current === tween) {
                verticalScrollTweenRef.current = null;
              }
              restoreVerticalScrollSnap();
            },
          });
          verticalScrollTweenRef.current = tween;
        }
      }

      if (boundedIndex === START_SCREEN_INDEX) {
        updateUrl(undefined, undefined, mode);
        return;
      }

      const project = portfolioSlides[boundedIndex];
      const slideIndex =
        targetSlideIndex ?? activeSlideIndexes[boundedIndex] ?? 0;
      const slide = projectSlides[project.slug][slideIndex];

      if (targetSlideIndex !== undefined) {
        setActiveSlideIndexes((indexes) =>
          indexes.map((index, currentProjectIndex) =>
            currentProjectIndex === boundedIndex ? slideIndex : index,
          ),
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
      cancelVerticalScrollTween,
      isWideLayout,
      prepareMediaNavigation,
      projectSlides,
      resetDescriptionScroll,
      restoreVerticalScrollSnap,
      scrollHorizontalToRealIndex,
      updateUrl,
    ],
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
        currentSlideIndex,
      );
      const nextCarouselIndex = positiveModulo(
        currentCarouselIndex + direction,
        slides.length,
      );
      const nextIndex = getSlideIndexFromCarouselIndex(
        currentProject,
        nextCarouselIndex,
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
    ],
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
        slides.findIndex((projectSlide) => projectSlide.id === slide.id),
      );
      const canNavigate = await prepareMediaNavigation(
        { kind: 'modal', screenshotId: slide.screenshot.id },
        modalMediaKey(slide.screenshot),
      );

      if (!canNavigate) {
        return;
      }

      const modalCarouselIndex = projectSlides[activeProject.slug]
        .filter((projectSlide) =>
          isModalScreenshotSlide(activeProject, projectSlide),
        )
        .findIndex((projectSlide) => projectSlide.id === slide.id);
      slideIndicatorMotionControllerRef.current?.begin(
        Math.max(0, modalCarouselIndex),
      );

      setActiveSlideIndexes((indexes) =>
        indexes.map((index, currentProjectIndex) =>
          currentProjectIndex === activeProjectIndex ? nextSlideIndex : index,
        ),
      );

      if (scrollBehavior === 'smooth') {
        beginHorizontalScrollSync(activeProject);
      }

      scrollHorizontalToRealIndex(
        activeProject,
        nextSlideIndex,
        scrollBehavior,
      );
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
    ],
  );

  const moveModalHorizontal = useCallback(
    (direction: -1 | 1) => {
      if (!activeProject || activeProjectIndex === START_SCREEN_INDEX) {
        return;
      }

      const modalSlides = projectSlides[activeProject.slug].filter((slide) =>
        isModalScreenshotSlide(activeProject, slide),
      );

      if (modalSlides.length < 2) {
        return;
      }

      const currentModalIndex = Math.max(
        0,
        modalSlides.findIndex((slide) => slide.id === activeSlide?.id),
      );
      const nextSlide =
        modalSlides[
          positiveModulo(currentModalIndex + direction, modalSlides.length)
        ];

      setActiveModalSlide(nextSlide);
    },
    [
      activeProject,
      activeProjectIndex,
      activeSlide,
      projectSlides,
      setActiveModalSlide,
    ],
  );

  const moveVertical = useCallback(
    (direction: -1 | 1) => {
      setActiveProject(
        getVerticalTargetProjectIndex(activeProjectIndex, direction),
        'push',
      );
    },
    [activeProjectIndex, setActiveProject],
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
      window.history.replaceState(
        {},
        '',
        projectUrl(activeProject, activeSlide),
      );
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
      beginClose,
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
      !isBuildingWithAiTextSlide(initialProject, initialSlide),
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
      '(prefers-reduced-motion: reduce)',
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
          {
            scrollTop: targetScrollTop,
            duration: revealDuration,
            onUpdate: () =>
              sectionNavigationControllerRef.current?.syncSourcePosition(),
          },
          0,
        );
      }

      timeline.to(curtain, { autoAlpha: 0, duration: revealDuration }, 0);
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

  const handleVerticalScrollEndEvent = useEffectEvent(
    (vertical: HTMLDivElement) => {
      if (scrollSyncRef.current || verticalScrollTweenRef.current) {
        return;
      }

      const screenIndex =
        Math.round(vertical.scrollTop / vertical.clientHeight) - 1;
      const nextProjectIndex = Math.max(
        START_SCREEN_INDEX,
        Math.min(portfolioSlides.length - 1, screenIndex),
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
    },
  );

  const updateActiveSlideFromScrollEvent = useEffectEvent(
    (
      project: PortfolioProject,
      projectIndex: number,
      carousel: HTMLDivElement,
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
      const carouselPosition = getCarouselPosition(carousel);
      setProjectBoundaryBlur(project.slug, false);
      const realIndex = Math.max(
        0,
        Math.min(slides.length - 1, Math.round(carouselPosition)),
      );
      const nextSlideIndex = getSlideIndexFromCarouselIndex(project, realIndex);

      if (horizontalScrollSyncProjectRef.current === project.slug) {
        return;
      }

      setActiveSlideIndexes((indexes) => {
        if (indexes[projectIndex] === nextSlideIndex) {
          return indexes;
        }

        return indexes.map((index, currentProjectIndex) =>
          currentProjectIndex === projectIndex ? nextSlideIndex : index,
        );
      });
    },
  );

  const handleHorizontalScrollEndEvent = useEffectEvent(
    (
      project: PortfolioProject,
      projectIndex: number,
      carousel: HTMLDivElement,
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
      const carouselPosition = getCarouselPosition(carousel);
      const isBeforeFirstSlide = slides.length > 1 && carouselPosition < -0.01;
      const isAfterLastSlide =
        slides.length > 1 && carouselPosition > slides.length - 1 + 0.01;

      if (isBeforeFirstSlide || isAfterLastSlide) {
        const sourceIndex = isBeforeFirstSlide ? 0 : slides.length - 1;
        const targetIndex = isBeforeFirstSlide ? slides.length - 1 : 0;
        const targetSlideIndex = getSlideIndexFromCarouselIndex(
          project,
          targetIndex,
        );

        void setActiveSlide(
          projectIndex,
          targetSlideIndex,
          'replace',
          'smooth',
          sourceIndex,
        );
        return;
      }

      const nextIndex = Math.max(
        0,
        Math.min(slides.length - 1, Math.round(carouselPosition)),
      );
      const settledScrollLeft = getCarouselTargetScrollLeft(
        carousel,
        nextIndex,
      );

      if (Math.abs(carousel.scrollLeft - settledScrollLeft) > 0.5) {
        carousel.scrollTo({ left: settledScrollLeft, behavior: 'auto' });
      }

      const nextSlideIndex = getSlideIndexFromCarouselIndex(project, nextIndex);
      const nextSlide = projectSlides[project.slug][nextSlideIndex];

      setActiveSlideIndexes((indexes) =>
        indexes.map((index, currentProjectIndex) =>
          currentProjectIndex === projectIndex ? nextSlideIndex : index,
        ),
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

      setProjectBoundaryBlur(project.slug, false);
      clearHorizontalScrollSync(project);
    },
  );
  const clickVerticalSectionNavButton = useCallback(
    (direction: -1 | 1) => {
      const pendingItemIndex =
        sectionNavigationControllerRef.current?.getPinnedIndex() ?? null;
      const navigationBaseProjectIndex =
        pendingItemIndex === null ? activeProjectIndex : pendingItemIndex - 1;
      const targetProjectIndex = getVerticalTargetProjectIndex(
        navigationBaseProjectIndex,
        direction,
      );
      const targetItemIndex = targetProjectIndex + 1;
      return (
        sectionNavigationControllerRef.current?.click(
          targetItemIndex,
          'left',
        ) ?? false
      );
    },
    [activeProjectIndex],
  );
  const clickHorizontalSlideIndicator = useCallback(
    (direction: -1 | 1, preserveInlineZoom = false) => {
      const navigation = document.querySelector(
        '[data-portfolio-slide-indicators]',
      );
      const activeButton = navigation?.querySelector<HTMLButtonElement>(
        'button[data-portfolio-slide-indicator-index][aria-current="true"]',
      );

      if (!navigation || !activeButton) {
        return false;
      }

      const buttons = Array.from(
        navigation.querySelectorAll<HTMLButtonElement>(
          'button[data-portfolio-slide-indicator-index]',
        ),
      ).filter(
        (button) => button.parentElement?.style.pointerEvents !== 'none',
      );
      const activeIndex =
        !shouldShowModal && activeProject
          ? (horizontalKeyboardIndicatorIndexesRef.current[
              activeProject.slug
            ] ?? Number(activeButton.dataset.portfolioSlideIndicatorIndex))
          : Number(activeButton.dataset.portfolioSlideIndicatorIndex);
      const targetIndex = positiveModulo(
        activeIndex + direction,
        buttons.length,
      );
      const targetButton = buttons.find(
        (button) =>
          Number(button.dataset.portfolioSlideIndicatorIndex) === targetIndex,
      );

      if (!targetButton) {
        return false;
      }

      if (!shouldShowModal && activeProject) {
        horizontalKeyboardIndicatorIndexesRef.current[activeProject.slug] =
          targetIndex;

        if (preserveInlineZoom && targetIndex !== activeIndex) {
          const targetSlide = getCarouselSlides(activeProject)[targetIndex];

          if (targetSlide?.kind === 'screenshot') {
            inlineZoomHandoffScreenshotIdRef.current =
              targetSlide.screenshot.id;
          }
        }
      }
      targetButton.click();
      return true;
    },
    [activeProject, getCarouselSlides, shouldShowModal],
  );

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

    if (event.key === 'Escape' && isInlineZoomPresentationActive) {
      event.preventDefault();
      exitInlineZoomPresentation();
      return;
    }

    if (isTextEntryTarget(event.target)) {
      return;
    }

    if (
      event.key === 'Enter' &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !isEditableTarget(event.target) &&
      zoomVisibleInlineMediaIn()
    ) {
      event.preventDefault();
      focusKeyboardSurface();
      return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      exitInlineZoomPresentation();
    } else if (
      (event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
      !isInlineZoomPresentationActive
    ) {
      resetInlineMediaZoom();
    }

    if (!event.metaKey && !event.ctrlKey && !event.altKey) {
      if (event.key === '0') {
        event.preventDefault();
        exitInlineZoomPresentation();
        focusKeyboardSurface();
        sectionNavigationControllerRef.current?.pin(0, 'vertical', true);
        setActiveProject(START_SCREEN_INDEX, 'push');
        return;
      }

      if (/^[1-9]$/.test(event.key)) {
        const projectIndex = Number(event.key) - 1;

        if (projectIndex < portfolioSlides.length) {
          event.preventDefault();
          exitInlineZoomPresentation();
          focusKeyboardSurface();
          sectionNavigationControllerRef.current?.pin(
            projectIndex + 1,
            'vertical',
            true,
          );
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
      if (!clickHorizontalSlideIndicator(1, isInlineZoomPresentationActive)) {
        focusKeyboardSurface();
        moveHorizontal(1);
      }
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (!clickHorizontalSlideIndicator(-1, isInlineZoomPresentationActive)) {
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
    const vertical = verticalRef.current;

    if (!vertical) {
      return;
    }

    const handleVerticalScrollEnd = () => {
      handleVerticalScrollEndEvent(vertical);
      settleVerticalSectionNavClickTargets();
    };

    vertical.addEventListener('scrollend', handleVerticalScrollEnd);
    return () =>
      vertical.removeEventListener('scrollend', handleVerticalScrollEnd);
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
      verticalScrollTweenRef.current?.kill();
      verticalScrollTweenRef.current = null;
      restoreVerticalScrollSnap();
      Object.values(horizontalScrollTweenRefs.current).forEach((tween) => {
        tween?.kill();
      });
      Object.values(horizontalRefs.current).forEach((carousel) => {
        carousel?.style.removeProperty('scroll-snap-type');
      });
    },
    [clearHorizontalScrollSync, restoreVerticalScrollSnap],
  );

  const activeCarouselSlides = activeProject
    ? getCarouselSlides(activeProject)
    : [];
  const activeModalSlides = activeProject
    ? projectSlides[activeProject.slug].filter((slide) =>
        isModalScreenshotSlide(activeProject, slide),
      )
    : [];
  const activeModalScreenshots = activeModalSlides.map(
    (slide) => slide.screenshot,
  );
  const activeCarouselIndex = activeProject
    ? getCarouselIndexFromSlideIndex(activeProject, activeSlideIndex)
    : 0;
  const activeModalScreenshotIndex = Math.max(
    0,
    activeModalSlides.findIndex((slide) => slide.id === activeSlide?.id),
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
              slide.screenshot.id === pendingNavigation.screenshotId,
          )
        : undefined;
  const pendingNavigationIndex = pendingNavigationSlide
    ? activeNavigationSlides.findIndex(
        (slide) => slide.id === pendingNavigationSlide.id,
      )
    : null;
  const helperMessageKind: PortfolioHelperMessageKind =
    renderedIntroPhase !== 'ready'
      ? null
      : isModalPresentationActive || isInlineZoomPresentationActive
        ? 'close'
        : activeProjectIndex === START_SCREEN_INDEX
          ? 'navigation'
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
    activeProject && nextSlide
      ? slideNavigationTitle(activeProject, nextSlide)
      : '';
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
  return (
    <main
      ref={keyboardSurfaceRef}
      tabIndex={-1}
      className="relative isolate h-dvh overflow-hidden bg-black text-white outline-none"
    >
      <div
        ref={verticalRef}
        data-portfolio-vertical-scroll
        onPointerDownCapture={cancelVerticalUserTravel}
        onTouchStartCapture={cancelVerticalUserTravel}
        onWheelCapture={cancelVerticalUserTravel}
        className={`h-dvh overscroll-none portfolio-scrollbar-none ${
          renderedIntroPhase === 'ready' ? 'snap-y snap-mandatory' : 'snap-none'
        } ${
          renderedIntroPhase === 'ready' && sectionEntryMediaReady
            ? 'overflow-y-auto'
            : 'overflow-y-hidden'
        }`}
      >
        <section
          className={`portfolio-safe-inline relative h-dvh snap-start snap-always ${
            isTouchLandscapeLayout
              ? 'grid grid-rows-[auto_minmax(0,1fr)] gap-2'
              : isWideLayout
                ? 'flex flex-col justify-center py-16'
                : 'grid grid-rows-[auto_minmax(0,1fr)] py-6'
          }`}
          style={
            isTouchLandscapeLayout
              ? {
                  paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
                  paddingBottom:
                    'max(0.75rem, env(safe-area-inset-bottom, 0px))',
                  paddingLeft:
                    'max(5.5rem, calc(env(safe-area-inset-left, 0px) + 5.25rem))',
                  paddingRight:
                    'max(4rem, calc(env(safe-area-inset-right, 0px) + 2.5rem))',
                }
              : undefined
          }
        >
          <div
            className={
              isTouchLandscapeLayout
                ? 'min-w-0'
                : isWideLayout
                  ? 'portfolio-safe-inline absolute inset-x-0 top-6'
                  : 'min-w-0'
            }
          >
            <div
              className={`mx-auto flex w-full max-w-6xl gap-4 ${
                isTouchLandscapeLayout
                  ? 'items-start justify-between'
                  : isWideLayout
                    ? 'items-center justify-between'
                    : 'flex-col items-start justify-start'
              }`}
            >
              <div className="flex shrink-0 items-center gap-5">
                <svg
                  className={`shrink-0 text-white ${
                    isTouchLandscapeLayout ? 'size-9' : 'size-12'
                  }`}
                  width={isTouchLandscapeLayout ? 36 : 48}
                  height={isTouchLandscapeLayout ? 36 : 48}
                  viewBox="0 0 7 7"
                  aria-hidden="true"
                >
                  <rect x="1" y="1" width="1" height="1" fill="#fff" />
                  <rect x="5" y="1" width="1" height="1" fill="#fff" />
                  <rect x="1" y="2" width="1" height="1" fill="#fff" />
                  <rect x="3" y="2" width="1" height="1" fill="#fff" />
                  <rect x="5" y="2" width="1" height="1" fill="#fff" />
                  <rect x="1" y="3" width="1" height="1" fill="#fff" />
                  <rect x="5" y="3" width="1" height="1" fill="#fff" />
                  <rect x="1" y="4" width="1" height="1" fill="#fff" />
                  <rect x="3" y="4" width="1" height="1" fill="#fff" />
                  <rect x="5" y="4" width="1" height="1" fill="#fff" />
                  <rect x="1" y="5" width="1" height="1" fill="#fff" />
                  <rect x="2" y="5" width="1" height="1" fill="#fff" />
                  <rect x="3" y="5" width="1" height="1" fill="#fff" />
                  <rect x="4" y="5" width="1" height="1" fill="#fff" />
                  <rect x="5" y="5" width="1" height="1" fill="#fff" />
                </svg>
                <p
                  className={`font-light text-white/70 ${
                    isTouchLandscapeLayout ? 'text-sm' : 'text-base'
                  }`}
                >
                  Aaron M. Wright
                </p>
              </div>
              <address
                className={`flex min-w-0 flex-col font-light not-italic text-white/70 ${
                  isTouchLandscapeLayout
                    ? 'items-end gap-0 text-right text-sm leading-snug'
                    : `gap-1 text-base leading-relaxed ${
                        isWideLayout
                          ? 'items-end text-right'
                          : 'items-start text-left'
                      }`
                }`}
              >
                <p>302-70 Dyrgas Gate</p>
                <p>
                  Canmore, Alberta{' '}
                  <span className="whitespace-nowrap">T1W 3J6</span>
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
          <div
            className={`mx-auto w-full max-w-6xl ${
              isWideLayout && !isTouchLandscapeLayout
                ? ''
                : 'min-h-0 self-center'
            }`}
          >
            <p className="mb-[clamp(0.65rem,1.6vh,2rem)] text-xs font-light uppercase tracking-[0.35em] text-white/45">
              Sections
            </p>
            <div
              className="divide-y divide-white/15 border-y border-white/15"
              onPointerEnter={() => setSectionNavHovered(true)}
              onPointerLeave={() => setSectionNavHovered(false)}
            >
              {portfolioSlides.map((project, index) => (
                <button
                  key={project.id}
                  type="button"
                  className={`group w-full items-center gap-[clamp(0.75rem,1.8vh,1.5rem)] py-[clamp(0.2rem,0.65vh,0.75rem)] text-left text-white outline-none transition-colors hover:text-[var(--project-color)] focus-visible:text-[var(--project-color)] sm:py-[clamp(0.3rem,0.85vh,1.25rem)] ${
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
                  onPointerEnter={() => {
                    setSectionNavHovered(true);
                    sectionNavigationControllerRef.current?.preview(
                      index + 1,
                      true,
                    );
                  }}
                  onPointerLeave={() => {
                    sectionNavigationControllerRef.current?.preview(
                      index + 1,
                      false,
                    );
                  }}
                  onClick={(event) => {
                    focusKeyboardSurface();
                    const showProject = () =>
                      setActiveProject(index, 'push', 'smooth', 0);
                    sectionNavigationControllerRef.current?.pin(
                      index + 1,
                      'vertical',
                      event.detail === 0,
                    );
                    showProject();
                  }}
                >
                  {isWideLayout ? (
                    <>
                      <span className="relative flex min-w-0 items-center">
                        <span className="absolute right-full mr-5 w-8 shrink-0 text-right text-sm font-light text-current opacity-70 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 sm:text-base">
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
                        <SectionTitle
                          color={getProjectColor(index)}
                          elementRef={(node) => {
                            sectionMenuTitleRefs.current[index] = node;
                          }}
                        >
                          {project.title}
                        </SectionTitle>
                      </span>
                      <SectionBlurb className="justify-self-start">
                        {project.blurb}
                      </SectionBlurb>
                    </>
                  ) : (
                    <span className="flex min-w-0 flex-col gap-[clamp(0.15rem,0.55vh,0.75rem)]">
                      <SectionTitle
                        color={getProjectColor(index)}
                        elementRef={(node) => {
                          sectionMenuTitleRefs.current[index] = node;
                        }}
                      >
                        {project.title}
                      </SectionTitle>
                      <SectionBlurb>{project.blurb}</SectionBlurb>
                    </span>
                  )}
                  {!isWideLayout ? (
                    <span className="text-sm font-light text-current opacity-70 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 sm:text-base">
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
          const renderedSlides = isWideLayout
            ? getLoopingCarouselEntries(slides, true)
            : getCanonicalCarouselEntries(slides);
          const hasMobilePullBoundaries = !isWideLayout && slides.length > 1;
          const projectNumber = String(projectIndex + 1).padStart(2, '0');
          const activeCarouselIndex = getCarouselIndexFromSlideIndex(
            project,
            activeSlideIndexes[projectIndex] ?? 0,
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
                  className={`absolute bottom-10 left-0 top-10 z-10 w-[var(--portfolio-description-rail-width)] bg-black/80 py-6 pl-[var(--portfolio-control-gutter-width)] pr-6 backdrop-blur-md transition-opacity duration-500 ease-out motion-reduce:transition-none ${
                    isInlineZoomPresentationActive &&
                    activeProjectIndex === projectIndex
                      ? 'pointer-events-none opacity-0'
                      : 'opacity-100'
                  }`}
                />
              ) : null}
              <div
                ref={setHorizontalRef(project.slug)}
                data-portfolio-carousel={project.slug}
                className={`flex h-dvh snap-x snap-mandatory overflow-y-hidden overscroll-x-contain portfolio-scrollbar-none ${
                  projectCarouselsReady[projectIndex]
                    ? 'overflow-x-auto'
                    : 'overflow-x-hidden'
                } ${isWideLayout ? 'w-screen' : ''}`}
              >
                {hasMobilePullBoundaries ? (
                  <CarouselPullBoundary
                    edge="before"
                    projectColor={getProjectColor(projectIndex)}
                  />
                ) : null}
                {renderedSlides.map(({ item: slide, key, realIndex, kind }) => (
                  <ProjectPanel
                    key={`${project.id}-${key}`}
                    project={project}
                    projectNumber={projectNumber}
                    projectColor={getProjectColor(projectIndex)}
                    slide={slide}
                    carouselIndex={realIndex}
                    carouselEntryKind={kind}
                    isWideLayout={isWideLayout}
                    isActive={
                      activeProjectIndex === projectIndex &&
                      activeCarouselIndex === realIndex
                    }
                    inlineZoomPresentationActive={
                      isInlineZoomPresentationActive &&
                      activeProjectIndex === projectIndex
                    }
                    shouldBlurMedia={
                      slides.length > 2 &&
                      boundaryBlurProjectSlugs.has(project.slug)
                    }
                    concealedScreenshotId={
                      isModalLayerActive ? activeScreenshot?.id : undefined
                    }
                    registerMediaElement={registerMediaElement}
                    setDescriptionRef={setDescriptionRef(project.slug)}
                    onInlinePresentationChange={handleInlinePresentationChange}
                  />
                ))}
                {hasMobilePullBoundaries ? (
                  <CarouselPullBoundary
                    edge="after"
                    projectColor={getProjectColor(projectIndex)}
                  />
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      {isWideLayout ? (
        <SectionNavigation
          controllerRef={sectionNavigationControllerRef}
          sourceRef={verticalRef}
          menuTitleRefs={sectionMenuTitleRefs}
          items={sectionNavItems.map((item, itemIndex) => ({
            id: item.id,
            title: item.title,
            color: item.color,
            hasSlides: SECTION_NAV_HAS_SLIDES[itemIndex] ?? false,
            pending: Boolean(
              (pendingNavigation?.kind === 'project' &&
                pendingNavigation.projectIndex === item.projectIndex) ||
              ((pendingNavigation?.kind === 'slide' ||
                pendingNavigation?.kind === 'modal') &&
                item.projectIndex === activeProjectIndex),
            ),
          }))}
          activeIndex={activeProjectIndex + 1}
          hovered={sectionNavHovered}
          hideRightRail={isTouchLandscapeLayout}
          modalLayerActive={isModalLayerActive}
          modalPresentationActive={isModalPresentationActive}
          canMoveHorizontally={canMoveHorizontally}
          previousSlideTitle={previousSlideTitle}
          nextSlideTitle={nextSlideTitle}
          onHoveredChange={setSectionNavHovered}
          onHorizontalNavigate={(side) => {
            focusKeyboardSurface();

            if (isModalPresentationActive) {
              moveModalHorizontal(side === 'left' ? -1 : 1);
            } else {
              moveHorizontal(side === 'left' ? -1 : 1);
            }
          }}
          onVerticalNavigate={(itemIndex) => {
            focusKeyboardSurface();
            setActiveProject(itemIndex - 1, 'push');
          }}
        />
      ) : null}

      {!isWideLayout ? (
        <div
          className={`fixed bottom-5 right-5 z-30 grid h-12 w-11 place-items-center transition-opacity duration-300 ease-out ${
            activeProjectIndex === START_SCREEN_INDEX
              ? 'pointer-events-none opacity-0'
              : 'opacity-100'
          }`}
          style={{
            right: 'max(1.25rem, env(safe-area-inset-right, 0px))',
            bottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))',
          }}
        >
          <CircularIconButton
            icon={faArrowUp}
            iconClassName="size-7"
            ring
            className="relative size-11 bg-transparent text-[var(--project-color)]"
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
        className={`pointer-events-none isolate ${
          isWideLayout
            ? 'grid grid-cols-[minmax(var(--portfolio-description-rail-width),1fr)_var(--portfolio-screenshot-size)_var(--portfolio-control-gutter-width)]'
            : 'flex justify-center px-6'
        }`}
        aria-label={
          activeProject ? `${activeProject.title} screens` : 'Portfolio screens'
        }
        style={
          {
            ...WIDE_LAYOUT_STYLE,
            position: 'absolute',
            right: 0,
            bottom: '2rem',
            left: 0,
            height: '52px',
            overflow: 'visible',
            zIndex: isModalLayerActive ? 60 : 40,
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
            isWideLayout && shouldCenterSlideNavigation
              ? 'translate-x-[var(--portfolio-modal-indicator-translate-x)] will-change-transform'
              : 'translate-x-0'
          }`}
          style={
            !isWideLayout
              ? {
                  transform: `translateX(calc(-1 * max(0px, calc(${
                    Math.max(activeNavigationSlides.length - 1, 0) *
                      (NAVIGATION_INDICATOR_STEP_REM / 2) +
                    MOBILE_SLIDE_NAV_CONTROL_CLEARANCE_REM
                  }rem - 50vw))))`,
                }
              : undefined
          }
        >
          <SlideNavigation
            controllerRef={slideIndicatorMotionControllerRef}
            items={activeNavigationSlides.map((slide) => ({
              id: slide.id,
              label:
                slide.kind === 'description'
                  ? `Show ${activeProject?.title ?? 'Portfolio'} description`
                  : `Show ${slide.screenshot.alt}`,
            }))}
            activeIndex={activeNavigationIndex}
            pendingIndex={pendingNavigationIndex}
            color={activeProjectColor ?? getProjectColor(0)}
            onSelect={(navigationIndex) => {
              if (!activeProject) {
                return;
              }

              const slide = activeNavigationSlides[navigationIndex];

              if (!slide) {
                return;
              }

              focusKeyboardSurface();
              const slideIndex = Math.max(
                0,
                projectSlides[activeProject.slug].findIndex(
                  (projectSlide) => projectSlide.id === slide.id,
                ),
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

      <CircularIconButton
        icon={faXmark}
        iconClassName="size-7"
        ring
        className={`fixed right-5 top-5 z-[70] isolate size-11 bg-black text-[var(--project-color)] transition-[transform,opacity] duration-300 motion-reduce:transition-none ${
          isInlineZoomPresentationActive
            ? 'translate-y-0 rotate-0 opacity-100'
            : 'pointer-events-none -translate-y-16 rotate-90 opacity-0'
        }`}
        style={
          {
            '--project-color': activeProjectColor ?? PROJECT_COLORS[0],
            top: 'max(1.25rem, env(safe-area-inset-top, 0px))',
            right: 'max(1.25rem, env(safe-area-inset-right, 0px))',
          } as ProjectColorStyle
        }
        aria-label="Reset image zoom"
        title="Close"
        aria-hidden={isInlineZoomPresentationActive ? undefined : true}
        tabIndex={isInlineZoomPresentationActive ? undefined : -1}
        onClick={exitInlineZoomPresentation}
      />

      {shouldShowModal && activeProject && activeScreenshot ? (
        <ImageModal
          indicatorMotionControllerRef={slideIndicatorMotionControllerRef}
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

      <PortfolioHelperMessage
        kind={isWideLayout && !isTouchInput ? helperMessageKind : null}
      />

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
            className="relative size-11 bg-black text-white"
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
  elementRef,
}: {
  children: string;
  color: string;
  elementRef?: (node: HTMLSpanElement | null) => void;
}) {
  return (
    <span
      ref={elementRef}
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
      className={`max-w-[54ch] text-[clamp(0.75rem,1.5vh,0.9rem)] font-light normal-case leading-snug tracking-normal text-current opacity-70 sm:text-[clamp(0.75rem,1.55vh,1rem)] ${
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

function KeyboardKey({
  icon,
  label,
  ariaLabel,
}: {
  icon?: IconProp;
  label?: string;
  ariaLabel?: string;
}) {
  return (
    <kbd
      aria-label={ariaLabel}
      className="relative mx-0.5 inline-grid h-[1.3125rem] min-w-[1.3125rem] place-items-center rounded-sm bg-white/40 px-[0.1875rem] pb-[0.1875rem] pt-[0.09375rem] align-middle"
    >
      <span
        className={`grid h-[0.9375rem] min-w-[0.9375rem] -translate-y-px place-items-center rounded-xs bg-white text-[0.5rem] font-black leading-none text-black ${
          label ? 'px-[0.28125rem]' : 'px-0'
        }`}
        aria-hidden={ariaLabel ? true : undefined}
      >
        {icon ? (
          <FontAwesomeIcon icon={icon} />
        ) : (
          <span className="translate-y-px">{label}</span>
        )}
      </span>
    </kbd>
  );
}

function PortfolioHelperMessage({
  kind,
}: {
  kind: PortfolioHelperMessageKind;
}) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const hasInitializedMotionRef = useRef(false);
  const [renderedKind, setRenderedKind] = useState<
    Exclude<PortfolioHelperMessageKind, null>
  >(kind ?? 'navigation');
  const isVisible = kind !== null && renderedKind === kind;

  useEffect(() => {
    if (!kind || kind === renderedKind) {
      return;
    }

    const frame = requestAnimationFrame(() => setRenderedKind(kind));

    return () => cancelAnimationFrame(frame);
  }, [kind, renderedKind]);

  useLayoutEffect(() => {
    const bubble = bubbleRef.current;

    if (!bubble) {
      return;
    }

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const y = isVisible || reducedMotion ? 0 : 64;

    gsap.killTweensOf(bubble);

    if (!hasInitializedMotionRef.current) {
      hasInitializedMotionRef.current = true;
      gsap.set(bubble, { y, opacity: isVisible ? 1 : 0 });
      return;
    }

    gsap.to(bubble, {
      y,
      opacity: isVisible ? 1 : 0,
      duration: reducedMotion ? 0 : 0.3,
      ease: isVisible ? 'expo.out' : 'power2.in',
      overwrite: 'auto',
    });

    return () => gsap.killTweensOf(bubble);
  }, [isVisible]);

  return (
    <div
      ref={bubbleRef}
      role="status"
      aria-live="polite"
      aria-hidden={isVisible ? undefined : true}
      className="pointer-events-none fixed bottom-5 right-5 z-[110] max-w-[calc(100vw-2.5rem)] translate-y-16 rounded-full bg-white/10 px-4 py-2 text-sm font-normal leading-tight text-white opacity-0 backdrop-blur-md motion-reduce:translate-y-0"
      style={{
        right: 'max(1.25rem, env(safe-area-inset-right, 0px))',
        bottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      {renderedKind === 'navigation' ? (
        <span className="leading-6">
          Use <KeyboardKey icon={faArrowLeft} ariaLabel="left arrow" />
          <KeyboardKey icon={faArrowRight} ariaLabel="right arrow" />
          <KeyboardKey icon={faArrowUp} ariaLabel="up arrow" />
          <KeyboardKey icon={faArrowDown} ariaLabel="down arrow" />
          , or <KeyboardKey label="1" />,
          <KeyboardKey label="2" />, ... <KeyboardKey label="0" /> to navigate
          sections
        </span>
      ) : (
        <span className="leading-6">
          Press <KeyboardKey label="ESC" /> to close
        </span>
      )}
    </div>
  );
}

function NavigationActiveRing({
  color,
  visualScale = 1,
  elementRef,
  previewElementRef,
  className,
  style,
  dataAttributes,
  previewDataAttributes,
  tooltip,
}: {
  color: string;
  visualScale?: number;
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
      className={`pointer-events-none size-11 overflow-visible ${className}`}
      style={{
        color,
        ...style,
      }}
      aria-hidden={tooltip ? undefined : true}
    >
      <div
        ref={previewElementRef}
        {...previewDataAttributes}
        data-navigation-ring-pop-layer="true"
        className="relative size-11"
      >
        <svg
          className="absolute inset-0 size-11 overflow-visible"
          viewBox="0 0 44 44"
          style={
            visualScale === 1
              ? undefined
              : {
                  transform: `scale(${visualScale})`,
                  transformBox: 'fill-box',
                  transformOrigin: '50% 50%',
                }
          }
          aria-hidden="true"
        >
          <circle
            cx="22"
            cy="22"
            r="20"
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
      className={`group/icon-button relative flex items-center justify-center rounded-full outline-none ${className ?? ''}`}
      {...buttonProps}
    >
      {ring ? (
        <NavigationActiveRing
          color="inherit"
          visualScale={NAVIGATION_ACTIVE_SCALE}
          className="absolute inset-0 z-0"
        />
      ) : null}
      {visualRef || secondaryVisual ? (
        <span ref={visualRef} className="relative z-10 block h-full w-full">
          <span className="absolute inset-0 flex items-center justify-center">
            <FontAwesomeIcon
              ref={iconRef}
              icon={icon}
              className={`${iconClassName} drop-shadow-[1px_1px_0_black]`}
              aria-hidden="true"
            />
          </span>
          {secondaryVisual ? (
            <span className="absolute inset-0 flex items-center justify-center">
              {secondaryVisual}
            </span>
          ) : null}
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
          ...(isWideLayout
            ? {
                paddingLeft:
                  'max(var(--portfolio-control-gutter-width), calc(env(safe-area-inset-left, 0px) + 5.5rem))',
              }
            : {}),
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
        className={`grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto] ${
          isWideLayout
            ? 'w-[calc(48ch+2rem)] max-w-full'
            : 'w-full max-w-[calc(48ch+2rem)]'
        }`}
      >
        <OverscrollIndicator
          ref={setDescriptionRef}
          className="portfolio-themed-scrollbar overflow-x-hidden pr-10"
          contentClassName={`portfolio-markdown portfolio-markdown-scroll-body prose min-w-0 w-full max-w-[48ch] font-light leading-relaxed text-white/82 ${
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
        </OverscrollIndicator>
        {project.url ? (
          <div className="pr-10 pt-5">
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-14 w-full items-center justify-center rounded-lg px-6 py-4 text-center text-base font-black leading-none tracking-normal text-black outline-none transition-[filter] duration-200 hover:brightness-110 focus-visible:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--project-color)] active:brightness-95 motion-reduce:transition-none"
              style={{ backgroundColor: projectColor }}
            >
              Visit Project
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ZoomableScreenshot({
  active,
  screenshotId,
  concealed,
  className,
  expandToViewport,
  presentationActive,
  onPresentationChange,
  children,
}: {
  active: boolean;
  screenshotId: string;
  concealed: boolean;
  className: string;
  expandToViewport: boolean;
  presentationActive: boolean;
  onPresentationChange: (screenshotId: string, presented: boolean) => void;
  children: ReactNode;
}) {
  const {
    contentRef,
    isPointerDragging,
    isPresented: isLocallyPresented,
    isZoomed,
    surfaceRef,
  } = useInlineMediaZoom(active, (presented) =>
    onPresentationChange(screenshotId, presented),
  );
  const cursorClass = isZoomed
    ? isPointerDragging
      ? 'cursor-grabbing'
      : 'cursor-grab'
    : '';
  const isPresented = isLocallyPresented || presentationActive;

  return (
    <div
      ref={surfaceRef}
      data-portfolio-screenshot-id={screenshotId}
      data-portfolio-inline-zoomed={isLocallyPresented ? 'true' : 'false'}
      className={`relative overflow-hidden border border-transparent transition-[width,height,right] duration-500 ease-out motion-reduce:transition-none ${className} ${cursorClass} ${
        concealed ? 'invisible' : ''
      }`}
      style={
        {
          '--portfolio-media-padding': isPresented ? '6rem' : '1.5rem',
          touchAction: isZoomed ? 'none' : 'pan-x pan-y',
          position: expandToViewport ? 'absolute' : undefined,
          right: expandToViewport
            ? isPresented
              ? '0px'
              : 'var(--portfolio-control-gutter-width)'
            : undefined,
          top: expandToViewport ? '50%' : undefined,
          width: expandToViewport
            ? isPresented
              ? '100vw'
              : 'var(--portfolio-screenshot-size)'
            : undefined,
          height: expandToViewport
            ? isPresented
              ? '100dvh'
              : 'var(--portfolio-screenshot-size)'
            : undefined,
          transform: expandToViewport ? 'translate3d(0, -50%, 0)' : undefined,
          willChange: isPresented ? 'width, height, right' : undefined,
        } as InlineMediaSurfaceStyle
      }
    >
      <div
        ref={contentRef}
        data-portfolio-inline-zoom-content
        className="pointer-events-none absolute inset-0 origin-center select-none"
        style={{ willChange: isZoomed ? 'transform' : 'auto' }}
      >
        {children}
      </div>
    </div>
  );
}

function CarouselPullBoundary({
  edge,
  projectColor,
}: {
  edge: 'before' | 'after';
  projectColor: string;
}) {
  const icon = (
    <FontAwesomeIcon
      icon={edge === 'before' ? faArrowRight : faArrowLeft}
      className="size-7 text-[var(--project-color)] drop-shadow-[1px_1px_0_black]"
    />
  );

  if (edge === 'after') {
    return (
      <>
        <div
          data-portfolio-carousel-boundary={edge}
          className="pointer-events-none -ml-[50vw] h-dvh w-[50vw] shrink-0 snap-start snap-always"
          aria-hidden="true"
        />
        <div
          data-portfolio-carousel-boundary-visual={edge}
          className="pointer-events-none grid h-dvh w-[50vw] shrink-0 place-items-center bg-black"
          style={
            {
              '--project-color': projectColor,
            } as ProjectColorStyle
          }
          aria-hidden="true"
        >
          {icon}
        </div>
      </>
    );
  }

  return (
    <div
      data-portfolio-carousel-boundary={edge}
      className="pointer-events-none grid h-dvh w-[50vw] shrink-0 snap-start snap-always place-items-center bg-black"
      style={
        {
          '--project-color': projectColor,
        } as ProjectColorStyle
      }
      aria-hidden="true"
    >
      {icon}
    </div>
  );
}

function ProjectPanel({
  project,
  projectNumber,
  projectColor,
  slide,
  carouselIndex,
  carouselEntryKind,
  isWideLayout,
  isActive,
  inlineZoomPresentationActive,
  shouldBlurMedia,
  concealedScreenshotId,
  registerMediaElement,
  setDescriptionRef,
  onInlinePresentationChange,
}: {
  project: PortfolioProject;
  projectNumber: string;
  projectColor: string;
  slide: ProjectSlide;
  carouselIndex: number;
  carouselEntryKind: LoopingCarouselEntry<ProjectSlide>['kind'];
  isWideLayout: boolean;
  isActive: boolean;
  inlineZoomPresentationActive: boolean;
  shouldBlurMedia: boolean;
  concealedScreenshotId?: string;
  registerMediaElement: (
    key: string,
    element: PortfolioMediaElement | null,
  ) => void;
  setDescriptionRef: (node: HTMLDivElement | null) => void;
  onInlinePresentationChange: (
    screenshotId: string,
    presented: boolean,
  ) => void;
}) {
  const isTextSlide = isBuildingWithAiTextSlide(project, slide);
  const shouldShowDescriptionPlaceholder =
    isWideLayout &&
    slide.kind === 'description' &&
    !hasProjectScreenshots(project);
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
      data-portfolio-carousel-panel={carouselEntryKind}
      data-portfolio-carousel-index={carouselIndex}
      className={`grid h-dvh w-screen shrink-0 snap-start snap-always grid-rows-[1fr] bg-black ${
        isWideLayout ? 'px-0 py-0' : 'portfolio-safe-inline pb-24 pt-8'
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
          !isWideLayout && slide.kind === 'description' ? '' : 'hidden'
        }
      />

      <div
        className={`relative grid min-h-0 ${panelContentClass} ${
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
          <ZoomableScreenshot
            active={isActive}
            screenshotId={slide.screenshot.id}
            concealed={concealedScreenshotId === slide.screenshot.id}
            expandToViewport={isWideLayout}
            presentationActive={inlineZoomPresentationActive}
            onPresentationChange={onInlinePresentationChange}
            className={
              isWideLayout
                ? 'col-start-2 aspect-square h-[var(--portfolio-screenshot-size)] max-h-none w-[var(--portfolio-screenshot-size)] max-w-none self-center justify-self-end'
                : 'h-full min-h-0 w-full'
            }
          >
            <ScreenshotMedia
              screenshot={slide.screenshot}
              mediaKey={carouselMediaKey(slide.screenshot)}
              registerMediaElement={registerMediaElement}
              priority={isActive}
              sizes={
                isWideLayout
                  ? '(min-aspect-ratio: 5/4) calc(100dvh - 8rem), 100vw'
                  : '100vw'
              }
              className={getCarouselMediaClass(shouldBlurMedia)}
            />
          </ZoomableScreenshot>
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
          ...(isWideLayout
            ? {
                paddingLeft:
                  'max(var(--portfolio-control-gutter-width), calc(env(safe-area-inset-left, 0px) + 5.5rem))',
              }
            : {}),
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
        <OverscrollIndicator
          ref={setDescriptionRef}
          wrapperClassName="w-full max-w-[calc(108ch+9rem)]"
          className="portfolio-themed-scrollbar overflow-x-hidden pr-10"
          contentClassName="portfolio-markdown portfolio-markdown-scroll-body prose min-w-0 w-full max-w-[calc(108ch+7rem)] text-lg font-light leading-relaxed text-white/82 [column-count:3] [column-fill:balance] [column-gap:3.5rem]"
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={PORTFOLIO_MARKDOWN_COMPONENTS}
          >
            {project.descriptionMarkdown}
          </ReactMarkdown>
        </OverscrollIndicator>
      ) : (
        <OverscrollIndicator
          ref={setDescriptionRef}
          wrapperClassName="w-full max-w-[calc(48ch+2rem)]"
          className="portfolio-themed-scrollbar overflow-x-hidden pr-10"
          contentClassName="portfolio-markdown portfolio-markdown-scroll-body prose min-w-0 w-full max-w-[48ch] text-lg font-light leading-relaxed text-white/82"
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={PORTFOLIO_MARKDOWN_COMPONENTS}
          >
            {project.descriptionMarkdown}
          </ReactMarkdown>
        </OverscrollIndicator>
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
    element: PortfolioMediaElement | null,
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
        className={`absolute inset-0 h-full w-full select-none [padding:var(--portfolio-media-padding,1.5rem)] ${className}`}
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
      className={`select-none [padding:var(--portfolio-media-padding,1.5rem)] ${className}`}
    />
  );
}

function ImageModal({
  indicatorMotionControllerRef,
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
  indicatorMotionControllerRef: {
    current: SlideIndicatorMotionController | null;
  };
  project: PortfolioProject;
  projectColor?: string;
  screenshot: PortfolioScreenshot;
  screenshots: PortfolioScreenshot[];
  activeScreenshotIndex: number;
  transitionRect: ModalTransitionRect | null;
  isClosing: boolean;
  registerMediaElement: (
    key: string,
    element: PortfolioMediaElement | null,
  ) => void;
  onClose: () => void;
  onExited: () => void;
}) {
  const carouselScreenshots =
    screenshots.length > 0 ? screenshots : [screenshot];
  const carouselCount = carouselScreenshots.length;
  const boundedActiveScreenshotIndex = Math.max(
    0,
    Math.min(carouselCount - 1, activeScreenshotIndex),
  );
  const renderedCarouselScreenshots =
    getLoopingCarouselEntries(carouselScreenshots);
  const [isDragging, setIsDragging] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(
    Boolean(transitionRect),
  );
  const [isBoundaryBlurTransition, setIsBoundaryBlurTransition] =
    useState(false);
  const renderedCarouselIndex = getCanonicalRenderedCarouselIndex(
    boundedActiveScreenshotIndex,
    carouselCount,
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
  const showTransitionMedia = isTransitioning || isClosing;
  return (
    <>
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
                ({ item: carouselScreenshot, key }) => (
                  <div key={key} className="relative h-full w-screen shrink-0">
                    <ScreenshotMedia
                      screenshot={carouselScreenshot}
                      mediaKey={modalMediaKey(carouselScreenshot)}
                      registerMediaElement={registerMediaElement}
                      priority={carouselScreenshot.id === screenshot.id}
                      sizes="100vw"
                      className={getCarouselMediaClass(
                        carouselCount > 2 && isBoundaryBlurTransition,
                      )}
                    />
                  </div>
                ),
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
      <CircularIconButton
        icon={faXmark}
        buttonRef={(node) => {
          closeButtonRef.current = node;
        }}
        iconClassName="size-7"
        ring
        data-portfolio-modal-close
        className={`fixed right-5 top-5 z-[70] isolate size-11 bg-black text-[var(--project-color)] ${
          isClosing ? 'pointer-events-none' : ''
        }`}
        style={
          {
            '--project-color': projectColor ?? PROJECT_COLORS[0],
            top: 'max(1.25rem, env(safe-area-inset-top, 0px))',
            right: 'max(1.25rem, env(safe-area-inset-right, 0px))',
          } as ProjectColorStyle
        }
        aria-label="Close enlarged image"
        title="Close"
        onClick={onClose}
      />
    </>
  );
}
