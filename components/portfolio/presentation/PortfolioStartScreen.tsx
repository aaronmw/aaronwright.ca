import Link from 'next/link';
import type { CSSProperties } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faSpinner } from '@fortawesome/free-solid-svg-icons';
import type { PortfolioProject } from '@/lib/portfolio';
import {
  MOBILE_SECTION_CONTENT_PADDING_LEFT,
  MOBILE_SECTION_CONTENT_PADDING_RIGHT,
} from '@/components/portfolio/mobileLayout';
import { SectionBlurb, SectionTitle } from './PortfolioText';

const MOBILE_SECTION_CONTENT_INSETS: CSSProperties = {
  paddingLeft: MOBILE_SECTION_CONTENT_PADDING_LEFT,
  paddingRight: MOBILE_SECTION_CONTENT_PADDING_RIGHT,
};

type ProjectColorStyle = CSSProperties & {
  '--project-color': string;
};

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
  return (
    <section
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
              } ${isTouchInput && !isWideLayout ? '-ml-2 mr-2' : ''}`}
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
                : `${
                    isTouchInput && !isWideLayout
                      ? 'gap-0.5 leading-snug'
                      : 'gap-1 leading-relaxed'
                  } text-base ${
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
                      <span className="absolute right-full mr-5 w-8 shrink-0 text-right text-sm font-light text-current opacity-70 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 sm:text-base">
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
                  <span className="flex min-w-0 flex-col gap-[clamp(0.15rem,0.55vh,0.75rem)]">
                    <SectionTitle
                      color={getProjectColor(index)}
                      elementRef={(node) => setTitleRef(index, node)}
                    >
                      {project.title}
                    </SectionTitle>
                    <SectionBlurb>{project.blurb}</SectionBlurb>
                  </span>
                )}
                {!isWideLayout ? (
                  <span className="text-sm font-light text-current opacity-70 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 sm:text-base">
                    {pending ? (
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
            );
          })}
        </div>
      </div>
    </section>
  );
}
