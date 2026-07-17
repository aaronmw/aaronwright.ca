'use client';

import {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  startTransition,
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { gsap } from 'gsap';
import {
  faArrowUp,
  faRotateRight,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import {
  PortfolioProject,
  PortfolioScreenshot,
  portfolioSlides,
} from '@/lib/portfolio';
import {
  NAVIGATION_TRAVEL_EASE,
  getCanonicalCarouselEntries,
  getCarouselPosition,
  getCarouselTargetScrollLeft,
  getLoopingCarouselEntries,
  getNavigationTravelDuration,
  isCarouselBoundaryJump,
  positiveModulo,
} from '@/components/portfolio/domain/carousel';
import {
  pageTitle,
  parsePortfolioRoute,
  projectUrl,
  slideNavigationTitle,
} from '@/components/portfolio/domain/routing';
import {
  carouselMediaKey,
  getInitialSlideIndexes,
  getProjectMediaScreenshots,
  getProjectSlidesBySlug,
  getSlideMediaKey,
  getVerticalTargetProjectIndex,
  hasBuildingWithAiTextSlide,
  isBuildingWithAiTextScreenshot,
  isBuildingWithAiTextSlide,
  isModalScreenshotSlide,
  modalMediaKey,
  type ProjectSlide,
} from '@/components/portfolio/domain/slides';
import {
  TOP_SCREEN_COLOR,
  buildProjectColors,
  getProjectColor as getThemeProjectColor,
} from '@/components/portfolio/domain/theme';
import { usePortfolioMediaReadiness } from '@/components/portfolio/usePortfolioMediaReadiness';
import {
  INLINE_MEDIA_RESET_EVENT,
  INLINE_MEDIA_ZOOM_IN_EVENT,
} from '@/components/portfolio/useInlineMediaZoom';
import {
  SlideIndicatorMotionController,
  SlideNavigation,
} from '@/components/portfolio/navigation/SlideNavigation';
import {
  SectionNavigation,
  SectionNavigationHandle,
} from '@/components/portfolio/navigation/SectionNavigation';
import {
  CircularIconButton,
  PortfolioHelperMessage,
  type PortfolioHelperMessageKind,
} from '@/components/portfolio/presentation/PortfolioControls';
import {
  CarouselPullBoundary,
  ProjectPanel,
} from '@/components/portfolio/presentation/PortfolioMedia';
import {
  ImageModal,
  type ModalTransitionRect,
} from '@/components/portfolio/presentation/ImageModal';
import { PortfolioStartScreen } from '@/components/portfolio/presentation/PortfolioStartScreen';
import { ProjectDescription } from '@/components/portfolio/presentation/PortfolioText';

type PortfolioBrowserProps = {
  initialProjectSlug?: string;
  initialScreenshotSlug?: string;
  initialModalOpen?: boolean;
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
const NAVIGATION_INDICATOR_STEP_REM = 2.25;
const NAVIGATION_RING_SIZE_REM = 2.75;
const MOBILE_SLIDE_NAV_CONTROL_CLEARANCE_REM = 6.25;
const PROJECT_COLORS = buildProjectColors(portfolioSlides.length);
const SECTION_NAV_HAS_SLIDES = [
  false,
  ...portfolioSlides.map((project) => project.screenshots.length > 1),
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

type HorizontalScrollOptions = {
  syncIndicator?: boolean;
  boundarySourceIndex?: number;
};

function getProjectColor(projectIndex: number) {
  return getThemeProjectColor(PROJECT_COLORS, projectIndex);
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
    () => getProjectSlidesBySlug(portfolioSlides),
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
      getInitialSlideIndexes(
        portfolioSlides,
        initialProjectSlug,
        initialScreenshotSlug,
      ),
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
    inlineZoomedScreenshotId !== null;
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
    const vertical = verticalRef.current;

    vertical?.style.removeProperty('scroll-snap-type');
    vertical?.removeAttribute('data-portfolio-programmatic-scroll');
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
    return parsePortfolioRoute(
      pathname,
      search,
      portfolioSlides,
      projectSlides,
    );
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
          vertical.setAttribute('data-portfolio-programmatic-scroll', 'true');
          const tween = gsap.to(vertical, {
            scrollTop: targetScrollTop,
            duration: getNavigationTravelDuration(distanceInScreens),
            ease: NAVIGATION_TRAVEL_EASE,
            overwrite: 'auto',
            onUpdate: () =>
              sectionNavigationControllerRef.current?.syncSourcePosition(),
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
        getVerticalTargetProjectIndex(
          activeProjectIndex,
          direction,
          portfolioSlides.length,
        ),
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
        portfolioSlides.length,
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
        <PortfolioStartScreen
          projects={portfolioSlides}
          pendingProjectIndex={
            pendingNavigation?.kind === 'project'
              ? pendingNavigation.projectIndex
              : null
          }
          isTouchInput={isTouchInput}
          isWideLayout={isWideLayout}
          isTouchLandscapeLayout={isTouchLandscapeLayout}
          getProjectColor={getProjectColor}
          setTitleRef={(index, node) => {
            sectionMenuTitleRefs.current[index] = node;
          }}
          onHoveredChange={setSectionNavHovered}
          onPreview={(index, previewing) => {
            sectionNavigationControllerRef.current?.preview(
              index + 1,
              previewing,
            );
          }}
          onSelect={(index, keyboardTriggered) => {
            focusKeyboardSurface();
            sectionNavigationControllerRef.current?.pin(
              index + 1,
              'vertical',
              keyboardTriggered,
            );
            setActiveProject(index, 'push', 'smooth', 0);
          }}
        />

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
                    reserveSectionNavigationGutter={
                      isTouchInput && !isWideLayout
                    }
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

      {isWideLayout || isTouchInput ? (
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
          geometryMode={isTouchInput ? 'centered' : 'title-linked'}
          hideRightRail={isTouchInput}
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
            bottom: 'max(2rem, env(safe-area-inset-bottom, 0px))',
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
        <div
          className={`pointer-events-auto absolute right-5 top-0 grid h-[52px] w-11 place-items-center transition-opacity duration-300 ease-out ${
            activeProjectIndex === START_SCREEN_INDEX
              ? 'pointer-events-none opacity-0'
              : 'opacity-100'
          }`}
          style={{
            right: 'max(1.25rem, env(safe-area-inset-right, 0px))',
          }}
        >
          <CircularIconButton
            icon={faArrowUp}
            iconClassName="size-7"
            ring
            className="relative size-11 bg-transparent text-[var(--project-color)]"
            aria-label="Back to top"
            onClick={() => {
              focusKeyboardSurface();
              setActiveProject(START_SCREEN_INDEX, 'push');
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
            position: 'fixed',
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
          projectColor={activeProjectColor ?? getProjectColor(0)}
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
