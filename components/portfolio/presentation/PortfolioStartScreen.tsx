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
import {
  PortfolioInlineMarkdown,
  PortfolioLedgerFrame,
  PortfolioLedgerLabel,
} from './PortfolioText';

const MOBILE_SECTION_CONTENT_INSETS: CSSProperties = {
  paddingLeft: MOBILE_SECTION_CONTENT_PADDING_LEFT,
  paddingRight: MOBILE_SECTION_CONTENT_PADDING_RIGHT,
};

type ProjectColorStyle = CSSProperties & {
  '--project-color': string;
};

const MOBILE_CONTENT_VERTICAL_PADDING_REM = 1.5;
const CONTACT_LINK_CLASS_NAME =
  'portfolio-contact-link underline decoration-1 underline-offset-[0.18em]';

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

      setShouldBottomAlign(current =>
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
  const showIndexSummaries = isWideLayout && !isTouchLandscapeLayout;
  const useTwoColumnIndex = isTouchLandscapeLayout;
  const { startScreenRef, headerRef, contentSectionRef, shouldBottomAlign } =
    useStartScreenContentAlignment(isMobilePortraitLayout);

  return (
    <section
      ref={startScreenRef}
      className={`relative h-dvh snap-start snap-always ${
        isWideLayout && !isTouchLandscapeLayout
          ? 'portfolio-wide-content-inset'
          : 'portfolio-safe-inline'
      } ${
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
              paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
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
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-[var(--logo-stroke-width)] bg-resume-signal"
        aria-hidden="true"
      />
      <div
        ref={headerRef}
        className={
          isTouchLandscapeLayout
            ? 'min-w-0'
            : isWideLayout
              ? 'portfolio-wide-content-inset absolute inset-x-0 top-[3.75rem]'
              : 'min-w-0'
        }
      >
        <div
          data-portfolio-start-header-content
          className={`mx-auto w-full ${
            isWideLayout && !isTouchLandscapeLayout ? '' : 'max-w-6xl'
          } ${
            isMobilePortraitLayout
              ? 'relative'
              : `flex gap-4 ${
                  isTouchLandscapeLayout
                    ? 'items-start justify-between'
                    : isWideLayout
                      ? 'items-start justify-between'
                      : 'flex-col items-start justify-start'
                }`
          }`}
        >
          {!isWideLayout ? (
            <div
              className="flex shrink-0 items-center text-[var(--portfolio-ink)]"
              data-portfolio-start-logo
            >
              {!isMobilePortraitLayout ? (
                <PortfolioLogoMark className="shrink-0 text-resume-signal" />
              ) : null}
              <h1
                className={`whitespace-nowrap text-base font-bold italic ${
                  isMobilePortraitLayout ? '' : 'ml-12'
                }`}
              >
                Aaron M. Wright
              </h1>
            </div>
          ) : null}
          <address
            className={`min-w-0 font-resume-mono text-base font-normal leading-[1.45] text-[var(--portfolio-ink)] not-italic ${
              isWideLayout ? 'ml-auto w-full max-w-[34rem]' : 'w-full'
            }`}
          >
            <div className="grid gap-4 sm:grid-cols-[minmax(max-content,1fr)_minmax(max-content,1.25fr)] sm:gap-x-12">
              <p className="sm:text-right">
                302-70 Dyrgas Gate
                <br />
                Canmore, Alberta
                <br />
                T1W 3J6
              </p>
              <p className="flex flex-col items-start sm:items-end sm:text-right">
                <a
                  className={`${CONTACT_LINK_CLASS_NAME} break-all`}
                  href="mailto:aaron@aaronwright.ca"
                >
                  aaron@aaronwright.ca
                </a>
                <a
                  className={CONTACT_LINK_CLASS_NAME}
                  href="tel:+16477469426"
                >
                  +1-647-746-9426
                </a>
                <Link
                  className={CONTACT_LINK_CLASS_NAME}
                  href="/resume.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  Résumé PDF
                </Link>
              </p>
            </div>
          </address>
        </div>
      </div>
      <div
        ref={contentSectionRef}
        data-portfolio-start-content
        className={`mx-auto w-full max-w-[var(--resume-content-width)] ${
          isWideLayout && !isTouchLandscapeLayout
            ? ''
            : `min-h-0 ${shouldBottomAlign ? 'self-end' : 'self-center'}`
        }`}
      >
        <PortfolioLedgerFrame
          aria-label="Portfolio sections"
          className={`grid overflow-hidden ${
            showIndexSummaries
              ? 'grid-cols-[min-content_minmax(10rem,0.7fr)_minmax(18rem,1.3fr)]'
              : useTwoColumnIndex
                ? 'grid-cols-2'
                : 'grid-cols-[min-content_minmax(0,1fr)]'
          }`}
          onPointerEnter={() => onHoveredChange(true)}
          onPointerLeave={() => onHoveredChange(false)}
        >
          {useTwoColumnIndex ? (
            <div className="col-span-2 grid grid-cols-2 text-resume-ink/60">
              {[0, 1].map(columnIndex => (
                <div
                  key={columnIndex}
                  className="grid grid-cols-[min-content_minmax(0,1fr)]"
                >
                  <div className="grid place-items-center whitespace-nowrap py-2 text-center">
                    <PortfolioLedgerLabel>Section</PortfolioLedgerLabel>
                  </div>
                  <div className="py-2">
                    <PortfolioLedgerLabel>
                      Company / product
                    </PortfolioLedgerLabel>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className={`grid text-resume-ink/60 ${
                showIndexSummaries
                  ? 'col-span-3 grid-cols-subgrid'
                  : 'col-span-2 grid-cols-subgrid'
              }`}
            >
              <div className="grid place-items-center whitespace-nowrap py-2 text-center">
                <PortfolioLedgerLabel>Section</PortfolioLedgerLabel>
              </div>
              <div className="py-2">
                <PortfolioLedgerLabel>Company / product</PortfolioLedgerLabel>
              </div>
              {showIndexSummaries ? (
                <div className="py-2">
                  <PortfolioLedgerLabel>Summary / intro</PortfolioLedgerLabel>
                </div>
              ) : null}
            </div>
          )}
          {projects.map((project, index) => {
            const pending = pendingProjectIndex === index;

            return (
              <button
                key={project.id}
                type="button"
                data-portfolio-start-section-index={index + 1}
                className={`group grid min-h-11 w-full touch-manipulation text-left text-resume-ink outline-none transition-colors duration-200 ease-out hover:bg-resume-signal/10 focus-visible:bg-resume-signal/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-resume-signal motion-reduce:transition-none ${
                  showIndexSummaries
                    ? 'col-span-3 grid-cols-subgrid'
                    : useTwoColumnIndex
                      ? 'grid-cols-[min-content_minmax(0,1fr)]'
                      : 'col-span-2 grid-cols-subgrid'
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
                onPointerDown={event => {
                  if (event.button !== 0) {
                    return;
                  }

                  onHoveredChange(true);
                  onPreview(index, true);
                }}
                onPointerLeave={() => onPreview(index, false)}
                onClick={event => onSelect(index, event.detail === 0)}
              >
                <span className="flex min-w-0 items-center justify-center whitespace-nowrap py-2 text-center">
                  {pending ? (
                    <FontAwesomeIcon
                      icon={faSpinner}
                      className="size-4 animate-spin"
                    />
                  ) : (
                    String(index + 1).padStart(2, '0')
                  )}
                </span>
                <span className="flex min-w-0 items-center py-2">
                  <span
                    ref={node => setTitleRef(index, node)}
                    className="min-w-0 font-normal"
                  >
                    {project.title}
                  </span>
                </span>
                {showIndexSummaries ? (
                  <span className="min-w-0 py-2 text-resume-ink/70">
                    <PortfolioInlineMarkdown>
                      {project.blurb}
                    </PortfolioInlineMarkdown>
                  </span>
                ) : null}
              </button>
            );
          })}
        </PortfolioLedgerFrame>
      </div>
    </section>
  );
}
