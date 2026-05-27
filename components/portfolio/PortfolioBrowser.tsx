'use client';

import {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  TouchEvent as ReactTouchEvent,
  WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCaretLeft,
  faCaretRight,
  faSquare as faSolidSquare,
} from '@fortawesome/free-solid-svg-icons';
import { faSquare as faRegularSquare } from '@fortawesome/free-regular-svg-icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  PortfolioProject,
  PortfolioScreenshot,
  portfolioProjects,
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

function positiveModulo(value: number, length: number) {
  return ((value % length) + length) % length;
}

function projectUrl(project: PortfolioProject, slide: ProjectSlide) {
  if (slide.kind === 'description') {
    return `/projects/${project.slug}`;
  }

  return `/projects/${project.slug}/${slide.slug}`;
}

function pageTitle(project?: PortfolioProject, slide?: ProjectSlide) {
  if (!project || !slide) {
    return 'Projects | Aaron M. Wright';
  }

  if (slide.kind === 'description') {
    return `${project.title} | Aaron M. Wright`;
  }

  return `${project.title}: ${slide.slug} | Aaron M. Wright`;
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

export function PortfolioBrowser({
  initialProjectSlug,
  initialScreenshotSlug,
}: PortfolioBrowserProps) {
  const verticalRef = useRef<HTMLDivElement>(null);
  const horizontalRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const descriptionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const userMovedRef = useRef(false);
  const scrollSyncRef = useRef(false);
  const modalHistoryEntryRef = useRef(false);

  const projectSlides = useMemo(
    () =>
      Object.fromEntries(
        portfolioProjects.map((project) => [project.slug, getProjectSlides(project)])
      ) as Record<string, ProjectSlide[]>,
    []
  );

  const initialProjectIndex = initialProjectSlug
    ? portfolioProjects.findIndex((project) => project.slug === initialProjectSlug)
    : START_SCREEN_INDEX;
  const normalizedInitialProjectIndex =
    initialProjectIndex >= 0 ? initialProjectIndex : START_SCREEN_INDEX;

  const initialSlideIndexes = useMemo(
    () =>
      portfolioProjects.map((project) => {
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
    activeProjectIndex >= 0 ? portfolioProjects[activeProjectIndex] : undefined;
  const activeSlides = activeProject ? projectSlides[activeProject.slug] : [];
  const activeSlideIndex =
    activeProjectIndex >= 0 ? activeSlideIndexes[activeProjectIndex] : 0;
  const activeSlide = activeSlides[activeSlideIndex];
  const activeScreenshot =
    activeSlide?.kind === 'screenshot' ? activeSlide.screenshot : undefined;
  const shouldShowModal = isModalOpen && Boolean(activeScreenshot);

  const resetDescriptionScroll = useCallback((project: PortfolioProject) => {
    descriptionRefs.current[project.slug]?.scrollTo({ top: 0 });
  }, []);

  const setHorizontalRef = useCallback(
    (projectSlug: string) => (node: HTMLDivElement | null) => {
      horizontalRefs.current[projectSlug] = node;
    },
    []
  );

  const setDescriptionRef = useCallback(
    (projectSlug: string) => (node: HTMLDivElement | null) => {
      descriptionRefs.current[projectSlug] = node;
    },
    []
  );

  const scrollHorizontalToRealIndex = useCallback(
    (project: PortfolioProject, realIndex: number, behavior: ScrollBehavior) => {
      const carousel = horizontalRefs.current[project.slug];

      if (!carousel) {
        return;
      }

      carousel.scrollTo({
        left: carousel.clientWidth * (realIndex + 1),
        behavior,
      });
    },
    []
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

      portfolioProjects.forEach((project, currentProjectIndex) => {
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

    if (segments[0] !== 'projects') {
      return null;
    }

    if (segments.length === 1) {
      return {
        projectIndex: START_SCREEN_INDEX,
        slideIndex: 0,
        modalOpen: false,
      };
    }

    const projectIndex = portfolioProjects.findIndex(
      (project) => project.slug === segments[1]
    );

    if (projectIndex < 0) {
      return null;
    }

    const project = portfolioProjects[projectIndex];
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

      const nextSlideIndexes = portfolioProjects.map((_, projectIndex) =>
        projectIndex === locationState.projectIndex
          ? locationState.slideIndex
          : activeSlideIndexes[projectIndex] ?? 0
      );

      setActiveProjectIndex(locationState.projectIndex);
      setActiveSlideIndexes(nextSlideIndexes);
      setIsModalOpen(locationState.modalOpen);

      if (locationState.projectIndex === START_SCREEN_INDEX) {
        document.title = pageTitle();
      }

      if (locationState.projectIndex >= 0) {
        const project = portfolioProjects[locationState.projectIndex];
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
      syncViewport,
    ]
  );

  const updateUrl = useCallback(
    (
      project: PortfolioProject | undefined,
      slide: ProjectSlide | undefined,
      mode: 'push' | 'replace'
    ) => {
      const nextPath = project && slide ? projectUrl(project, slide) : '/projects';
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

  const setActiveSlide = useCallback(
    (
      projectIndex: number,
      realIndex: number,
      mode: 'push' | 'replace',
      scrollBehavior: ScrollBehavior
    ) => {
      const project = portfolioProjects[projectIndex];
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
      behavior: ScrollBehavior = 'smooth'
    ) => {
      const boundedIndex = Math.max(
        START_SCREEN_INDEX,
        Math.min(portfolioProjects.length - 1, nextProjectIndex)
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

      const project = portfolioProjects[boundedIndex];
      const slideIndex = activeSlideIndexes[boundedIndex] ?? 0;
      const slide = projectSlides[project.slug][slideIndex];

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

      const currentProject = portfolioProjects[activeProjectIndex];
      const slides = projectSlides[currentProject.slug];
      const nextIndex = positiveModulo(
        (activeSlideIndexes[activeProjectIndex] ?? 0) + direction,
        slides.length
      );

      setActiveSlide(activeProjectIndex, nextIndex, 'push', 'smooth');
    },
    [activeProjectIndex, activeSlideIndexes, projectSlides, setActiveSlide]
  );

  const openModal = useCallback(() => {
    if (!activeProject || !activeSlide || activeSlide.kind !== 'screenshot') {
      return;
    }

    setModalScale(1);
    setModalOffset({ x: 0, y: 0 });
    window.history.pushState({}, '', `${projectUrl(activeProject, activeSlide)}?modal=image`);
    modalHistoryEntryRef.current = true;
    setIsModalOpen(true);
  }, [activeProject, activeSlide]);

  const closeModal = useCallback(() => {
    setModalScale(1);
    setModalOffset({ x: 0, y: 0 });
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

  useLayoutEffect(() => {
    const syncInitialScroll = () => {
      syncViewport(normalizedInitialProjectIndex, initialSlideIndexes, 'auto');

      if (
        window.location.search.includes('modal=image') &&
        normalizedInitialProjectIndex >= 0 &&
        (initialSlideIndexes[normalizedInitialProjectIndex] ?? 0) > 0
      ) {
        setIsModalOpen(true);
      }
    };

    const rafId = requestAnimationFrame(() => requestAnimationFrame(syncInitialScroll));

    return () => cancelAnimationFrame(rafId);
  }, [
    initialSlideIndexes,
    normalizedInitialProjectIndex,
    syncViewport,
  ]);

  useEffect(() => {
    window.history.scrollRestoration = 'manual';

    const handlePopState = () => {
      modalHistoryEntryRef.current = false;
      applyLocationState('auto');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [applyLocationState]);

  useEffect(() => {
    const handleResize = () => {
      syncViewport(activeProjectIndex, activeSlideIndexes, 'auto');
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeProjectIndex, activeSlideIndexes, syncViewport]);

  useEffect(() => {
    const vertical = verticalRef.current;

    if (!vertical) {
      return;
    }

    const handleVerticalScrollEnd = () => {
      if (scrollSyncRef.current) {
        return;
      }

      const screenIndex = Math.round(vertical.scrollTop / vertical.clientHeight) - 1;
      const nextProjectIndex = Math.max(
        START_SCREEN_INDEX,
        Math.min(portfolioProjects.length - 1, screenIndex)
      );

      setActiveProjectIndex(nextProjectIndex);

      if (nextProjectIndex === START_SCREEN_INDEX) {
        updateUrl(undefined, undefined, 'replace');
        return;
      }

      const project = portfolioProjects[nextProjectIndex];
      const slideIndex = activeSlideIndexes[nextProjectIndex] ?? 0;
      const slide = projectSlides[project.slug][slideIndex];

      if (slide.kind === 'description') {
        resetDescriptionScroll(project);
      }

      updateUrl(project, slide, userMovedRef.current ? 'replace' : 'replace');
    };

    vertical.addEventListener('scrollend', handleVerticalScrollEnd);
    return () => vertical.removeEventListener('scrollend', handleVerticalScrollEnd);
  }, [activeSlideIndexes, projectSlides, resetDescriptionScroll, updateUrl]);

  useEffect(() => {
    const cleanupFns = portfolioProjects.map((project, projectIndex) => {
      const carousel = horizontalRefs.current[project.slug];
      const slides = projectSlides[project.slug];

      if (!carousel) {
        return () => {};
      }

      const handleHorizontalScrollEnd = () => {
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
        const nextSlide = slides[nextIndex];

        setActiveSlideIndexes((indexes) =>
          indexes.map((index, currentProjectIndex) =>
            currentProjectIndex === projectIndex ? nextIndex : index
          )
        );

        if (nextSlide.kind === 'description') {
          resetDescriptionScroll(project);
        }

        if (projectIndex === activeProjectIndex) {
          updateUrl(project, nextSlide, 'replace');
        }
      };

      carousel.addEventListener('scrollend', handleHorizontalScrollEnd);
      return () =>
        carousel.removeEventListener('scrollend', handleHorizontalScrollEnd);
    });

    return () => cleanupFns.forEach((cleanup) => cleanup());
  }, [activeProjectIndex, projectSlides, resetDescriptionScroll, updateUrl]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
        setActiveProject(activeProjectIndex + 1, 'push');
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveProject(activeProjectIndex - 1, 'push');
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveHorizontal(1);
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveHorizontal(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeProjectIndex,
    closeModal,
    isModalOpen,
    moveHorizontal,
    setActiveProject,
  ]);

  useEffect(() => {
    if (!shouldShowModal) {
      setModalScale(1);
      setModalOffset({ x: 0, y: 0 });
    }
  }, [shouldShowModal]);

  return (
    <main className="h-dvh overflow-hidden bg-black text-white">
      <div
        ref={verticalRef}
        className="h-dvh snap-y snap-mandatory overflow-y-auto overscroll-none portfolio-scrollbar-none"
      >
        <section className="flex h-dvh snap-start snap-always flex-col justify-center px-6 py-16 sm:px-10 lg:px-16">
          <div className="mx-auto w-full max-w-6xl">
            <p className="mb-8 text-xs font-light uppercase tracking-[0.35em] text-white/45">
              Projects
            </p>
            <div className="divide-y divide-white/15 border-y border-white/15">
              {portfolioProjects.map((project, index) => (
                <button
                  key={project.id}
                  type="button"
                  className="flex min-h-24 w-full items-center justify-between gap-6 py-6 text-left text-white outline-none transition-colors hover:text-portfolio-red focus-visible:text-portfolio-red sm:min-h-28"
                  onClick={() => {
                    setActiveSlide(index, 0, 'replace', 'auto');
                    setActiveProject(index, 'push');
                  }}
                >
                  <span className="text-[clamp(2.5rem,10vw,8rem)] font-black uppercase leading-none tracking-normal">
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

        {portfolioProjects.map((project, projectIndex) => {
          const slides = projectSlides[project.slug];
          const renderedSlides = [slides[slides.length - 1], ...slides, slides[0]];

          return (
            <section
              key={project.id}
              className="relative h-dvh snap-start snap-always overflow-hidden bg-black"
              aria-label={project.title}
            >
              <div
                ref={setHorizontalRef(project.slug)}
                className="flex h-dvh snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain portfolio-scrollbar-none"
              >
                {renderedSlides.map((slide, renderedIndex) => (
                  <ProjectPanel
                    key={`${project.id}-${slide.id}-${renderedIndex}`}
                    project={project}
                    slide={slide}
                    isActive={
                      activeProjectIndex === projectIndex &&
                      activeSlideIndexes[projectIndex] ===
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

      {activeProject && activeSlides.length > 0 ? (
        <>
          <button
            type="button"
            className="fixed left-3 top-1/2 z-20 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-portfolio-red text-white shadow-lg shadow-black/40 outline-none transition-transform hover:scale-105 focus-visible:scale-105 sm:left-6"
            aria-label="Previous screen"
            onClick={() => moveHorizontal(-1)}
          >
            <FontAwesomeIcon icon={faCaretLeft} className="h-7 w-7" />
          </button>
          <button
            type="button"
            className="fixed right-3 top-1/2 z-20 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-portfolio-red text-white shadow-lg shadow-black/40 outline-none transition-transform hover:scale-105 focus-visible:scale-105 sm:right-6"
            aria-label="Next screen"
            onClick={() => moveHorizontal(1)}
          >
            <FontAwesomeIcon icon={faCaretRight} className="h-7 w-7" />
          </button>
          <nav
            className="fixed inset-x-0 bottom-5 z-20 flex justify-center px-6"
            aria-label={`${activeProject.title} screens`}
          >
            <div className="flex items-center gap-3 rounded-full bg-black/55 px-4 py-3 backdrop-blur">
              {activeSlides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  className="grid h-7 w-7 place-items-center text-white outline-none transition-colors hover:text-portfolio-red focus-visible:text-portfolio-red"
                  aria-label={
                    slide.kind === 'description'
                      ? `Show ${activeProject.title} description`
                      : `Show ${slide.screenshot.alt}`
                  }
                  aria-current={activeSlideIndex === index ? 'true' : undefined}
                  onClick={() =>
                    setActiveSlide(activeProjectIndex, index, 'push', 'smooth')
                  }
                >
                  <FontAwesomeIcon
                    icon={activeSlideIndex === index ? faSolidSquare : faRegularSquare}
                    className="h-3.5 w-3.5"
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

function ProjectPanel({
  project,
  slide,
  isActive,
  setDescriptionRef,
  onScreenshotClick,
}: {
  project: PortfolioProject;
  slide: ProjectSlide;
  isActive: boolean;
  setDescriptionRef: (node: HTMLDivElement | null) => void;
  onScreenshotClick: () => void;
}) {
  return (
    <article
      className="grid h-dvh w-screen shrink-0 snap-start snap-always grid-rows-[1fr] bg-black px-6 pb-24 pt-8 sm:px-10 lg:grid-cols-[minmax(18rem,34vw)_minmax(0,1fr)] lg:px-16 lg:py-10"
      aria-hidden={!isActive}
    >
      <div
        ref={slide.kind === 'description' ? setDescriptionRef : undefined}
        className={`portfolio-scrollbar-none min-h-0 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-5rem)] lg:pr-8 ${
          slide.kind === 'description'
            ? 'flex flex-col justify-center lg:block'
            : 'hidden lg:block'
        }`}
      >
        <p className="mb-5 text-xs font-light uppercase tracking-[0.35em] text-white/45">
          {project.slug}
        </p>
        <h1 className="mb-8 text-[clamp(3rem,14vw,7rem)] font-black uppercase leading-none tracking-normal lg:text-[clamp(3.5rem,6vw,7rem)]">
          {project.title}
        </h1>
        <div className="portfolio-markdown max-w-prose text-lg font-light leading-relaxed text-white/82 lg:text-xl">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {project.descriptionMarkdown}
          </ReactMarkdown>
        </div>
      </div>

      <div
        className={`grid min-h-0 place-items-center ${
          slide.kind === 'description' ? 'hidden lg:grid' : ''
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
            className="relative aspect-square max-h-[calc(100dvh-8rem)] w-full max-w-[calc(100dvh-8rem)] overflow-hidden border border-white/15 bg-white/5 outline-none transition-colors hover:border-portfolio-red focus-visible:border-portfolio-red"
            onClick={onScreenshotClick}
            aria-label={`Open ${slide.screenshot.alt} fullscreen`}
          >
            <Image
              src={slide.screenshot.src}
              alt={slide.screenshot.alt}
              fill
              priority={isActive}
              sizes="(orientation: landscape) calc(100dvh - 8rem), 100vw"
              className="object-contain"
            />
          </button>
        )}
      </div>
    </article>
  );
}

function ImageModal({
  project,
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
  const clampScale = useCallback((nextScale: number) => {
    return Math.min(6, Math.max(1, nextScale));
  }, []);

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      setScale((current) => clampScale(current + event.deltaY * -0.002));
    },
    [clampScale, setScale]
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (scale <= 1) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
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
    (event: ReactPointerEvent<HTMLDivElement>) => {
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
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (dragRef.current.pointerId === event.pointerId) {
        dragRef.current.dragging = false;
      }
    },
    [dragRef]
  );

  const getTouchDistance = (event: ReactTouchEvent<HTMLDivElement>) => {
    const [first, second] = Array.from(event.touches);
    return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
  };

  const handleTouchStart = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
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
    (event: ReactTouchEvent<HTMLDivElement>) => {
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

  return (
    <div
      className="fixed inset-0 z-50 grid touch-none place-items-center overflow-hidden bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title}: ${screenshot.alt}`}
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
        className="fixed right-5 top-5 z-10 h-11 min-w-11 bg-portfolio-red px-4 text-sm font-black uppercase text-white outline-none transition-transform hover:scale-105 focus-visible:scale-105"
        onClick={onClose}
      >
        Close
      </button>
      <div
        className="relative h-[92dvh] w-[92vw]"
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
          transition: dragRef.current.dragging ? 'none' : 'transform 160ms ease-out',
        }}
      >
        <Image
          src={screenshot.src}
          alt={screenshot.alt}
          fill
          priority
          sizes="92vw"
          className="object-contain"
        />
      </div>
    </div>
  );
}
