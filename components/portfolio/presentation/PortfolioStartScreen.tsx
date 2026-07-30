import Link from 'next/link';
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import type { PortfolioProject } from '@/lib/portfolio';
import {
  MOBILE_SECTION_CONTENT_PADDING_LEFT,
  MOBILE_SECTION_CONTENT_PADDING_RIGHT,
} from '@/components/portfolio/mobileLayout';
import { PortfolioLogoMark } from './PortfolioLogoMark';
import { SectionBlurb, SectionTitle } from './PortfolioText';

const MOBILE_SECTION_CONTENT_INSETS: CSSProperties = {
  paddingLeft: MOBILE_SECTION_CONTENT_PADDING_LEFT,
  paddingRight: MOBILE_SECTION_CONTENT_PADDING_RIGHT,
};

type ProjectColorStyle = CSSProperties & {
  '--project-color': string;
};

const MOBILE_CONTENT_VERTICAL_PADDING_REM = 1.5;

function useStartScreenContentAlignment(enabled: boolean) {
  const startScreenRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentSectionRef = useRef<HTMLDivElement>(null);
  const [shouldBottomAlign, setShouldBottomAlign] = useState(false);

  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }

    const startScreen = startScreenRef.current;
    const header = headerRef.current;
    const contentSection = contentSectionRef.current;

    if (!startScreen || !header || !contentSection) {
      return;
    }

    const updateAlignment = () => {
      const startScreenStyle = window.getComputedStyle(startScreen);
      const rootFontSize = Number.parseFloat(
        window.getComputedStyle(document.documentElement).fontSize,
      );
      const verticalPadding =
        rootFontSize * MOBILE_CONTENT_VERTICAL_PADDING_REM;
      const availableHeight =
        startScreen.clientHeight -
        Number.parseFloat(startScreenStyle.paddingTop) -
        Number.parseFloat(startScreenStyle.paddingBottom) -
        header.getBoundingClientRect().height -
        Number.parseFloat(startScreenStyle.rowGap);
      const nextShouldBottomAlign =
        availableHeight < contentSection.scrollHeight + verticalPadding * 2;

      setShouldBottomAlign((current) =>
        current === nextShouldBottomAlign ? current : nextShouldBottomAlign,
      );
    };

    const resizeObserver = new ResizeObserver(updateAlignment);
    resizeObserver.observe(startScreen);
    resizeObserver.observe(header);
    resizeObserver.observe(contentSection);
    updateAlignment();

    return () => resizeObserver.disconnect();
  }, [enabled]);

  return {
    startScreenRef,
    headerRef,
    contentSectionRef,
    shouldBottomAlign: enabled && shouldBottomAlign,
  };
}

export function PortfolioStartScreen({
  projects,
  pendingProjectIndex,
  isTouchInput,
  isWideLayout,
  isTouchLandscapeLayout,
  getProjectColor,
  setTitleRef,
  onHoveredChange,
  onPreview,
  onSelect,
}: {
  projects: PortfolioProject[];
  pendingProjectIndex: number | null;
  isTouchInput: boolean;
  isWideLayout: boolean;
  isTouchLandscapeLayout: boolean;
  getProjectColor: (index: number) => string;
  setTitleRef: (index: number, node: HTMLSpanElement | null) => void;
  onHoveredChange: (hovered: boolean) => void;
  onPreview: (index: number, previewing: boolean) => void;
  onSelect: (index: number, keyboardTriggered: boolean) => void;
}) {
  const isMobilePortraitLayout =
    isTouchInput && !isWideLayout && !isTouchLandscapeLayout;
  const { startScreenRef, headerRef, contentSectionRef, shouldBottomAlign } =
    useStartScreenContentAlignment(isMobilePortraitLayout);

  return (
    <section
      ref={startScreenRef}
      className={`portfolio-safe-inline relative h-dvh snap-start snap-always ${
        isTouchLandscapeLayout
          ? 'grid grid-rows-[auto_minmax(0,1fr)] gap-2'
          : isWideLayout
            ? 'flex flex-col justify-center py-16'
            : `grid grid-rows-[auto_minmax(0,1fr)] ${
                isTouchInput ? 'gap-4 pb-6 pt-0' : 'py-6'
              }`
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
          : isTouchInput
            ? MOBILE_SECTION_CONTENT_INSETS
            : undefined
      }
    >
      <div
        ref={headerRef}
        className={
          isTouchLandscapeLayout
            ? 'min-w-0'
            : isWideLayout
              ? 'portfolio-safe-inline absolute inset-x-0 top-6'
              : 'min-w-0'
        }
      >
        <div
          className={`mx-auto w-full max-w-6xl ${
            isMobilePortraitLayout
              ? 'relative'
              : `flex gap-4 ${
                  isTouchLandscapeLayout
                    ? 'items-start justify-between'
                    : isWideLayout
                      ? 'items-center justify-between'
                      : 'flex-col items-start justify-start'
                }`
          }`}
        >
          {!isMobilePortraitLayout ? (
            <div className="flex shrink-0 items-center gap-5">
              <PortfolioLogoMark
                className={`shrink-0 text-white ${
                  isTouchLandscapeLayout ? 'size-9' : 'size-12'
                }`}
                size={isTouchLandscapeLayout ? 36 : 48}
              />
              <p
                className={`font-light text-white/70 ${
                  isTouchLandscapeLayout ? 'text-sm' : 'text-base'
                }`}
              >
                Aaron M. Wright
              </p>
            </div>
          ) : null}
          <address
            className={`flex min-w-0 flex-col font-light not-italic text-white/70 ${
              isTouchLandscapeLayout
                ? 'items-end gap-0 text-right text-sm leading-snug'
                : `${
                    isTouchInput && !isWideLayout
                      ? `gap-0.5 leading-snug ${
                          isMobilePortraitLayout ? 'pt-[0.8125rem]' : ''
                        }`
                      : 'gap-1 leading-relaxed'
                  } text-base ${
                    isWideLayout
                      ? 'items-end text-right'
                      : 'items-start text-left'
                  }`
            }`}
          >
            {isMobilePortraitLayout ? (
              <p className="mb-2 font-bold text-white">Aaron M. Wright</p>
            ) : null}
            <p>302-70 Dyrgas Gate</p>
            <p>
              Canmore, Alberta{' '}
              <span className="whitespace-nowrap">T1W 3J6</span>
            </p>
            <p
              className={
                isWideLayout
                  ? 'flex flex-wrap justify-end gap-x-3 gap-y-1'
                  : 'flex flex-col gap-0.5'
              }
            >
              <a
                className="underline decoration-white/30 underline-offset-[0.18em] transition-[color,text-decoration-color] hover:text-white hover:decoration-white/70 focus-visible:text-white focus-visible:decoration-white/70"
                href="tel:+16477469426"
              >
                +1-647-746-9426
              </a>
              <a
                className="underline decoration-white/30 underline-offset-[0.18em] transition-[color,text-decoration-color] hover:text-white hover:decoration-white/70 focus-visible:text-white focus-visible:decoration-white/70"
                href="mailto:aaron@aaronwright.ca"
              >
                aaron@aaronwright.ca
              </a>
            </p>
            <p>
              <Link
                className="underline decoration-white/30 underline-offset-[0.18em] transition-[color,text-decoration-color] hover:text-white hover:decoration-white/70 focus-visible:text-white focus-visible:decoration-white/70"
                href="/resume.pdf"
                target="_blank"
                rel="noreferrer"
              >
                Resume PDF
              </Link>
            </p>
          </address>
        </div>
      </div>
      <div
        ref={contentSectionRef}
        className={`mx-auto w-full max-w-6xl ${
          isWideLayout && !isTouchLandscapeLayout
            ? ''
            : `min-h-0 ${shouldBottomAlign ? 'self-end' : 'self-center'}`
        }`}
      >
        <p className="mb-[clamp(0.65rem,1.6vh,2rem)] text-xs font-light uppercase tracking-[0.35em] text-white/45">
          Sections
        </p>
        <div
          className="divide-y divide-white/15 border-y border-white/15"
          onPointerEnter={() => onHoveredChange(true)}
          onPointerLeave={() => onHoveredChange(false)}
        >
          {projects.map((project, index) => {
            const pending = pendingProjectIndex === index;

            return (
              <button
                key={project.id}
                type="button"
                data-portfolio-start-section-index={index + 1}
                className={`group w-full items-center gap-[clamp(0.75rem,1.8vh,1.5rem)] py-[clamp(0.2rem,0.65vh,0.75rem)] text-left text-white outline-none transition-colors duration-200 ease-out hover:text-[var(--project-color)] focus-visible:text-[var(--project-color)] motion-reduce:transition-none sm:py-[clamp(0.3rem,0.85vh,1.25rem)] ${
                  isWideLayout
                    ? 'grid grid-cols-[minmax(0,1fr)_36ch]'
                    : 'relative block'
                }`}
                style={
                  {
                    '--project-color': getProjectColor(index),
                  } as ProjectColorStyle
                }
                aria-busy={pending ? true : undefined}
                onPointerEnter={() => {
                  onHoveredChange(true);
                  onPreview(index, true);
                }}
                onPointerDown={(event) => {
                  if (event.button !== 0) {
                    return;
                  }

                  onHoveredChange(true);
                  onPreview(index, true);
                }}
                onPointerLeave={() => onPreview(index, false)}
                onClick={(event) => onSelect(index, event.detail === 0)}
              >
                {isWideLayout ? (
                  <>
                    <span className="relative flex min-w-0 items-center">
                      <span className="absolute right-full mr-5 w-8 shrink-0 text-right text-sm font-light text-white opacity-70 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none sm:text-base">
                        {pending ? (
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
                        elementRef={(node) => setTitleRef(index, node)}
                      >
                        {project.title}
                      </SectionTitle>
                    </span>
                    <SectionBlurb className="justify-self-start">
                      {project.blurb}
                    </SectionBlurb>
                  </>
                ) : (
                  <span className="flex w-full min-w-0 flex-col gap-[clamp(0.15rem,0.55vh,0.75rem)]">
                    <span className="relative block min-w-0">
                      <SectionTitle
                        color={getProjectColor(index)}
                        elementRef={(node) => setTitleRef(index, node)}
                      >
                        {project.title}
                      </SectionTitle>
                      <span className="absolute right-full top-0 mr-3 flex h-[clamp(1.1rem,3.4vh,2rem)] w-8 items-center justify-end text-right text-sm font-light text-white opacity-70 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none sm:h-[clamp(1.25rem,4.2vh,4.2rem)] sm:text-base lg:h-[clamp(1.5rem,4.8vh,4.8rem)]">
                        {pending ? (
                          <FontAwesomeIcon
                            icon={faSpinner}
                            className="size-4 animate-spin"
                          />
                        ) : (
                          String(index + 1).padStart(2, '0')
                        )}
                      </span>
                    </span>
                    <SectionBlurb>{project.blurb}</SectionBlurb>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
