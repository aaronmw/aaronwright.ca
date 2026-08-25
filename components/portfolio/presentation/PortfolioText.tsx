import type { AnchorHTMLAttributes, CSSProperties, HTMLAttributes } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import type { PortfolioProject } from '@/lib/portfolio'
import { OverscrollIndicator } from '@/components/OverscrollIndicator'

type ProjectColorStyle = CSSProperties & {
  '--project-body-color': string
  '--project-content-color': string
  '--project-color': string
}

type MarkdownLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  node?: unknown
}

type MarkdownHeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  node?: unknown
}

type MarkdownHeadingTag = 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

const INLINE_MARKDOWN_COMPONENTS = {
  p({ children }) {
    return <>{children}</>
  },
} satisfies Components

const PORTFOLIO_MARKDOWN_COMPONENTS = {
  a: MarkdownLink,
  h1: createMarkdownHeading('h2'),
  h2: createMarkdownHeading('h3'),
  h3: createMarkdownHeading('h4'),
  h4: createMarkdownHeading('h5'),
  h5: createMarkdownHeading('h6'),
  h6: createMarkdownHeading('h6'),
} satisfies Components

function isExternalSiteHref(href?: string) {
  if (!href) {
    return false
  }

  try {
    const url = new URL(href, 'https://aaronwright.ca')

    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.hostname !== 'aaronwright.ca' &&
      url.hostname !== 'www.aaronwright.ca'
    )
  } catch {
    return false
  }
}

function MarkdownLink({
  href,
  children,
  node: _node,
  ...props
}: MarkdownLinkProps) {
  const isExternalSite = isExternalSiteHref(href)

  return (
    <a
      {...props}
      href={href}
      target={isExternalSite ? '_blank' : props.target}
      rel={isExternalSite ? 'noopener noreferrer' : props.rel}
    >
      {children}
    </a>
  )
}

function createMarkdownHeading(Tag: MarkdownHeadingTag) {
  function MarkdownHeading({ node: _node, ...props }: MarkdownHeadingProps) {
    return <Tag {...props} />
  }

  return MarkdownHeading
}

export function SectionTitle({
  children,
  color,
  elementRef,
}: {
  children: string
  color: string
  elementRef?: (node: HTMLSpanElement | null) => void
}) {
  return (
    <span
      ref={elementRef}
      className="min-w-0 text-[clamp(1.1rem,3.4vh,2rem)] font-black uppercase leading-none tracking-normal sm:text-[clamp(1.25rem,4.2vh,4.2rem)] lg:text-[clamp(1.5rem,4.8vh,4.8rem)]"
      style={{ color }}
    >
      {children}
    </span>
  )
}

export function SectionBlurb({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  return (
    <span
      className={`max-w-[54ch] text-[clamp(0.75rem,1.5vh,0.9rem)] font-light normal-case leading-snug tracking-normal text-[var(--portfolio-ink)] opacity-70 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none sm:text-[clamp(0.75rem,1.55vh,1rem)] ${
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
  )
}

export function ProjectDescription({
  project,
  projectNumber,
  projectColor,
  projectBodyColor,
  projectContentColor,
  setDescriptionRef,
  isWideLayout,
  className,
  layoutStyle,
  presence,
}: {
  project: PortfolioProject
  projectNumber: string
  projectColor: string
  projectBodyColor: string
  projectContentColor: string
  setDescriptionRef: (node: HTMLDivElement | null) => void
  isWideLayout: boolean
  className?: string
  layoutStyle?: CSSProperties
  presence?: 'visible' | 'concealed'
}) {
  return (
    <div
      data-portfolio-presence={presence}
      className={`portfolio-project-content-theme ${
        presence
          ? 'portfolio-presence-transition portfolio-left-rail-transition'
          : ''
      } grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] pr-1 ${
        className ?? ''
      }`}
      style={
        {
          ...layoutStyle,
          '--project-color': projectColor,
          '--project-body-color': projectBodyColor,
          '--project-content-color': projectContentColor,
          ...(isWideLayout
            ? {
                paddingLeft:
                  'max(var(--portfolio-control-gutter-width), calc(env(safe-area-inset-left, 0px) + 5.5rem))',
              }
            : {}),
        } as ProjectColorStyle
      }
    >
      <ProjectHeading
        project={project}
        projectNumber={projectNumber}
        projectColor={projectContentColor}
        isWideLayout={isWideLayout}
      />
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
          contentClassName={`portfolio-project-content portfolio-markdown portfolio-markdown-scroll-body prose min-w-0 w-full max-w-[48ch] font-light leading-relaxed ${
            isWideLayout ? 'text-xl' : 'text-lg'
          }`}
          indicatorColor="var(--portfolio-surface-translucent)"
        >
          <PortfolioMarkdown>{project.descriptionMarkdown}</PortfolioMarkdown>
        </OverscrollIndicator>
        {project.url ? (
          <div className="pr-10 pt-5">
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-14 w-full items-center justify-center rounded-lg px-6 py-4 text-center text-base font-black leading-none tracking-normal text-[var(--portfolio-inverse-ink)] outline-none transition-[background-color,filter] duration-200 hover:brightness-110 focus-visible:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--project-color)] active:brightness-95 motion-reduce:transition-none"
              style={{ backgroundColor: projectContentColor }}
            >
              Visit Project
            </a>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function AboutMeTextPanel({
  project,
  projectNumber,
  projectColor,
  projectBodyColor,
  projectContentColor,
  isWideLayout,
  setDescriptionRef,
}: {
  project: PortfolioProject
  projectNumber: string
  projectColor: string
  projectBodyColor: string
  projectContentColor: string
  isWideLayout: boolean
  setDescriptionRef: (node: HTMLDivElement | null) => void
}) {
  return (
    <section
      className={`portfolio-project-content-theme grid min-h-0 min-w-0 w-full grid-rows-[auto_minmax(0,1fr)] ${
        isWideLayout
          ? 'portfolio-theme-panel portfolio-wide-content-inset h-full py-16 backdrop-blur-md'
          : 'h-full'
      }`}
      aria-label={project.title}
      style={
        {
          '--project-color': projectColor,
          '--project-body-color': projectBodyColor,
          '--project-content-color': projectContentColor,
        } as ProjectColorStyle
      }
    >
      <ProjectHeading
        project={project}
        projectNumber={projectNumber}
        projectColor={projectContentColor}
        isWideLayout={isWideLayout}
      />
      <OverscrollIndicator
        ref={setDescriptionRef}
        wrapperClassName={
          isWideLayout
            ? 'w-full max-w-[calc(108ch+9rem)]'
            : 'w-full max-w-[calc(48ch+2rem)]'
        }
        className="portfolio-themed-scrollbar overflow-x-hidden pr-10"
        contentClassName={
          isWideLayout
            ? 'portfolio-project-content portfolio-markdown portfolio-markdown-scroll-body prose min-w-0 w-full max-w-[calc(108ch+7rem)] text-lg font-light leading-relaxed [column-count:3] [column-fill:balance] [column-gap:3.5rem]'
            : 'portfolio-project-content portfolio-markdown portfolio-markdown-scroll-body prose min-w-0 w-full max-w-[48ch] text-lg font-light leading-relaxed'
        }
        indicatorColor="var(--portfolio-surface-translucent)"
      >
        <PortfolioMarkdown>{project.descriptionMarkdown}</PortfolioMarkdown>
      </OverscrollIndicator>
    </section>
  )
}

export function SlideDescription({
  children,
  projectColor,
  projectBodyColor,
  projectContentColor,
  hidden,
  transitionState = 'visible',
}: {
  children: string
  projectColor: string
  projectBodyColor: string
  projectContentColor: string
  hidden: boolean
  transitionState?: 'entering' | 'visible' | 'exiting'
}) {
  const isConcealed = hidden || transitionState !== 'visible'
  const renderedTransitionState = hidden ? 'hidden' : transitionState

  return (
    <div
      data-portfolio-slide-description
      data-transition-state={renderedTransitionState}
      className="portfolio-project-content-theme portfolio-presence-transition portfolio-slide-description-transition portfolio-theme-panel portfolio-themed-scrollbar fixed z-30 max-h-[50dvh] w-[min(60ch,calc(100vw-3rem))] overflow-y-auto border border-[var(--portfolio-hairline)] p-5 shadow-[0_1.5rem_4rem_rgb(0_0_0/0.3)] backdrop-blur-xl sm:p-7"
      aria-hidden={isConcealed ? true : undefined}
      inert={isConcealed}
      style={
        {
          '--project-color': projectColor,
          '--project-body-color': projectBodyColor,
          '--project-content-color': projectContentColor,
          'right':
            'max(1.5rem, calc(env(safe-area-inset-right, 0px) + 1.5rem))',
          'bottom':
            'calc(var(--portfolio-slide-navigation-reserved-height, 5.25rem) + 1rem)',
        } as ProjectColorStyle
      }
    >
      <div className="portfolio-markdown prose max-w-none text-base font-light leading-relaxed sm:text-lg [&>:last-child]:mb-0">
        <PortfolioMarkdown>{children}</PortfolioMarkdown>
      </div>
    </div>
  )
}

function ProjectHeading({
  project,
  projectNumber,
  projectColor,
  isWideLayout,
}: {
  project: PortfolioProject
  projectNumber: string
  projectColor: string
  isWideLayout: boolean
}) {
  return (
    <div>
      <p
        className="mb-5 text-xs font-light uppercase tracking-[0.35em] opacity-45 transition-colors duration-200 ease-out motion-reduce:transition-none"
        style={{ color: projectColor }}
      >
        SECTION {projectNumber}
      </p>
      <h1
        className={`mb-8 w-full max-w-[12ch] font-black uppercase leading-none tracking-normal transition-colors duration-200 ease-out motion-reduce:transition-none ${
          isWideLayout
            ? 'text-[clamp(3.5rem,4vw,4.75rem)]'
            : 'text-[clamp(3rem,14vw,7rem)]'
        }`}
        style={{ color: projectColor }}
      >
        {project.title}
      </h1>
    </div>
  )
}

function PortfolioMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={PORTFOLIO_MARKDOWN_COMPONENTS}
    >
      {children}
    </ReactMarkdown>
  )
}
