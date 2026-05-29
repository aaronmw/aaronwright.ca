'use client';

import {
  AnchorHTMLAttributes,
  CSSProperties,
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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowDown,
  faArrowLeft,
  faArrowRight,
  faArrowUp,
  faFilePdf,
} from '@fortawesome/free-solid-svg-icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  PortfolioProject,
  PortfolioScreenshot,
  portfolioSlides,
} from '@/lib/portfolio';

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
const WIDE_LAYOUT_STYLE: WideLayoutStyle = {
  '--portfolio-description-rail-width':
    'min(calc(100vw - 4rem), calc(7rem + max(32rem, 48ch)))',
  '--portfolio-control-gutter-width': '6rem',
  '--portfolio-screenshot-size':
    'min(100dvh, calc(100vw - var(--portfolio-description-rail-width) - var(--portfolio-control-gutter-width)))',
};
const NAVIGATION_SQUARE_CLASS =
  'block size-[1.3125rem] border border-current transition-colors';
const TOP_SCREEN_COLOR = 'hsl(0 0% 100%)';
const PROJECT_COLORS = [
  'hsl(342 78% 52%)',
  'hsl(88 74% 44%)',
  'hsl(192 82% 48%)',
];

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
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
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

function slideNavigationTitle(project: PortfolioProject, slide: ProjectSlide) {
  if (slide.kind === 'description') {
    return project.title;
  }

  return slide.screenshot.alt;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest('input, textarea, select, button, a, [contenteditable="true"]')
  );
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
  const shouldShowModal = isModalOpen && Boolean(activeScreenshot);
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

      return slides.filter((slide) => slide.kind === 'screenshot');
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

      carousel.scrollTo({
        left:
          carousel.clientWidth *
          (getCarouselIndexFromSlideIndex(project, slideIndex) + 1),
        behavior,
      });
    },
    [getCarouselIndexFromSlideIndex]
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

    const modalOpen =
      new URLSearchParams(search).get('modal') === 'image' &&
      slides[slideIndex].kind === 'screenshot';

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

      scrollHorizontalToRealIndex(project, nextIndex, scrollBehavior);
      updateUrl(project, nextSlide, mode);
    },
    [projectSlides, resetDescriptionScroll, scrollHorizontalToRealIndex, updateUrl]
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

  const moveVertical = useCallback(
    (direction: -1 | 1) => {
      setActiveProject(
        getVerticalTargetProjectIndex(activeProjectIndex, direction),
        'push'
      );
    },
    [activeProjectIndex, setActiveProject]
  );

  const openModal = useCallback((slide: ProjectSlide = activeSlide) => {
    if (!activeProject || !slide || slide.kind !== 'screenshot') {
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
    resetModalView();
    window.history.pushState({}, '', `${projectUrl(activeProject, slide)}?modal=image`);
    document.title = pageTitle(activeProject, slide);
    modalHistoryEntryRef.current = true;
    setIsModalOpen(true);
  }, [activeProject, activeProjectIndex, activeSlide, projectSlides, resetModalView]);

  const closeModal = useCallback(() => {
    resetModalView();
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

  const syncInitialScrollEvent = useEffectEvent(() => {
    syncViewport(normalizedInitialProjectIndex, initialSlideIndexes, 'auto');

    if (
      window.location.search.includes('modal=image') &&
      normalizedInitialProjectIndex >= 0 &&
      (initialSlideIndexes[normalizedInitialProjectIndex] ?? 0) > 0
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
      const realIndex = positiveModulo(clonedIndex - 1, slides.length);
      const nextSlideIndex = getSlideIndexFromCarouselIndex(project, realIndex);

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
      let realIndex = clonedIndex - 1;

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

      const nextIndex = positiveModulo(realIndex, slides.length);
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
        updateUrl(project, nextSlide, 'replace');
      }
    }
  );

  const handleKeyDownEvent = useEffectEvent((event: KeyboardEvent) => {
    if (isModalOpen) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
      }

      return;
    }

    if (isEditableTarget(event.target)) {
      return;
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

  const activeCarouselSlides = activeProject ? getCarouselSlides(activeProject) : [];
  const canMoveHorizontally = (activeProject?.screenshots.length ?? 0) > 1;
  const activeCarouselIndex = activeProject
    ? getCarouselIndexFromSlideIndex(activeProject, activeSlideIndex)
    : 0;
  const previousSlide = activeProject
    ? activeCarouselSlides[
        positiveModulo(activeCarouselIndex - 1, activeCarouselSlides.length)
      ]
    : undefined;
  const nextSlide = activeProject
    ? activeCarouselSlides[
        positiveModulo(activeCarouselIndex + 1, activeCarouselSlides.length)
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
        label={label}
        tooltipTitle={tooltipTitle}
        tooltipId={tooltipId}
        side={side}
        color={item.color}
        activeButton={isActiveSection}
        compactActiveButton={isActiveSection && !hasHorizontalAction}
        onClick={() => {
          focusKeyboardSurface();

          if (hasHorizontalAction) {
            moveHorizontal(isLeftSide ? -1 : 1);
            return;
          }

          if (!isActiveSection) {
            setActiveProject(item.projectIndex, 'push');
          }
        }}
      >
        {isActiveSection && !hasHorizontalAction ? (
          <span className="block size-7" aria-hidden="true" />
        ) : (
          <span className="grid size-7 place-items-center" aria-hidden="true">
            <FontAwesomeIcon
              icon={Icon}
              className="size-7 drop-shadow-[1px_1px_0_black]"
            />
          </span>
        )}
      </SideNavButton>
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
                    href="mailto:aaronmw@gmail.com"
                  >
                    aaronmw@gmail.com
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
            <p className="mb-8 text-xs font-light uppercase tracking-[0.35em] text-white/45">
              Work
            </p>
            <div className="divide-y divide-white/15 border-y border-white/15">
              {portfolioSlides.map((project, index) => (
                <button
                  key={project.id}
                  type="button"
                  className="flex min-h-24 w-full items-center justify-between gap-6 py-6 text-left text-white outline-none transition-colors hover:text-[var(--project-color)] focus-visible:text-[var(--project-color)] sm:min-h-28"
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
                  <span
                    className="text-[clamp(2rem,8vw,6.4rem)] font-black uppercase leading-none tracking-normal"
                    style={{ color: getProjectColor(index) }}
                  >
                    {project.title}
                  </span>
                  <span className="text-sm font-light text-current sm:text-base">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {portfolioSlides.map((project, projectIndex) => {
          const slides = getCarouselSlides(project);
          const renderedSlides = [slides[slides.length - 1], ...slides, slides[0]];
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
              <ProjectDescription
                project={project}
                projectNumber={projectNumber}
                projectColor={getProjectColor(projectIndex)}
                setDescriptionRef={setDescriptionRef(project.slug)}
                isWideLayout={isWideLayout}
                className={
                  isWideLayout
                    ? 'absolute bottom-10 left-0 top-10 z-10 block w-[var(--portfolio-description-rail-width)] overflow-y-auto bg-black/80 py-6 pl-[var(--portfolio-control-gutter-width)] pr-6 backdrop-blur-md'
                    : 'hidden'
                }
              />
              <div
                ref={setHorizontalRef(project.slug)}
                className={`flex h-dvh snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain portfolio-scrollbar-none ${
                  isWideLayout ? 'w-screen' : ''
                }`}
              >
                {renderedSlides.map((slide, renderedIndex) => (
                  <ProjectPanel
                    key={`${project.id}-${slide.id}-${renderedIndex}`}
                    project={project}
                    projectNumber={projectNumber}
                    projectColor={getProjectColor(projectIndex)}
                    slide={slide}
                    isWideLayout={isWideLayout}
                    isActive={
                      activeProjectIndex === projectIndex &&
                      activeCarouselIndex ===
                        positiveModulo(renderedIndex - 1, slides.length)
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
          <div className="fixed left-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-3 sm:left-6">
            {sectionNavItems.map((item) => renderSectionNavButton(item, 'left'))}
          </div>
          <div className="fixed right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-3 sm:right-6">
            {sectionNavItems.map((item) => renderSectionNavButton(item, 'right'))}
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

      {activeProject && activeCarouselSlides.length > 1 ? (
        <>
          <nav
            className="pointer-events-none fixed inset-x-0 bottom-5 z-20 flex justify-center px-6"
            aria-label={`${activeProject.title} screens`}
            style={
              {
                '--project-color': activeProjectColor ?? getProjectColor(0),
              } as ProjectColorStyle
            }
          >
            <div className="flex items-center gap-3 px-4 py-3">
              {activeCarouselSlides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  className={`pointer-events-auto grid size-7 place-items-center outline-none transition-colors hover:text-[var(--project-color)] focus-visible:text-[var(--project-color)] ${
                    getCarouselIndexFromSlideIndex(
                      activeProject,
                      activeSlideIndex
                    ) === index
                      ? 'text-[var(--project-color)]'
                      : 'text-white'
                  }`}
                  aria-label={
                    slide.kind === 'description'
                      ? `Show ${activeProject.title} description`
                      : `Show ${slide.screenshot.alt}`
                  }
                  aria-current={
                    getCarouselIndexFromSlideIndex(activeProject, activeSlideIndex) ===
                    index
                      ? 'true'
                      : undefined
                  }
                  onClick={() => {
                    focusKeyboardSurface();
                    setActiveSlide(
                      activeProjectIndex,
                      getSlideIndexFromCarouselIndex(activeProject, index),
                      'push',
                      'smooth'
                    );
                  }}
                >
                  <span
                    className={`${NAVIGATION_SQUARE_CLASS} ${
                      getCarouselIndexFromSlideIndex(
                        activeProject,
                        activeSlideIndex
                      ) === index
                        ? 'bg-current'
                        : 'bg-transparent'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          </nav>
        </>
      ) : null}

      {shouldShowModal && activeProject && activeScreenshot ? (
        <ImageModal
          project={activeProject}
          projectColor={activeProjectColor}
          screenshot={activeScreenshot}
          scale={modalScale}
          offset={modalOffset}
          dragRef={modalDragRef}
          pinchRef={pinchRef}
          setScale={setModalScale}
          setOffset={setModalOffset}
          onClose={closeModal}
        />
      ) : null}
    </main>
  );
}

function SideNavButton({
  label,
  tooltipTitle,
  tooltipId,
  side,
  color,
  activeButton = false,
  compactActiveButton = false,
  onClick,
  children,
}: {
  label: string;
  tooltipTitle: string;
  tooltipId: string;
  side: 'left' | 'right';
  color?: string;
  activeButton?: boolean;
  compactActiveButton?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const projectColor = color ?? PROJECT_COLORS[0];
  const buttonPaddingClass = compactActiveButton
    ? 'rounded-full border-4 p-0'
    : activeButton
      ? 'border-4 p-1.5'
      : 'border-0 p-1 hover:border-4 hover:p-1.5 focus:border-4 focus:p-1.5 focus-visible:border-4 focus-visible:p-1.5';
  const buttonSurfaceClass = activeButton
    ? 'border-[var(--project-color)] bg-[var(--project-color)] text-white'
    : 'border-transparent bg-transparent text-[var(--project-color)] hover:border-[var(--project-color)] hover:bg-[var(--project-color)] hover:text-white focus:border-[var(--project-color)] focus:bg-[var(--project-color)] focus:text-white focus-visible:border-[var(--project-color)] focus-visible:bg-[var(--project-color)] focus-visible:text-white';
  const tooltipPositionClass =
    side === 'left'
      ? 'left-full ml-3 -translate-x-1 group-hover/nav-tooltip:translate-x-0 group-focus-within/nav-tooltip:translate-x-0'
      : 'right-full mr-3 translate-x-1 group-hover/nav-tooltip:translate-x-0 group-focus-within/nav-tooltip:translate-x-0';

  return (
    <div
      className="group/nav-tooltip relative grid size-12 place-items-center"
      style={
        {
          '--project-color': projectColor,
        } as ProjectColorStyle
      }
    >
      <button
        type="button"
        className={`grid place-items-center transition-[background-color,border-color,border-radius,border-width,color,padding] duration-500 ease-out ${buttonPaddingClass} ${buttonSurfaceClass}`}
        aria-label={label}
        aria-describedby={tooltipId}
        onClick={onClick}
      >
        {children}
      </button>
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
      ref={setDescriptionRef}
      className={`portfolio-scrollbar-none min-h-0 pr-1 ${className ?? ''}`}
      style={
        {
          '--project-color': projectColor,
        } as ProjectColorStyle
      }
    >
      <p className="mb-5 text-xs font-light uppercase tracking-[0.35em] text-white/45">
        PROJECT {projectNumber}
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
      <div
        className={`portfolio-markdown w-full max-w-[48ch] font-light leading-relaxed text-white/82 ${
          isWideLayout ? 'min-w-[32rem] text-xl' : 'text-lg'
        }`}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: MarkdownLink,
          }}
        >
          {project.descriptionMarkdown}
        </ReactMarkdown>
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
  onScreenshotClick: (slide: ProjectSlide) => void;
}) {
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
        className={`overflow-y-auto ${
          !isWideLayout && slide.kind === 'description'
            ? 'block'
            : 'hidden'
        }`}
      />

      <div
        className={`grid min-h-0 place-items-center ${
          isWideLayout
            ? 'grid-cols-[minmax(var(--portfolio-description-rail-width),1fr)_auto_var(--portfolio-control-gutter-width)]'
            : ''
        } ${
          slide.kind === 'description' ? 'hidden' : ''
        }`}
      >
        {slide.kind === 'description' ? (
          <div className="grid aspect-square max-h-[calc(100dvh-5rem)] w-full max-w-[calc(100dvh-5rem)] place-items-center border border-white/15 text-center">
            <span className="px-8 text-5xl font-black uppercase leading-none text-white/12">
              {project.title}
            </span>
          </div>
        ) : (
          <button
            type="button"
            className={`relative overflow-hidden border border-transparent outline-none transition-colors hover:border-[var(--project-color)] focus-visible:border-[var(--project-color)] ${
              isWideLayout
                ? 'col-start-2 aspect-square h-[var(--portfolio-screenshot-size)] max-h-none w-[var(--portfolio-screenshot-size)] max-w-none self-center justify-self-end'
                : 'h-full min-h-0 w-full'
            }`}
            onClick={() => onScreenshotClick(slide)}
            aria-label={`Open ${slide.screenshot.alt} fullscreen`}
          >
            <ScreenshotMedia
              screenshot={slide.screenshot}
              priority={isActive}
              sizes="(min-aspect-ratio: 5/4) calc(100dvh - 8rem), 100vw"
              className={`object-contain transition-[filter] duration-1000 ease-in-out ${
                isActive ? 'blur-0' : 'blur-[20px]'
              }`}
            />
          </button>
        )}
      </div>
    </article>
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
  scale,
  offset,
  dragRef,
  pinchRef,
  setScale,
  setOffset,
  onClose,
}: {
  project: PortfolioProject;
  projectColor?: string;
  screenshot: PortfolioScreenshot;
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
}) {
  const [isDragging, setIsDragging] = useState(false);
  const clampScale = useCallback((nextScale: number) => {
    return Math.min(6, Math.max(1, nextScale));
  }, []);

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLDialogElement>) => {
      event.preventDefault();
      setScale((current) => clampScale(current + event.deltaY * -0.002));
    },
    [clampScale, setScale]
  );

  const handleDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLDialogElement>) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
      dragRef.current.dragging = false;
      pinchRef.current = null;
      setIsDragging(false);
      setScale(1);
      setOffset({ x: 0, y: 0 });
    },
    [dragRef, pinchRef, setOffset, setScale]
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDialogElement>) => {
      if (scale <= 1 || isEditableTarget(event.target)) {
        return;
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
        originX: offset.x,
        originY: offset.y,
        dragging: true,
      };
    },
    [dragRef, offset, scale]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDialogElement>) => {
      const drag = dragRef.current;

      if (!drag.dragging || drag.pointerId !== event.pointerId) {
        return;
      }

      setOffset({
        x: drag.originX + event.clientX - drag.startX,
        y: drag.originY + event.clientY - drag.startY,
      });
    },
    [dragRef, setOffset]
  );

  const stopPointerDrag = useCallback(
    (event: ReactPointerEvent<HTMLDialogElement>) => {
      if (dragRef.current.pointerId === event.pointerId) {
        dragRef.current.dragging = false;
        setIsDragging(false);
      }
    },
    [dragRef]
  );

  const getTouchDistance = (event: ReactTouchEvent<HTMLDialogElement>) => {
    const [first, second] = Array.from(event.touches);
    return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
  };

  const handleTouchStart = useCallback(
    (event: ReactTouchEvent<HTMLDialogElement>) => {
      if (event.touches.length === 2) {
        pinchRef.current = {
          distance: getTouchDistance(event),
          scale,
        };
      }
    },
    [pinchRef, scale]
  );

  const handleTouchMove = useCallback(
    (event: ReactTouchEvent<HTMLDialogElement>) => {
      if (event.touches.length !== 2 || !pinchRef.current) {
        return;
      }

      event.preventDefault();
      const nextDistance = getTouchDistance(event);
      setScale(clampScale((nextDistance / pinchRef.current.distance) * pinchRef.current.scale));
    },
    [clampScale, pinchRef, setScale]
  );

  const handleTouchEnd = useCallback(() => {
    pinchRef.current = null;
  }, [pinchRef]);

  const panCursorClass =
    scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : '';

  return (
    <dialog
      open
      className={`fixed inset-0 z-50 m-0 grid h-dvh max-h-none w-screen max-w-none touch-none place-items-center overflow-hidden border-0 bg-black p-0 ${panCursorClass}`}
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
      <button
        type="button"
        className="fixed right-5 top-5 z-10 h-11 min-w-11 bg-[var(--project-color)] px-4 text-sm font-black uppercase text-white outline-none transition-transform hover:scale-105 focus-visible:scale-105"
        style={
          {
            '--project-color': projectColor ?? PROJECT_COLORS[0],
          } as ProjectColorStyle
        }
        onClick={onClose}
      >
        Close
      </button>
      <div
        className={`relative h-[92dvh] w-[92vw] ${panCursorClass}`}
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
          transition: dragRef.current.dragging ? 'none' : 'transform 160ms ease-out',
        }}
      >
        <ScreenshotMedia
          screenshot={screenshot}
          priority
          sizes="92vw"
          className="object-contain"
        />
      </div>
    </dialog>
  );
}
