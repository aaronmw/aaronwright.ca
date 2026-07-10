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
  TransitionEvent as ReactTransitionEvent,
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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import {
  faArrowDown,
  faArrowLeft,
  faArrowRight,
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
const NAVIGATION_SQUARE_CLASS =
  'block size-5 border border-current';
const NAVIGATION_INDICATOR_STEP_REM = 2.5;
const NAVIGATION_INDICATOR_PAIR_STAGGER_MS = 90;
const NAVIGATION_INDICATOR_SIDE_LEAD_MS = 30;
const NAVIGATION_INDICATOR_TRANSITION_MS = 500;
const SECTION_NAV_ITEM_STEP_REM = 3.75;
const CAROUSEL_MEDIA_CLASS =
  'object-contain transition-[filter] duration-1000 ease-in-out';
const TOP_SCREEN_COLOR = 'hsl(0 0% 100%)';
const PROJECT_COLOR_START_HUE = 342;
const PROJECT_COLOR_SATURATION = 78;
const PROJECT_COLOR_LIGHTNESS = 54;
const PROJECT_COLORS = buildProjectColors(portfolioSlides.length);
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

function getCarouselTrackTransform(renderedIndex: number) {
  return `translate3d(${-renderedIndex * 100}%, 0, 0)`;
}

function getCarouselMediaClass(isActive: boolean) {
  return `${CAROUSEL_MEDIA_CLASS} ${
    isActive ? 'blur-0' : 'blur-[20px]'
  }`;
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

function applyFrameRect(node: HTMLElement, rect: ModalTransitionRect) {
  node.style.left = `${rect.left}px`;
  node.style.top = `${rect.top}px`;
  node.style.width = `${rect.width}px`;
  node.style.height = `${rect.height}px`;
}

function clearFrameRect(node: HTMLElement) {
  node.style.left = '';
  node.style.top = '';
  node.style.width = '';
  node.style.height = '';
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
      }

      clearHorizontalScrollSync(project);
    }
  );

  const handleKeyDownEvent = useEffectEvent((event: KeyboardEvent) => {
    if (shouldShowModal) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }

      if (isModalClosing) {
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveModalHorizontal(1);
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveModalHorizontal(-1);
        return;
      }

      return;
    }

    if (isEditableTarget(event.target)) {
      return;
    }

    if (!event.metaKey && !event.ctrlKey && !event.altKey) {
      if (event.key === '0') {
        event.preventDefault();
        setActiveProject(START_SCREEN_INDEX, 'push');
        return;
      }

      if (/^[1-9]$/.test(event.key)) {
        const projectIndex = Number(event.key) - 1;

        if (projectIndex < portfolioSlides.length) {
          event.preventDefault();
          setActiveProject(projectIndex, 'push', 'smooth', 0);
          return;
        }
      }
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveVertical(1);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveVertical(-1);
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveHorizontal(1);
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveHorizontal(-1);
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

    const handleVerticalScrollEnd = () => handleVerticalScrollEndEvent(vertical);
    vertical.addEventListener('scrollend', handleVerticalScrollEnd);
    return () => vertical.removeEventListener('scrollend', handleVerticalScrollEnd);
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
  const sideNavActiveItemIndex = Math.max(
    0,
    sectionNavItems.findIndex((item) => item.projectIndex === activeProjectIndex)
  );
  const sideNavActiveFillColor =
    sectionNavItems[sideNavActiveItemIndex]?.color ?? TOP_SCREEN_COLOR;
  const sideNavStackStyle: CSSProperties = {
    transform: isModalPresentationActive
      ? `translateY(${
          ((sectionNavItems.length - 1) / 2 - sideNavActiveItemIndex) *
          SECTION_NAV_ITEM_STEP_REM
        }rem)`
      : 'translateY(0)',
  };
  const renderSectionNavButton = (
    item: (typeof sectionNavItems)[number],
    side: 'left' | 'right'
  ) => {
    const isActiveSection = item.projectIndex === activeProjectIndex;
    const isActiveProjectSection =
      isActiveSection && item.projectIndex !== START_SCREEN_INDEX;
    const isLeftSide = side === 'left';
    const tooltipId = `portfolio-${side}-section-${item.id}-tooltip`;
    const hasHorizontalAction = isActiveProjectSection && canMoveHorizontally;

    const Icon = hasHorizontalAction
      ? isLeftSide
        ? faArrowLeft
        : faArrowRight
      : item.projectIndex < activeProjectIndex
        ? faArrowUp
        : faArrowDown;
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
        icon={Icon}
        label={label}
        tooltipTitle={tooltipTitle}
        tooltipId={tooltipId}
        side={side}
        color={item.color}
        activeButton={isActiveSection}
        concealed={isModalPresentationActive && !isActiveSection}
        onClick={() => {
          focusKeyboardSurface();

          if (hasHorizontalAction) {
            if (isModalPresentationActive) {
              moveModalHorizontal(isLeftSide ? -1 : 1);
            } else {
              moveHorizontal(isLeftSide ? -1 : 1);
            }
            return;
          }

          if (!isActiveSection) {
            setActiveProject(item.projectIndex, 'push');
          }
        }}
      />
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
                      ? 'grid grid-cols-[auto_minmax(0,1fr)_36ch]'
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
                      <span className="text-sm font-light text-current sm:text-base">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <SectionTitle color={getProjectColor(index)}>
                        {project.title}
                      </SectionTitle>
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
          <div
            className={`fixed left-3 top-1/2 -translate-y-1/2 sm:left-6 ${
              isModalLayerActive ? 'z-[60]' : 'z-20'
            }`}
          >
            <div
              className="relative flex flex-col gap-3 transition-transform duration-500 ease-out motion-reduce:transition-none"
              style={sideNavStackStyle}
            >
              <AnimatedActiveFill
                activeIndex={sideNavActiveItemIndex}
                axis="y"
                color={sideNavActiveFillColor}
                stepRem={SECTION_NAV_ITEM_STEP_REM}
                className="block size-12 border-4 border-current"
                dataAttributes={{ 'data-portfolio-section-nav-fill': 'left' }}
              />
              {sectionNavItems.map((item) => renderSectionNavButton(item, 'left'))}
            </div>
          </div>
          <div
            className={`fixed right-3 top-1/2 -translate-y-1/2 sm:right-6 ${
              isModalLayerActive ? 'z-[60]' : 'z-20'
            }`}
          >
            <div
              className="relative flex flex-col gap-3 transition-transform duration-500 ease-out motion-reduce:transition-none"
              style={sideNavStackStyle}
            >
              <AnimatedActiveFill
                activeIndex={sideNavActiveItemIndex}
                axis="y"
                color={sideNavActiveFillColor}
                stepRem={SECTION_NAV_ITEM_STEP_REM}
                className="block size-12 border-4 border-current"
                dataAttributes={{ 'data-portfolio-section-nav-fill': 'right' }}
              />
              {sectionNavItems.map((item) => renderSectionNavButton(item, 'right'))}
            </div>
          </div>
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
          <button
            type="button"
            className="grid place-items-center border-4 border-white bg-white p-1.5 text-black outline-none transition-[background-color,border-color,border-width,color,padding] duration-500 ease-out"
            aria-label="Back to work"
            onClick={() => {
              focusKeyboardSurface();
              setActiveProject(START_SCREEN_INDEX, 'push');
            }}
          >
            <ArrowUpToLineIcon className="size-7 drop-shadow-[1px_1px_0_black]" />
          </button>
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
  const previousCountRef = useRef(targetCount);
  const transitionFrameRef = useRef<number | null>(null);
  const transitionStartFrameRef = useRef<number | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [transitionState, setTransitionState] =
    useState<IndicatorTransitionState>({
      previousCount: targetCount,
      targetCount,
      phase: 'idle',
    });

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

  return (
    <div
      data-portfolio-slide-indicators
      className="relative h-[3.25rem] transition-[width] duration-500 ease-out motion-reduce:transition-none"
      style={{
        width: `${Math.max(targetCount, 1) * NAVIGATION_INDICATOR_STEP_REM}rem`,
      }}
    >
      <AnimatedActiveFill
        activeIndex={boundedActiveIndex}
        axis="x"
        centeredCount={Math.max(targetCount, 1)}
        color={color}
        stepRem={NAVIGATION_INDICATOR_STEP_REM}
        visible={targetCount > 0}
        className={NAVIGATION_SQUARE_CLASS}
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
                className="pointer-events-auto grid size-7 place-items-center text-white outline-none transition-colors hover:text-[var(--project-color)] focus-visible:text-[var(--project-color)]"
                aria-label={
                  slide.kind === 'description'
                    ? `Show ${projectTitle} description`
                    : `Show ${slide.screenshot.alt}`
                }
                aria-current={
                  boundedActiveIndex === targetIndex ? 'true' : undefined
                }
                onClick={() => onSelect(slide)}
              >
                <span className={NAVIGATION_SQUARE_CLASS} aria-hidden="true" />
              </button>
            ) : (
              <span className={NAVIGATION_SQUARE_CLASS} aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function AnimatedActiveFill({
  activeIndex,
  axis,
  color,
  stepRem,
  offsetRem = 0,
  centeredCount,
  visible = true,
  className,
  dataAttributes,
}: {
  activeIndex: number;
  axis: 'x' | 'y';
  color: string;
  stepRem: number;
  offsetRem?: number;
  centeredCount?: number;
  visible?: boolean;
  className: string;
  dataAttributes?: Record<`data-${string}`, string>;
}) {
  const position = `calc(${activeIndex} * ${stepRem}rem + ${offsetRem}rem)`;
  const isCenteredHorizontal = axis === 'x' && centeredCount !== undefined;
  const transform = isCenteredHorizontal
    ? getCenteredIndicatorTransform(activeIndex, centeredCount)
    : axis === 'x'
      ? `translate3d(${position}, -50%, 0)`
      : `translate3d(-50%, ${position}, 0)`;
  const positionClass =
    axis === 'x'
      ? isCenteredHorizontal
        ? 'left-1/2 top-1/2 z-10'
        : 'left-0 top-1/2 z-10'
      : 'left-1/2 top-0 z-0';

  return (
    <span
      {...dataAttributes}
      className={`${className} pointer-events-none absolute ${positionClass} transition-[background-color,border-color,color,opacity,transform] duration-500 ease-out motion-reduce:transition-none`}
      style={{
        backgroundColor: color,
        borderColor: color,
        color,
        opacity: visible ? 1 : 0,
        transform,
      }}
      aria-hidden="true"
    />
  );
}

function SideNavButton({
  icon,
  label,
  tooltipTitle,
  tooltipId,
  side,
  color,
  activeButton = false,
  concealed = false,
  onClick,
}: {
  icon: IconProp;
  label: string;
  tooltipTitle: string;
  tooltipId: string;
  side: 'left' | 'right';
  color?: string;
  activeButton?: boolean;
  concealed?: boolean;
  onClick: () => void;
}) {
  const projectColor = color ?? PROJECT_COLORS[0];
  const buttonPaddingClass = activeButton
      ? 'border-4 p-1.5'
      : 'border-0 p-1 hover:border-4 hover:p-1.5 focus:border-4 focus:p-1.5 focus-visible:border-4 focus-visible:p-1.5';
  const buttonSurfaceClass = activeButton
    ? 'border-transparent bg-transparent text-white'
    : 'border-transparent bg-transparent text-[var(--project-color)] hover:border-[var(--project-color)] hover:bg-[var(--project-color)] hover:text-white focus:border-[var(--project-color)] focus:bg-[var(--project-color)] focus:text-white focus-visible:border-[var(--project-color)] focus-visible:bg-[var(--project-color)] focus-visible:text-white';
  const tooltipPositionClass =
    side === 'left'
      ? 'left-full ml-3 -translate-x-1 group-hover/nav-tooltip:translate-x-0 group-focus-within/nav-tooltip:translate-x-0'
      : 'right-full mr-3 translate-x-1 group-hover/nav-tooltip:translate-x-0 group-focus-within/nav-tooltip:translate-x-0';

  return (
    <div
      className={`group/nav-tooltip relative z-10 grid size-12 place-items-center transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
        concealed
          ? 'pointer-events-none scale-90 opacity-0'
          : 'scale-100 opacity-100'
      }`}
      aria-hidden={concealed ? true : undefined}
      style={
        {
          '--project-color': projectColor,
        } as ProjectColorStyle
      }
    >
      <SquareIconButton
        icon={icon}
        iconClassName="size-7"
        className={`grid place-items-center transition-[background-color,border-color,border-radius,border-width,color,padding] duration-500 ease-out ${buttonPaddingClass} ${buttonSurfaceClass}`}
        aria-label={label}
        aria-describedby={tooltipId}
        tabIndex={concealed ? -1 : undefined}
        onClick={onClick}
      />
      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute top-1/2 z-30 whitespace-nowrap bg-black px-3 py-2 text-[0.6875rem] font-black uppercase leading-none tracking-[0.24em] text-[var(--project-color)] opacity-0 transition-[opacity,transform] duration-150 ease-out -translate-y-1/2 group-hover/nav-tooltip:opacity-100 group-focus-within/nav-tooltip:opacity-100 ${tooltipPositionClass}`}
      >
        {tooltipTitle}
      </span>
    </div>
  );
}

function SquareIconButton({
  icon,
  iconClassName,
  className,
  ...buttonProps
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: IconProp;
  iconClassName: string;
}) {
  return (
    <button
      type="button"
      className={`grid place-items-center outline-none ${className ?? ''}`}
      {...buttonProps}
    >
      <FontAwesomeIcon
        icon={icon}
        className={`${iconClassName} drop-shadow-[1px_1px_0_black]`}
        aria-hidden="true"
      />
    </button>
  );
}

function ArrowUpToLineIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 4h14" />
      <path d="M12 20V8" />
      <path d="m6 14 6-6 6 6" />
    </svg>
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
  const [isBackdropVisible, setIsBackdropVisible] = useState(false);
  const [carouselTransition, setCarouselTransition] = useState(() => ({
    activeIndex: boundedActiveScreenshotIndex,
    itemCount: carouselCount,
    isBoundary: false,
  }));
  const renderedCarouselIndex = getCanonicalRenderedCarouselIndex(
    boundedActiveScreenshotIndex,
    carouselCount
  );

  if (
    carouselTransition.activeIndex !== boundedActiveScreenshotIndex ||
    carouselTransition.itemCount !== carouselCount
  ) {
    setCarouselTransition({
      activeIndex: boundedActiveScreenshotIndex,
      itemCount: carouselCount,
      isBoundary: isCarouselBoundaryJump(
        carouselTransition.activeIndex,
        boundedActiveScreenshotIndex,
        carouselCount
      ),
    });
  }

  const imageFrameRef = useRef<HTMLDivElement>(null);
  const liveOffsetRef = useRef(offset);
  const liveScaleRef = useRef(scale);
  const animationFrameRef = useRef<number | null>(null);
  const transitionFrameRef = useRef<number | null>(null);
  const transitionFallbackTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const hasPlayedEnterTransitionRef = useRef(false);
  const transitionPhaseRef = useRef<'idle' | 'entering' | 'exiting'>('idle');
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
  const finishImageTransition = useCallback(
    (imageFrame: HTMLDivElement) => {
      if (transitionFallbackTimeoutRef.current) {
        clearTimeout(transitionFallbackTimeoutRef.current);
        transitionFallbackTimeoutRef.current = null;
      }

      if (transitionPhaseRef.current === 'exiting') {
        onExited();
        return;
      }

      transitionPhaseRef.current = 'idle';
      clearFrameRect(imageFrame);
      imageFrame.style.transition = 'transform 160ms ease-out';
      imageFrame.style.opacity = '1';
      setIsTransitioning(false);
      applyLiveTransform();
    },
    [applyLiveTransform, onExited]
  );

  useEffect(() => {
    const rafId = requestAnimationFrame(() => setIsBackdropVisible(true));

    return () => cancelAnimationFrame(rafId);
  }, []);

  useLayoutEffect(() => {
    liveOffsetRef.current = offset;
    liveScaleRef.current = scale;

    if (transitionPhaseRef.current !== 'idle') {
      return;
    }

    if (
      transitionRect &&
      !isClosing &&
      !hasPlayedEnterTransitionRef.current &&
      imageFrameRef.current
    ) {
      const imageFrame = imageFrameRef.current;
      const targetRect = getModalFrameRect();

      hasPlayedEnterTransitionRef.current = true;

      if (
        prefersReducedMotion() ||
        targetRect.width <= 0 ||
        targetRect.height <= 0
      ) {
        setIsTransitioning(false);
        applyLiveTransform();
        return;
      }

      transitionPhaseRef.current = 'entering';
      setIsTransitioning(true);
      imageFrame.style.transition = 'none';
      imageFrame.style.transform = transformFor({ x: 0, y: 0 }, 1);
      imageFrame.style.opacity = '0.98';
      applyFrameRect(imageFrame, transitionRect);

      transitionFrameRef.current = requestAnimationFrame(() => {
        transitionFrameRef.current = requestAnimationFrame(() => {
          transitionFrameRef.current = null;
          imageFrame.style.transition =
            'left 420ms cubic-bezier(0.19, 1, 0.22, 1), top 420ms cubic-bezier(0.19, 1, 0.22, 1), width 420ms cubic-bezier(0.19, 1, 0.22, 1), height 420ms cubic-bezier(0.19, 1, 0.22, 1), opacity 220ms ease-out';
          applyFrameRect(imageFrame, targetRect);
          imageFrame.style.transform = transformFor({ x: 0, y: 0 }, 1);
          imageFrame.style.opacity = '1';
        });
      });
      transitionFallbackTimeoutRef.current = setTimeout(() => {
        if (transitionPhaseRef.current === 'entering') {
          finishImageTransition(imageFrame);
        }
      }, 520);

      return;
    }

    applyLiveTransform();
  }, [
    applyLiveTransform,
    finishImageTransition,
    isClosing,
    offset,
    prefersReducedMotion,
    scale,
    transformFor,
    transitionRect,
  ]);

  useEffect(() => {
    if (!isClosing) {
      return;
    }

    const imageFrame = imageFrameRef.current;

    if (!imageFrame || !transitionRect || prefersReducedMotion()) {
      onExited();
      return;
    }

    const targetRect = getModalFrameRect();

    if (targetRect.width <= 0 || targetRect.height <= 0) {
      onExited();
      return;
    }

    dragRef.current.dragging = false;
    pinchRef.current = null;
    setIsDragging(false);
    setIsTransitioning(true);
    setIsBackdropVisible(false);
    transitionPhaseRef.current = 'exiting';
    imageFrame.style.transition = 'none';
    applyFrameRect(imageFrame, targetRect);
    imageFrame.style.transform = transformFor(liveOffsetRef.current, liveScaleRef.current);
    imageFrame.style.opacity = '1';
    transitionFrameRef.current = requestAnimationFrame(() => {
      transitionFrameRef.current = requestAnimationFrame(() => {
        transitionFrameRef.current = null;
        imageFrame.style.transition =
          'left 340ms cubic-bezier(0.4, 0, 1, 1), top 340ms cubic-bezier(0.4, 0, 1, 1), width 340ms cubic-bezier(0.4, 0, 1, 1), height 340ms cubic-bezier(0.4, 0, 1, 1), transform 240ms ease-in, opacity 220ms ease-in';
        applyFrameRect(imageFrame, transitionRect);
        imageFrame.style.transform = transformFor({ x: 0, y: 0 }, 1);
        imageFrame.style.opacity = '0.96';
      });
    });
    transitionFallbackTimeoutRef.current = setTimeout(onExited, 420);
  }, [
    dragRef,
    isClosing,
    onExited,
    pinchRef,
    prefersReducedMotion,
    transitionRect,
    transformFor,
  ]);

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (transitionFrameRef.current !== null) {
        cancelAnimationFrame(transitionFrameRef.current);
      }

      if (transitionFallbackTimeoutRef.current) {
        clearTimeout(transitionFallbackTimeoutRef.current);
      }
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

  const getTouchDistance = (event: ReactTouchEvent<HTMLDialogElement>) => {
    const [first, second] = Array.from(event.touches);
    return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
  };

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
  const handleImageFrameTransitionEnd = useCallback(
    (event: ReactTransitionEvent<HTMLDivElement>) => {
      if (
        event.target !== event.currentTarget ||
        event.propertyName !== 'width'
      ) {
        return;
      }

      finishImageTransition(event.currentTarget);
    },
    [finishImageTransition]
  );
  return (
    <dialog
      open
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
        className={`fixed inset-0 bg-black transition-opacity duration-[420ms] ease-out motion-reduce:transition-none ${
          isBackdropVisible && !isClosing ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      />
      <SquareIconButton
        icon={faXmark}
        iconClassName="size-5"
        data-portfolio-modal-close
        className={`fixed right-5 top-5 z-20 size-11 translate-y-0 bg-[var(--project-color)] text-white transition-[opacity,rotate,scale,translate] duration-300 [transition-timing-function:cubic-bezier(0.19,1,0.22,1)] hover:scale-105 focus-visible:scale-105 motion-reduce:translate-x-0 motion-reduce:rotate-0 motion-reduce:transition-opacity motion-reduce:duration-150 ${
          isClosing
            ? 'pointer-events-none translate-x-16 rotate-90 opacity-0'
            : isBackdropVisible
              ? 'translate-x-0 rotate-0 opacity-100'
              : 'translate-x-16 rotate-90 opacity-0'
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
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
          transition: isTransitioning
            ? undefined
            : dragRef.current.dragging
              ? 'none'
              : 'transform 160ms ease-out',
          willChange: isTransitioning
            ? 'left, top, width, height, transform'
            : 'transform',
        }}
        onTransitionEnd={handleImageFrameTransitionEnd}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div
            data-portfolio-modal-carousel-track
            className={`flex h-full transition-transform ease-out motion-reduce:transition-none ${
              carouselTransition.isBoundary ? 'duration-1000' : 'duration-500'
            }`}
            style={{
              transform: getCarouselTrackTransform(renderedCarouselIndex),
              willChange: carouselCount > 1 ? 'transform' : undefined,
            }}
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
